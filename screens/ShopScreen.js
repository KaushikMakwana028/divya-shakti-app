import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Header from "../components/Header";
import ProfileIncompleteModal from "../components/ProfileIncompleteModal";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { showAlert } from "../contexts/AlertContext";
import productService from "../services/productService";

const { width } = Dimensions.get("window");
const GRID_GAP = 14;
const CARD_WIDTH = (width - 40 - GRID_GAP) / 2; // 20px screen padding each side

export default function ShopScreen({ navigation }) {
  const { addToCart, getCartCount } = useCart();
  const { user, refreshProfile } = useAuth();

  // Categories & Products State
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all"); // 'all' or category_id
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // Profile Incomplete Modal State
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileCompletionPct, setProfileCompletionPct] = useState(0);
  const [missingFields, setMissingFields] = useState([]);
  const [isProfileUnderReview, setIsProfileUnderReview] = useState(false);
  const [profileModalMessage, setProfileModalMessage] = useState("");
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
      console.error("Failed to load categories:", err);
    }
  }, []);

  const loadProducts = useCallback(async (categoryId = "all", search = "") => {
    setProductsLoading(true);
    try {
      const params = {};
      if (categoryId && categoryId !== "all") {
        params.category_id = categoryId;
      }
      if (search && search.trim() !== "") {
        params.search = search.trim();
      }

      const res = await productService.getProducts(params);
      if (res.success && Array.isArray(res.data)) {
        setProducts(res.data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const initData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadCategories(), loadProducts("all", "")]);
    setLoading(false);
  }, [loadCategories, loadProducts]);

  useEffect(() => {
    initData();
  }, [initData]);

  // Silently refresh profile whenever user focuses on Shop screen
  useFocusEffect(
    useCallback(() => {
      if (refreshProfile) {
        refreshProfile();
      }
    }, [refreshProfile])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadCategories(),
      loadProducts(selectedCategory, searchQuery),
      refreshProfile ? refreshProfile() : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [loadCategories, loadProducts, selectedCategory, searchQuery, refreshProfile]);

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
    navigation.navigate("ProductDetails", { product });
  };

  const handleCartPress = () => {
    navigation.navigate("Cart");
  };

  const handleQuickAdd = async (product, e) => {
    e.stopPropagation();
    if (product.stock !== undefined && product.stock <= 0) {
      showAlert({
        title: "Out of Stock",
        message: "This product is currently unavailable.",
        type: "warning",
      });
      return;
    }

    // Live Server Sync if locally inactive or pending approval
    let currentUser = user;
    const isLocallyPendingOrInactive =
      currentUser?.is_profile_active === false ||
      currentUser?.is_profile_active === 0 ||
      (currentUser?.profile_completion_percentage !== undefined &&
        Number(currentUser?.profile_completion_percentage) < 100);

    if (isLocallyPendingOrInactive && refreshProfile) {
      const fresh = await refreshProfile();
      if (fresh?.success && fresh?.data) {
        currentUser = fresh.data;
      }
    }

    const isProfileComplete =
      currentUser?.is_profile_completed === true ||
      Number(currentUser?.profile_completion_percentage) >= 100;

    if (
      currentUser &&
      !isProfileComplete &&
      currentUser.profile_completion_percentage !== undefined &&
      Number(currentUser.profile_completion_percentage) < 100
    ) {
      setProfileCompletionPct(Number(currentUser.profile_completion_percentage) || 0);
      setMissingFields(currentUser.missing_fields || []);
      setIsProfileUnderReview(false);
      setProfileModalMessage("");
      setProfileModalVisible(true);
      return;
    }

    if (currentUser && isProfileComplete && currentUser.is_profile_active === false) {
      setProfileCompletionPct(100);
      setMissingFields([]);
      setIsProfileUnderReview(true);
      setProfileModalMessage(
        "Your profile is 100% complete and submitted for review. Please wait for admin to activate your profile before adding items to cart or purchasing products.",
      );
      setProfileModalVisible(true);
      return;
    }

    setAddingProductId(product.id);
    try {
      const res = await addToCart(product, 1);
      if (res.success) {
        showAlert({
          title: "Added to Cart",
          message: `${product.name} has been added to your cart!`,
          type: "cart",
          buttons: [
            { text: "Continue Shopping", style: "cancel" },
            { text: "View Cart", onPress: () => navigation.navigate("Cart") },
          ],
        });
      } else if (res.isUnderReview || res.isProfileIncomplete) {
        const pct =
          res.profileData?.profile_completion_percentage ??
          user?.profile_completion_percentage ??
          (res.isUnderReview ? 100 : 0);
        setProfileCompletionPct(Number(pct));
        setMissingFields(res.profileData?.missing_fields || []);
        setIsProfileUnderReview(
          Boolean(res.isUnderReview || Number(pct) >= 100),
        );
        setProfileModalMessage(res.message || "");
        setProfileModalVisible(true);
      } else {
        showAlert({
          title: "Cannot Add to Cart",
          message: res.message || "Failed to add item to cart.",
          type: "error",
        });
      }
    } finally {
      setAddingProductId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
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
            colors={["#E64A78"]}
            tintColor="#E64A78"
          />
        }
      >
        {/* Search Bar */}
        <View
          style={[styles.searchBar, searchFocused && styles.searchBarFocused]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={searchFocused ? "#E64A78" : "#9E8E93"}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#9E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9E8E93" />
            </TouchableOpacity>
          ) : null}
        </View>


        {/* Categories Horizontal Selector */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Categories</Text>
          {categories.length > 0 && (
            <Text style={styles.categoryCount}>
              {categories.length} available
            </Text>
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
              selectedCategory === "all" && styles.catChipActive,
            ]}
            onPress={() => handleSelectCategory("all")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.catIconWrap,
                selectedCategory === "all" && styles.catIconWrapActive,
              ]}
            >
              <Ionicons
                name="apps"
                size={13}
                color={selectedCategory === "all" ? "#FFFFFF" : "#9E8E93"}
              />
            </View>
            <Text
              style={[
                styles.catText,
                selectedCategory === "all" && styles.catTextActive,
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
                style={[styles.catChip, isSelected && styles.catChipActive]}
                onPress={() => handleSelectCategory(cat.id)}
                activeOpacity={0.7}
              >
                {cat.image ? (
                  <Image source={{ uri: cat.image }} style={styles.catThumb} />
                ) : (
                  <View
                    style={[
                      styles.catIconWrap,
                      isSelected && styles.catIconWrapActive,
                    ]}
                  >
                    <Ionicons
                      name="pricetag-outline"
                      size={13}
                      color={isSelected ? "#FFFFFF" : "#9E8E93"}
                    />
                  </View>
                )}
                <Text
                  style={[styles.catText, isSelected && styles.catTextActive]}
                  numberOfLines={1}
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
            {selectedCategory === "all"
              ? "All Products"
              : `${categories.find((c) => c.id === selectedCategory)?.name || "Category"} Products`}
          </Text>
          <Text style={styles.categoryCount}>
            {products.length} {products.length === 1 ? "item" : "items"}
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
              <Ionicons name="bag-handle-outline" size={40} color="#E64A78" />
            </View>
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery
                ? `No products matched "${searchQuery}".`
                : "There are no active products in this category right now."}
            </Text>
            <TouchableOpacity
              style={styles.emptyResetBtn}
              activeOpacity={0.8}
              onPress={() => {
                setSearchQuery("");
                handleSelectCategory("all");
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
              const isLowStock =
                inStock &&
                product.stock !== undefined &&
                Number(product.stock) <= 5;
              const formattedPrice =
                typeof product.price === "number"
                  ? `₹${product.price.toLocaleString("en-IN")}`
                  : product.price
                    ? String(product.price).startsWith("₹")
                      ? product.price
                      : `₹${product.price}`
                    : "₹0";
              const isAdding = addingProductId === product.id;

              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  activeOpacity={0.85}
                  onPress={() => handleProductPress(product)}
                >
                  {/* Product Visual */}
                  <View style={styles.productVisual}>
                    {/* Stock Badge */}
                    {!inStock ? (
                      <View style={[styles.badge, styles.badgeOutOfStock]}>
                        <Text style={styles.badgeText}>Out of Stock</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, styles.badgeInStock]}>
                        <View style={styles.badgeDot} />
                        <Text style={styles.badgeText}>In Stock</Text>
                      </View>
                    )}

                    {product.image ? (
                      <Image
                        source={{ uri: product.image }}
                        style={styles.productImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.fallbackIconBox}>
                        <Ionicons name="bag" size={38} color="#E64A78" />
                      </View>
                    )}
                  </View>

                  {/* Product Body */}
                  <View style={styles.productBody}>
                    <Text style={styles.productCategory} numberOfLines={1}>
                      {product.category_name || "Product"}
                    </Text>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.name}
                    </Text>

                    {/* Price Row */}
                    <View style={styles.priceRow}>
                      <Text style={styles.price} numberOfLines={1}>
                        {formattedPrice}
                      </Text>
                      {isLowStock && (
                        <Text style={styles.lowStockText} numberOfLines={1}>
                          Only {product.stock} left
                        </Text>
                      )}
                    </View>

                    {/* Add to Cart Button */}
                    <TouchableOpacity
                      style={[
                        styles.addBtn,
                        (!inStock || isAdding) && styles.addBtnDisabled,
                      ]}
                      activeOpacity={0.8}
                      disabled={!inStock || isAdding}
                      onPress={(e) => handleQuickAdd(product, e)}
                    >
                      {isAdding ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons
                            name="bag-add-outline"
                            size={14}
                            color={inStock ? "#FFFFFF" : "#B7ABAF"}
                          />
                          <Text
                            style={[
                              styles.addBtnText,
                              !inStock && styles.addBtnTextDisabled,
                            ]}
                          >
                            {inStock ? "Add to Cart" : "Unavailable"}
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
        isUnderReview={isProfileUnderReview}
        message={profileModalMessage}
        onClose={() => setProfileModalVisible(false)}
        onComplete={() => {
          setProfileModalVisible(false);
          navigation.navigate("Profile");
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAF7F8",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 120,
  },

  // Search Bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: "#F0EAED",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchBarFocused: {
    borderColor: "#E64A78",
    shadowOpacity: 0.08,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#2A1E24",
    paddingVertical: 0,
  },

  // Offer Banner
  offerBanner: {
    backgroundColor: "#2A1E24",
    borderRadius: 22,
    padding: 22,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  offerDecorRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    top: -50,
    right: -40,
  },
  offerLeft: { flex: 1 },
  goldTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(200,151,56,0.18)",
    borderWidth: 1,
    borderColor: "rgba(200,151,56,0.35)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  goldTagText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#C89738",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  offerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    lineHeight: 28,
    marginBottom: 14,
  },
  offerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E64A78",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    shadowColor: "#E64A78",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  offerBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  offerRight: {
    paddingLeft: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  offerDecorCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "rgba(230,74,120,0.35)",
    borderWidth: 1,
    borderColor: "rgba(230,74,120,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Headings
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionHeading: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#2A1E24",
  },
  categoryCount: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#9E8E93",
  },

  // Categories
  catsRow: {
    gap: 9,
    paddingVertical: 2,
    marginBottom: 22,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 6,
    paddingRight: 16,
    paddingVertical: 6,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#F0EAED",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  catChipActive: {
    backgroundColor: "#E64A78",
    borderColor: "#E64A78",
    shadowColor: "#E64A78",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  catIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FAF7F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  catIconWrapActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  catThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
    backgroundColor: "#FAF7F8",
  },
  catText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#6B5A63",
    maxWidth: 110,
  },
  catTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0EAED",
    marginBottom: 2,
  },
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeInStock: {
    backgroundColor: "rgba(39,164,98,0.95)",
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#FFFFFF",
  },
  badgeOutOfStock: {
    backgroundColor: "rgba(158,142,147,0.95)",
  },
  badgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 9,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  productVisual: {
    height: 136,
    backgroundColor: "#FAF7F8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImg: {
    width: "100%",
    height: "100%",
  },
  fallbackIconBox: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(230,74,120,0.06)",
  },
  productBody: {
    padding: 12,
  },
  productCategory: {
    fontFamily: "Poppins_500Medium",
    fontSize: 9.5,
    color: "#C89738",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  productName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    color: "#2A1E24",
    marginBottom: 7,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 6,
  },
  price: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15.5,
    color: "#2A1E24",
  },
  lowStockText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 9.5,
    color: "#D97706",
    flexShrink: 1,
    textAlign: "right",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#E64A78",
    borderRadius: 12,
    paddingVertical: 9,
    shadowColor: "#E64A78",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnDisabled: {
    backgroundColor: "#F0EAED",
    shadowOpacity: 0,
    elevation: 0,
  },
  addBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  addBtnTextDisabled: {
    color: "#B7ABAF",
  },

  // Loader & Empty States
  loaderWrap: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loaderText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#9E8E93",
  },
  emptyWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F0EAED",
    borderStyle: "dashed",
    marginTop: 4,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(230,74,120,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#2A1E24",
    marginBottom: 4,
  },
  emptyDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: "#9E8E93",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyResetBtn: {
    backgroundColor: "#FAF7F8",
    borderWidth: 1,
    borderColor: "#F0EAED",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyResetBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: "#E64A78",
  },
});
