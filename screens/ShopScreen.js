import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import productService from '../services/productService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 52) / 2;

export default function ShopScreen({ navigation }) {
  const { addToCart, getCartCount } = useCart();
  const { user } = useAuth();

  // Categories & Products State
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' or category_id
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Profile Incomplete Modal State
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileCompletionPct, setProfileCompletionPct] = useState(0);
  const [missingFields, setMissingFields] = useState([]);
  const [addingProductId, setAddingProductId] = useState(null);

  // ─────────────────────────────────────────
  // Fetch Categories & Initial Products
  // ─────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    try {
      const res = await productService.getCategories();
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  const loadProducts = useCallback(async (categoryId = 'all', search = '') => {
    setProductsLoading(true);
    try {
      const params = {};
      if (categoryId && categoryId !== 'all') {
        params.category_id = categoryId;
      }
      if (search && search.trim() !== '') {
        params.search = search.trim();
      }

      const res = await productService.getProducts(params);
      if (res.success && Array.isArray(res.data)) {
        setProducts(res.data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const initData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadCategories(), loadProducts('all', '')]);
    setLoading(false);
  }, [loadCategories, loadProducts]);

  useEffect(() => {
    initData();
  }, [initData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadCategories(), loadProducts(selectedCategory, searchQuery)]);
    setRefreshing(false);
  }, [loadCategories, loadProducts, selectedCategory, searchQuery]);

  // Handle Category Selection
  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    loadProducts(catId, searchQuery);
  };

  // Handle Search Submit
  const handleSearch = (text) => {
    setSearchQuery(text);
    loadProducts(selectedCategory, text);
  };

  const handleProductPress = (product) => {
    navigation.navigate('ProductDetails', { product });
  };

  const handleCartPress = () => {
    navigation.navigate('Cart');
  };

  const handleQuickAdd = async (product, e) => {
    e.stopPropagation();
    if (product.stock !== undefined && product.stock <= 0) {
      Alert.alert('Out of Stock', 'This product is currently unavailable.');
      return;
    }

    // Client-side Profile Check (100% required)
    const isProfileComplete =
      user?.is_profile_completed === true ||
      Number(user?.profile_completion_percentage) === 100;

    if (
      user &&
      !isProfileComplete &&
      user.profile_completion_percentage !== undefined &&
      Number(user.profile_completion_percentage) < 100
    ) {
      setProfileCompletionPct(Number(user.profile_completion_percentage) || 0);
      setMissingFields(user.missing_fields || []);
      setProfileModalVisible(true);
      return;
    }

    setAddingProductId(product.id);
    try {
      const res = await addToCart(product, 1);
      if (res.success) {
        Alert.alert('Added to Cart', `${product.name} has been added to your cart!`, [
          { text: 'Continue Shopping', style: 'cancel' },
          { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
        ]);
      } else if (res.isProfileIncomplete) {
        const pct =
          res.profileData?.profile_completion_percentage ??
          user?.profile_completion_percentage ??
          0;
        setProfileCompletionPct(pct);
        setMissingFields(res.profileData?.missing_fields || []);
        setProfileModalVisible(true);
      } else {
        Alert.alert('Cannot Add to Cart', res.message || 'Failed to add item to cart.');
      }
    } finally {
      setAddingProductId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="Shop"
        rightIcon="bag-outline"
        onRightPress={handleCartPress}
        cartCount={getCartCount()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#E64A78']}
            tintColor="#E64A78"
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#9E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#9E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9E8E93" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Offer Banner */}
        <View style={styles.offerBanner}>
          <View style={styles.offerLeft}>
            <View style={styles.goldTag}>
              <Ionicons name="star" size={10} color="#C89738" />
              <Text style={styles.goldTagText}>Special Offer</Text>
            </View>
            <Text style={styles.offerTitle}>Get 20% OFF{'\n'}on your order</Text>
            <TouchableOpacity style={styles.offerBtn} activeOpacity={0.8}>
              <Text style={styles.offerBtnText}>Shop Now</Text>
              <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.offerRight}>
            <View style={styles.offerDecorCircle}>
              <Ionicons name="gift" size={44} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </View>

        {/* Categories Horizontal Selector */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Categories</Text>
          {categories.length > 0 && (
            <Text style={styles.categoryCount}>{categories.length} available</Text>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catsRow}
        >
          {/* "All" Category Chip */}
          <TouchableOpacity
            style={[
              styles.catChip,
              selectedCategory === 'all' && styles.catChipActive,
            ]}
            onPress={() => handleSelectCategory('all')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="apps"
              size={14}
              color={selectedCategory === 'all' ? '#FFFFFF' : '#9E8E93'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.catText,
                selectedCategory === 'all' && styles.catTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {/* Dynamic Categories from API */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catChip,
                  isSelected && styles.catChipActive,
                ]}
                onPress={() => handleSelectCategory(cat.id)}
                activeOpacity={0.7}
              >
                {cat.image ? (
                  <Image source={{ uri: cat.image }} style={styles.catThumb} />
                ) : (
                  <Ionicons
                    name="pricetag-outline"
                    size={13}
                    color={isSelected ? '#FFFFFF' : '#9E8E93'}
                    style={{ marginRight: 5 }}
                  />
                )}
                <Text
                  style={[
                    styles.catText,
                    isSelected && styles.catTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Products Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>
            {selectedCategory === 'all'
              ? 'All Products'
              : `${categories.find((c) => c.id === selectedCategory)?.name || 'Category'} Products`}
          </Text>
          <Text style={styles.categoryCount}>
            {products.length} {products.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {/* Loading Spinner for Products */}
        {productsLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#E64A78" />
            <Text style={styles.loaderText}>Loading products...</Text>
          </View>
        ) : products.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="bag-handle-outline" size={44} color="#E64A78" />
            </View>
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery
                ? `No products matched "${searchQuery}".`
                : 'There are no active products in this category right now.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyResetBtn}
              onPress={() => {
                setSearchQuery('');
                handleSelectCategory('all');
              }}
            >
              <Text style={styles.emptyResetBtnText}>Show All Products</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Products Grid */
          <View style={styles.grid}>
            {products.map((product) => {
              const inStock = product.stock === undefined || product.stock > 0;
              const formattedPrice =
                typeof product.price === 'number'
                  ? `₹${product.price.toLocaleString('en-IN')}`
                  : product.price
                  ? String(product.price).startsWith('₹')
                    ? product.price
                    : `₹${product.price}`
                  : '₹0';

              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  activeOpacity={0.8}
                  onPress={() => handleProductPress(product)}
                >
                  {/* Stock or Discount Badge */}
                  {!inStock ? (
                    <View style={[styles.badge, styles.badgeOutOfStock]}>
                      <Text style={styles.badgeText}>Out of Stock</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, styles.badgeDiscount]}>
                      <Text style={styles.badgeText}>In Stock</Text>
                    </View>
                  )}

                  {/* Product Visual */}
                  <View style={styles.productVisual}>
                    {product.image ? (
                      <Image
                        source={{ uri: product.image }}
                        style={styles.productImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.fallbackIconBox}>
                        <Ionicons name="bag" size={42} color="#E64A78" />
                      </View>
                    )}
                  </View>

                  {/* Product Body */}
                  <View style={styles.productBody}>
                    <Text style={styles.productCategory} numberOfLines={1}>
                      {product.category_name || 'Product'}
                    </Text>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.name}
                    </Text>

                    {/* Price Row */}
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>{formattedPrice}</Text>
                    </View>

                    {/* Add to Cart Button */}
                    <TouchableOpacity
                      style={[
                        styles.addBtn,
                        (!inStock || addingProductId === product.id) && styles.addBtnDisabled,
                      ]}
                      activeOpacity={0.8}
                      disabled={!inStock || addingProductId === product.id}
                      onPress={(e) => handleQuickAdd(product, e)}
                    >
                      {addingProductId === product.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons
                            name="bag-add-outline"
                            size={14}
                            color={inStock ? '#FFFFFF' : '#9E8E93'}
                          />
                          <Text
                            style={[
                              styles.addBtnText,
                              !inStock && styles.addBtnTextDisabled,
                            ]}
                          >
                            {inStock ? 'Add to Cart' : 'Unavailable'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Profile Incomplete Modal Alert */}
      <ProfileIncompleteModal
        visible={profileModalVisible}
        percentage={profileCompletionPct}
        missingFields={missingFields}
        onClose={() => setProfileModalVisible(false)}
        onComplete={() => {
          setProfileModalVisible(false);
          navigation.navigate('Profile');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF7F8',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 120,
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#2A1E24',
    paddingVertical: 0,
  },

  // Offer Banner
  offerBanner: {
    backgroundColor: '#2A1E24',
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  offerLeft: { flex: 1 },
  goldTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(200,151,56,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(200,151,56,0.35)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  goldTagText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: '#C89738',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  offerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 14,
  },
  offerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E64A78',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  offerBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  offerRight: {
    paddingLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerDecorCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(230,74,120,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Headings
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#2A1E24',
  },
  categoryCount: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#9E8E93',
  },

  // Categories
  catsRow: {
    gap: 8,
    paddingVertical: 2,
    marginBottom: 20,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F0EAED',
  },
  catChipActive: {
    backgroundColor: '#E64A78',
    borderColor: '#E64A78',
  },
  catThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 6,
  },
  catText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#9E8E93',
  },
  catTextActive: {
    color: '#FFFFFF',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeDiscount: {
    backgroundColor: '#27A462',
  },
  badgeOutOfStock: {
    backgroundColor: '#9E8E93',
  },
  badgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  productVisual: {
    height: 130,
    backgroundColor: '#FAF7F8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  fallbackIconBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(230,74,120,0.06)',
  },
  productBody: {
    padding: 12,
  },
  productCategory: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: '#9E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  productName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#2A1E24',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  price: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#2A1E24',
  },
  stockCount: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10.5,
    color: '#27A462',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#E64A78',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnDisabled: {
    backgroundColor: '#F0EAED',
    shadowOpacity: 0,
    elevation: 0,
  },
  addBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  addBtnTextDisabled: {
    color: '#9E8E93',
  },

  // Loader & Empty States
  loaderWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loaderText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#9E8E93',
  },
  emptyWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0EAED',
    marginTop: 10,
  },
  emptyIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(230,74,120,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#2A1E24',
    marginBottom: 4,
  },
  emptyDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: '#9E8E93',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyResetBtn: {
    backgroundColor: '#FAF7F8',
    borderWidth: 1,
    borderColor: '#F0EAED',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  emptyResetBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    color: '#E64A78',
  },
});