import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Header from "../components/Header";
import ProfileIncompleteModal from "../components/ProfileIncompleteModal";
import CheckoutModal from "../components/CheckoutModal";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import productService from "../services/productService";

export default function ProductDetailsScreen({ route, navigation }) {
  const initialProduct = route.params?.product;
  const productId =
    route.params?.productId ||
    route.params?.id ||
    initialProduct?.id ||
    initialProduct?.product_id;

  const [product, setProduct] = useState(initialProduct || null);
  const [loading, setLoading] = useState(
    Boolean(
      productId &&
        (!initialProduct ||
          initialProduct.price === undefined ||
          !initialProduct.name)
    )
  );
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const { addToCart, getCartCount } = useCart();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  // Checkout Modal State
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  // Profile Incomplete Modal State
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileCompletionPct, setProfileCompletionPct] = useState(0);
  const [missingFields, setMissingFields] = useState([]);
  const [isProfileUnderReview, setIsProfileUnderReview] = useState(false);
  const [profileModalMessage, setProfileModalMessage] = useState("");

  const fetchProductDetails = useCallback(
    async (isRefresh = false) => {
      if (!productId) {
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      }

      try {
        const res = await productService.getProductDetail(productId);
        if (res.success && res.data) {
          setProduct((prev) => ({
            ...(prev || {}),
            ...res.data,
          }));
          setFetchError(null);
        } else {
          if (!product) {
            setFetchError(res.message || "Failed to load product details.");
          }
        }
      } catch (err) {
        console.error("ProductDetailsScreen fetch error:", err);
        if (!product) {
          setFetchError("Unable to load product details.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [productId, product]
  );

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
    }
  }, [productId]);

  useEffect(() => {
    if (route.params?.product) {
      setProduct((prev) => ({
        ...(prev || {}),
        ...route.params.product,
      }));
    }
  }, [route.params?.product]);

  if (loading && (!product || product.price === undefined)) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header title="Product Details" showBack={true} />
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#E64A78" />
          <Text style={styles.loaderText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product || (!product.name && product.price === undefined)) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header title="Product Details" showBack={true} />
        <View style={styles.notFoundCenter}>
          <View style={styles.notFoundIconBox}>
            <Ionicons name="alert-circle-outline" size={36} color="#E64A78" />
          </View>
          <Text style={styles.notFoundText}>
            {fetchError || "Product not found."}
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const inStock =
    product.stock !== undefined ? product.stock > 0 : product.inStock !== false;
  const isLowStock =
    inStock && product.stock !== undefined && Number(product.stock) <= 5;
  const formattedPrice =
    typeof product.price === "number"
      ? `₹${product.price.toLocaleString("en-IN")}`
      : product.price
        ? String(product.price).startsWith("₹")
          ? product.price
          : `₹${product.price}`
        : "₹0";

  const categoryName = product.category_name || product.category || "General";

  const unitPrice =
    typeof product.price === "number"
      ? product.price
      : parseInt(String(product.price || 0).replace(/[₹,]/g, "")) || 0;
  const buyNowTotal = unitPrice * quantity;

  const checkProfileCompleteness = () => {
    if (!user) return true;
    const isCompleted =
      user.is_profile_completed === true ||
      Number(user.profile_completion_percentage) >= 100;

    if (
      !isCompleted &&
      user.profile_completion_percentage !== undefined &&
      Number(user.profile_completion_percentage) < 100
    ) {
      setProfileCompletionPct(Number(user.profile_completion_percentage) || 0);
      setMissingFields(user.missing_fields || []);
      setIsProfileUnderReview(false);
      setProfileModalMessage("");
      setProfileModalVisible(true);
      return false;
    }

    if (isCompleted && user.is_profile_active === false) {
      setProfileCompletionPct(100);
      setMissingFields([]);
      setIsProfileUnderReview(true);
      setProfileModalMessage(
        "Your profile is 100% complete and submitted for review. Please wait for admin to activate your profile before adding items to cart or purchasing products.",
      );
      setProfileModalVisible(true);
      return false;
    }

    return true;
  };

  const handleAddToCart = async () => {
    if (!inStock) {
      Alert.alert("Out of Stock", "This product is currently out of stock.");
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
          "Added to Cart",
          `${product.name} (${quantity}) added to your cart!`,
          [
            { text: "Continue Shopping", style: "cancel" },
            { text: "View Cart", onPress: () => navigation.navigate("Cart") },
          ],
        );
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
        Alert.alert(
          "Cannot Add to Cart",
          res.message || "Failed to add product to cart.",
        );
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (!inStock) {
      Alert.alert("Out of Stock", "This product is currently out of stock.");
      return;
    }

    // 1. Client-side Profile Check
    if (!checkProfileCompleteness()) {
      return;
    }

    navigation.navigate("CheckoutReview", {
      isBuyNow: true,
      productId: product.id,
      quantity,
    });
  };

  const handleCartPress = () => {
    navigation.navigate("Cart");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProductDetails(true)}
            colors={["#E64A78"]}
            tintColor="#E64A78"
          />
        }
      >
        {/* Product Image Section */}
        <View style={styles.imageCard}>
          {product.image || product.product_image ? (
            <Image
              source={{ uri: product.image || product.product_image }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.fallbackIconBox}>
              <Ionicons
                name={product.icon || "bag"}
                size={90}
                color={product.color || "#E64A78"}
              />
            </View>
          )}

          {inStock ? (
            <View style={styles.stockTag}>
              <View style={styles.stockTagDot} />
              <Text style={styles.stockTagText}>In Stock</Text>
            </View>
          ) : (
            <View style={[styles.stockTag, styles.stockTagOut]}>
              <Text style={styles.stockTagText}>Out of Stock</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          {/* Category + Stock — one row, no more orphaned right-floating badge */}
          <View style={styles.topMetaRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{categoryName}</Text>
            </View>

            {inStock ? (
              <View style={styles.stockBadge}>
                <View style={styles.stockDot} />
                <Text style={styles.stockText}>
                  {product.stock !== undefined
                    ? `${product.stock} in stock`
                    : "In Stock"}
                </Text>
              </View>
            ) : (
              <View style={[styles.stockBadge, styles.stockBadgeOut]}>
                <View style={[styles.stockDot, styles.stockDotOut]} />
                <Text style={[styles.stockText, styles.stockTextOut]}>
                  Out of Stock
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.productName}>{product.name}</Text>

          {/* Price */}
          <View style={styles.priceSection}>
            <Text style={styles.price}>{formattedPrice}</Text>
            {product.oldPrice ? (
              <Text style={styles.oldPrice}>{product.oldPrice}</Text>
            ) : null}
            {isLowStock && (
              <View style={styles.lowStockPill}>
                <Ionicons name="flame" size={11} color="#D97706" />
                <Text style={styles.lowStockPillText}>
                  Only {product.stock} left
                </Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {product.description ||
              "High quality product carefully formulated to meet your wellness and lifestyle needs."}
          </Text>

          {/* Ingredients if array exists */}
          {Array.isArray(product.ingredients) &&
            product.ingredients.length > 0 && (
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

          {/* Quantity Selector — redesigned as a single unified pill stepper */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityStepper}>
              <TouchableOpacity
                style={[
                  styles.quantityBtn,
                  quantity <= 1 && styles.quantityBtnDisabled,
                ]}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                activeOpacity={0.7}
                disabled={quantity <= 1}
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color={quantity <= 1 ? "#C4B8BC" : "#2A1E24"}
                />
              </TouchableOpacity>
              <View style={styles.quantityDivider} />
              <Text style={styles.quantityText}>{quantity}</Text>
              <View style={styles.quantityDivider} />
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => setQuantity(quantity + 1)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color="#2A1E24" />
              </TouchableOpacity>
            </View>
            {quantity > 1 && (
              <Text style={styles.quantitySubtotal}>
                Subtotal: ₹{buyNowTotal.toLocaleString("en-IN")}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.addToCartBtn,
            (!inStock || addingToCart) && styles.addToCartBtnDisabled,
          ]}
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
                color={inStock ? "#E64A78" : "#9E8E93"}
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
          style={[
            styles.buyNowBtn,
            (!inStock || addingToCart) && styles.buyNowBtnDisabled,
          ]}
          onPress={handleBuyNow}
          disabled={!inStock || addingToCart}
          activeOpacity={0.8}
        >
          <Ionicons name="flash" size={20} color="#FFFFFF" />
          <Text style={styles.buyNowText}>Buy Now</Text>
        </TouchableOpacity>
      </View>

      {/* Checkout Modal for Buy Now */}
      <CheckoutModal
        visible={checkoutVisible}
        onClose={() => setCheckoutVisible(false)}
        navigation={navigation}
        items={[
          {
            id: product.id,
            name: product.name,
            price: unitPrice,
            quantity: quantity,
            image: product.image || product.product_image,
          },
        ]}
        totalAmount={buyNowTotal}
        isBuyNow={true}
        productId={product.id}
        quantity={quantity}
      />

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
          navigation.navigate("EditProfile");
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
    paddingBottom: 120,
  },
  loaderCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  loaderText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: "#8C7A82",
  },
  notFoundCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  notFoundIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FFF0F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  notFoundText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#2A1E24",
  },
  backBtn: {
    backgroundColor: "#E64A78",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
  },
  backBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },

  /* ── Image Card ── */
  imageCard: {
    margin: 20,
    marginBottom: 18,
    borderRadius: 24,
    height: 280,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "#F0EAED",
    overflow: "hidden",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  productImage: {
    width: "90%",
    height: "90%",
  },
  fallbackIconBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  stockTag: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#27A462",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#27A462",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  stockTagOut: {
    backgroundColor: "#9E8E93",
    shadowOpacity: 0,
  },
  stockTagDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#FFFFFF",
  },
  stockTagText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
  },

  /* ── Info Section ── */
  infoSection: {
    paddingHorizontal: 20,
  },
  topMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: "#FFF0F4",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#E64A78",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E8FBF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  stockBadgeOut: {
    backgroundColor: "#FFE8ED",
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#27A462",
  },
  stockDotOut: {
    backgroundColor: "#E64A78",
  },
  stockText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#27A462",
  },
  stockTextOut: {
    color: "#E64A78",
  },
  productName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 23,
    color: "#2A1E24",
    lineHeight: 30,
    marginBottom: 12,
  },
  priceSection: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  price: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    color: "#2A1E24",
  },
  oldPrice: {
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    color: "#9E8E93",
    textDecorationLine: "line-through",
  },
  lowStockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  lowStockPillText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10.5,
    color: "#D97706",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0EAED",
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#2A1E24",
    marginBottom: 8,
  },
  description: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    color: "#8C7A82",
    lineHeight: 22,
    marginBottom: 18,
  },
  ingredientsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  ingredientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  ingredientText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#2A1E24",
  },

  /* ── Quantity Stepper — single unified pill instead of 3 separate boxes ── */
  quantitySection: {
    marginBottom: 8,
  },
  quantityStepper: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#F0EAED",
    overflow: "hidden",
  },
  quantityBtn: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBtnDisabled: {
    opacity: 0.5,
  },
  quantityDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#F0EAED",
  },
  quantityText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#2A1E24",
    minWidth: 40,
    textAlign: "center",
  },
  quantitySubtotal: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#8C7A82",
    marginTop: 8,
  },

  /* ── Bottom Bar ── */
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0EAED",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF0F4",
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#E64A78",
  },
  addToCartBtnDisabled: {
    borderColor: "#F0EAED",
    backgroundColor: "#FAF7F8",
  },
  addToCartText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#E64A78",
  },
  addToCartTextDisabled: {
    color: "#9E8E93",
  },
  buyNowBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E64A78",
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: "#E64A78",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buyNowBtnDisabled: {
    backgroundColor: "#C5B8BD",
    shadowOpacity: 0,
    elevation: 0,
  },
  buyNowText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
});
