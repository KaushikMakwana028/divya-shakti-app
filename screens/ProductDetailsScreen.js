import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

export default function ProductDetailsScreen({ route, navigation }) {
  const { product } = route.params || {};
  const { addToCart, getCartCount } = useCart();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  // Profile Incomplete Modal State
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileCompletionPct, setProfileCompletionPct] = useState(0);
  const [missingFields, setMissingFields] = useState([]);

  if (!product) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="Product Details" showBack={true} />
        <View style={styles.notFoundCenter}>
          <Text style={styles.notFoundText}>Product not found.</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const inStock = product.stock !== undefined ? product.stock > 0 : (product.inStock !== false);
  const formattedPrice =
    typeof product.price === 'number'
      ? `₹${product.price.toLocaleString('en-IN')}`
      : product.price
      ? String(product.price).startsWith('₹')
        ? product.price
        : `₹${product.price}`
      : '₹0';

  const categoryName = product.category_name || product.category || 'General';

  const checkProfileCompleteness = () => {
    if (!user) return true;
    const isCompleted =
      user.is_profile_completed === true ||
      Number(user.profile_completion_percentage) === 100;

    if (!isCompleted && user.profile_completion_percentage !== undefined && Number(user.profile_completion_percentage) < 100) {
      setProfileCompletionPct(Number(user.profile_completion_percentage) || 0);
      setMissingFields(user.missing_fields || []);
      setProfileModalVisible(true);
      return false;
    }
    return true;
  };

  const handleAddToCart = async () => {
    if (!inStock) {
      Alert.alert('Out of Stock', 'This product is currently out of stock.');
      return;
    }

    // 1. Client-side Profile Check
    if (!checkProfileCompleteness()) {
      return;
    }

    setAddingToCart(true);
    try {
      const res = await addToCart(product, quantity);
      if (res.success) {
        Alert.alert(
          'Added to Cart',
          `${product.name} (${quantity}) added to your cart!`,
          [
            { text: 'Continue Shopping', style: 'cancel' },
            { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
          ]
        );
      } else if (res.isProfileIncomplete) {
        const pct =
          res.profileData?.profile_completion_percentage ??
          user?.profile_completion_percentage ??
          0;
        setProfileCompletionPct(pct);
        setMissingFields(res.profileData?.missing_fields || []);
        setProfileModalVisible(true);
      } else {
        Alert.alert('Cannot Add to Cart', res.message || 'Failed to add product to cart.');
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!inStock) {
      Alert.alert('Out of Stock', 'This product is currently out of stock.');
      return;
    }

    // 1. Client-side Profile Check
    if (!checkProfileCompleteness()) {
      return;
    }

    setAddingToCart(true);
    try {
      const res = await addToCart(product, quantity);
      if (res.success) {
        navigation.navigate('Cart');
      } else if (res.isProfileIncomplete) {
        const pct =
          res.profileData?.profile_completion_percentage ??
          user?.profile_completion_percentage ??
          0;
        setProfileCompletionPct(pct);
        setMissingFields(res.profileData?.missing_fields || []);
        setProfileModalVisible(true);
      } else {
        Alert.alert('Cannot Proceed', res.message || 'Failed to process request.');
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handleCartPress = () => {
    navigation.navigate('Cart');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="Product Details"
        showBack={true}
        rightIcon="bag-outline"
        onRightPress={handleCartPress}
        cartCount={getCartCount()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Product Image Section */}
        <View style={styles.imageCard}>
          {product.image ? (
            <Image
              source={{ uri: product.image }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.fallbackIconBox}>
              <Ionicons
                name={product.icon || 'bag'}
                size={90}
                color={product.color || '#E64A78'}
              />
            </View>
          )}

          {inStock ? (
            <View style={styles.discountTag}>
              <Text style={styles.discountTagText}>In Stock</Text>
            </View>
          ) : (
            <View style={[styles.discountTag, { backgroundColor: '#9E8E93' }]}>
              <Text style={styles.discountTagText}>Out of Stock</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{categoryName}</Text>
          </View>

          <Text style={styles.productName}>{product.name}</Text>

          {/* Stock Status */}
          <View style={styles.ratingRow}>
            {inStock ? (
              <View style={styles.stockBadge}>
                <View style={styles.stockDot} />
                <Text style={styles.stockText}>
                  {product.stock !== undefined
                    ? `${product.stock} in stock`
                    : 'In Stock'}
                </Text>
              </View>
            ) : (
              <View style={[styles.stockBadge, { backgroundColor: '#FFE8ED' }]}>
                <View
                  style={[styles.stockDot, { backgroundColor: '#E64A78' }]}
                />
                <Text style={[styles.stockText, { color: '#E64A78' }]}>
                  Out of Stock
                </Text>
              </View>
            )}
          </View>

          {/* Price */}
          <View style={styles.priceSection}>
            <Text style={styles.price}>{formattedPrice}</Text>
            {product.oldPrice ? (
              <Text style={styles.oldPrice}>{product.oldPrice}</Text>
            ) : null}
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {product.description ||
              'High quality product carefully formulated to meet your wellness and lifestyle needs.'}
          </Text>

          {/* Ingredients if array exists */}
          {Array.isArray(product.ingredients) && product.ingredients.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Key Ingredients</Text>
              <View style={styles.ingredientsGrid}>
                {product.ingredients.map((ingredient, i) => (
                  <View key={i} style={styles.ingredientChip}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#27A462"
                    />
                    <Text style={styles.ingredientText}>{ingredient}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Quantity Selector */}
          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={18} color="#2A1E24" />
            </TouchableOpacity>
            <View style={styles.quantityBox}>
              <Text style={styles.quantityText}>{quantity}</Text>
            </View>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={() => setQuantity(quantity + 1)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color="#2A1E24" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.addToCartBtn, (!inStock || addingToCart) && styles.addToCartBtnDisabled]}
          onPress={handleAddToCart}
          disabled={!inStock || addingToCart}
          activeOpacity={0.75}
        >
          {addingToCart ? (
            <ActivityIndicator size="small" color="#E64A78" />
          ) : (
            <>
              <Ionicons
                name="bag-add-outline"
                size={20}
                color={inStock ? '#E64A78' : '#9E8E93'}
              />
              <Text
                style={[
                  styles.addToCartText,
                  !inStock && styles.addToCartTextDisabled,
                ]}
              >
                Add to Cart
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buyNowBtn, (!inStock || addingToCart) && styles.buyNowBtnDisabled]}
          onPress={handleBuyNow}
          disabled={!inStock || addingToCart}
          activeOpacity={0.8}
        >
          <Ionicons name="flash" size={20} color="#FFFFFF" />
          <Text style={styles.buyNowText}>Buy Now</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Incomplete Modal Alert */}
      <ProfileIncompleteModal
        visible={profileModalVisible}
        percentage={profileCompletionPct}
        missingFields={missingFields}
        onClose={() => setProfileModalVisible(false)}
        onComplete={() => {
          setProfileModalVisible(false);
          navigation.navigate('EditProfile');
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
    paddingBottom: 110,
  },
  notFoundCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  notFoundText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#2A1E24',
  },
  backBtn: {
    backgroundColor: '#E64A78',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
  },
  backBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  imageCard: {
    margin: 20,
    borderRadius: 24,
    height: 280,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F0EAED',
    overflow: 'hidden',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  productImage: {
    width: '90%',
    height: '90%',
  },
  fallbackIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#27A462',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  discountTagText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  infoSection: {
    paddingHorizontal: 20,
  },
  categoryBadge: {
    backgroundColor: '#FFF0F4',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  categoryText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#E64A78',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  productName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: '#2A1E24',
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FBF5E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  ratingText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#C89738',
  },
  reviewsText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#9E8E93',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8FBF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#27A462',
  },
  stockText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#27A462',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  price: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    color: '#2A1E24',
  },
  oldPrice: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: '#9E8E93',
    textDecorationLine: 'line-through',
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#2A1E24',
    marginBottom: 8,
    marginTop: 8,
  },
  description: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13.5,
    color: '#9E8E93',
    lineHeight: 22,
    marginBottom: 14,
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  ingredientText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#2A1E24',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  quantityBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  quantityBox: {
    minWidth: 60,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E64A78',
  },
  quantityText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#2A1E24',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0EAED',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF0F4',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E64A78',
  },
  addToCartBtnDisabled: {
    borderColor: '#F0EAED',
    backgroundColor: '#FAF7F8',
  },
  addToCartText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#E64A78',
  },
  addToCartTextDisabled: {
    color: '#9E8E93',
  },
  buyNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E64A78',
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buyNowBtnDisabled: {
    backgroundColor: '#C5B8BD',
    shadowOpacity: 0,
    elevation: 0,
  },
  buyNowText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});