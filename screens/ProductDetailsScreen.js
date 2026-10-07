import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
  StatusBar,
  Animated,
  PanResponder,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Header from "../components/Header";
import ProfileIncompleteModal from "../components/ProfileIncompleteModal";
import CheckoutModal from "../components/CheckoutModal";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { showAlert } from "../contexts/AlertContext";
import productService from "../services/productService";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ProductDetailsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
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
        !initialProduct.name),
    ),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const { cartItems, addToCart, updateQuantity, removeFromCart, getCartCount, fetchCart } = useCart();
  const { user, refreshProfile } = useAuth();
  const [quantity, setQuantity] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeQuantities, setSizeQuantities] = useState({});
  const [addingToCart, setAddingToCart] = useState(false);

  // Helper to find the cart line item for a particular size of this product
  const getCartItemForSize = useCallback(
    (sz) => {
      if (!product || !Array.isArray(cartItems)) return null;
      const targetProdId = Number(product.product_id || product.id);
      const cleanTargetSize = sz ? String(sz).trim().toLowerCase() : "";

      return (
        cartItems.find((ci) => {
          const ciProdId = Number(ci.product_id || ci.id);
          if (ciProdId !== targetProdId) return false;
          const ciSize = ci.size ? String(ci.size).trim().toLowerCase() : "";
          if (cleanTargetSize) {
            return ciSize === cleanTargetSize;
          }
          return !ciSize;
        }) || null
      );
    },
    [product, cartItems],
  );

  // Determine what quantity to display for a given size:
  // 1. If user manually changed quantity for this size during current session, show that
  // 2. If size is already in cart, show that size's cart quantity (e.g. 3 for M)
  // 3. Otherwise, for products with sizes, default to 0 (as requested by user)
  // 4. For products with no sizes, default to 1 (or cart quantity if in cart)
  const getResolvedQuantity = useCallback(
    (sz) => {
      if (sz && sizeQuantities[sz] !== undefined) {
        return sizeQuantities[sz];
      }
      const inCart = getCartItemForSize(sz);
      if (inCart) {
        return Number(inCart.quantity) || 1;
      }
      if (product?.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
        return 0;
      }
      return 1;
    },
    [getCartItemForSize, sizeQuantities, product?.sizes],
  );

  // Sync selected size whenever product sizes change
  useEffect(() => {
    if (
      product?.sizes &&
      Array.isArray(product.sizes) &&
      product.sizes.length > 0
    ) {
      if (!selectedSize || !product.sizes.includes(selectedSize)) {
        const initialSz = product.sizes[0];
        setSelectedSize(initialSz);
        setQuantity(getResolvedQuantity(initialSz));
      }
    } else {
      setSelectedSize(null);
      setQuantity(getResolvedQuantity(null));
    }
  }, [product?.sizes]);

  // Keep quantity in sync whenever selectedSize, cartItems, or product changes
  useEffect(() => {
    if (!product) return;
    const currentQty = getResolvedQuantity(selectedSize);
    setQuantity(currentQty);
  }, [selectedSize, cartItems, product?.id, getResolvedQuantity]);

  // Keep quantity within available stock.
  // (Declared before any early return so hook order is always stable.)
  useEffect(() => {
    if (!product) return;
    const stockLimit =
      product.stock !== undefined && product.stock !== null
        ? Math.max(0, Number(product.stock))
        : 999;
    const stocked =
      stockLimit > 0 &&
      (product.stock !== undefined
        ? Number(product.stock) > 0
        : product.inStock !== false) &&
      (product.status === undefined || Number(product.status) === 1);
    if (stocked && stockLimit > 0 && quantity > stockLimit) {
      setQuantity(stockLimit);
    }
  }, [product, quantity]);

  // Silently refresh profile and cart on screen focus
  useFocusEffect(
    useCallback(() => {
      if (refreshProfile) {
        refreshProfile();
      }
      if (fetchCart) {
        fetchCart();
      }
    }, [refreshProfile, fetchCart]),
  );

  // Checkout Modal State
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  // Profile Incomplete Modal State
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileCompletionPct, setProfileCompletionPct] = useState(0);
  const [missingFields, setMissingFields] = useState([]);
  const [isProfileUnderReview, setIsProfileUnderReview] = useState(false);
  const [profileModalMessage, setProfileModalMessage] = useState("");

  // Product Gallery & Zoom Modal State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  // Interactive Pinch & Pan Gesture Refs
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const currentScale = useRef(1);
  const currentPan = useRef({ x: 0, y: 0 });
  const initialPinchDist = useRef(null);
  const initialPinchScale = useRef(1);
  const lastTap = useRef(0);

  // Keep ref values in sync with Animated values
  useEffect(() => {
    const panId = pan.addListener((value) => {
      currentPan.current = value;
    });
    const scaleId = scale.addListener((value) => {
      currentScale.current = value.value;
    });
    return () => {
      pan.removeListener(panId);
      scale.removeListener(scaleId);
    };
  }, [pan, scale]);

  const resetZoom = useCallback(() => {
    currentScale.current = 1;
    currentPan.current = { x: 0, y: 0 };
    setZoomScale(1);
    pan.setValue({ x: 0, y: 0 });
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pan, {
        toValue: { x: 0, y: 0 },
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, pan]);

  const setZoomLevel = useCallback(
    (targetScale) => {
      const clamped = Math.max(1, Math.min(Number(targetScale.toFixed(1)), 4));
      currentScale.current = clamped;
      setZoomScale(clamped);
      if (clamped <= 1) {
        currentPan.current = { x: 0, y: 0 };
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.spring(scale, {
          toValue: clamped,
          useNativeDriver: true,
        }).start();
      }
    },
    [scale, pan],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            gestureState.numberActiveTouches >= 2 || currentScale.current > 1
          );
        },
        onPanResponderGrant: (evt, gestureState) => {
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length >= 2) {
            const dist = Math.hypot(
              touches[0].pageX - touches[1].pageX,
              touches[0].pageY - touches[1].pageY,
            );
            initialPinchDist.current = dist;
            initialPinchScale.current = currentScale.current;
          } else if (touches && touches.length === 1) {
            const now = Date.now();
            if (now - lastTap.current < 300) {
              lastTap.current = 0;
              if (currentScale.current > 1.2) {
                resetZoom();
              } else {
                setZoomLevel(2.5);
              }
              return;
            }
            lastTap.current = now;

            pan.setOffset({
              x: currentPan.current.x,
              y: currentPan.current.y,
            });
            pan.setValue({ x: 0, y: 0 });
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length >= 2) {
            const dist = Math.hypot(
              touches[0].pageX - touches[1].pageX,
              touches[0].pageY - touches[1].pageY,
            );
            if (initialPinchDist.current && initialPinchDist.current > 0) {
              const factor = dist / initialPinchDist.current;
              const newScale = Math.max(
                1,
                Math.min(initialPinchScale.current * factor, 4.5),
              );
              currentScale.current = newScale;
              scale.setValue(newScale);
              setZoomScale(Number(newScale.toFixed(1)));
            }
          } else if (
            touches &&
            touches.length === 1 &&
            currentScale.current > 1
          ) {
            pan.setValue({ x: gestureState.dx, y: gestureState.dy });
          }
        },
        onPanResponderRelease: () => {
          initialPinchDist.current = null;
          pan.flattenOffset();

          if (currentScale.current <= 1.05) {
            resetZoom();
            return;
          }

          const maxPanX = ((currentScale.current - 1) * SCREEN_WIDTH) / 2;
          const maxPanY =
            ((currentScale.current - 1) * (SCREEN_HEIGHT * 0.65)) / 2;

          let targetX = currentPan.current.x;
          let targetY = currentPan.current.y;
          let needsSpring = false;

          if (targetX > maxPanX) {
            targetX = maxPanX;
            needsSpring = true;
          } else if (targetX < -maxPanX) {
            targetX = -maxPanX;
            needsSpring = true;
          }

          if (targetY > maxPanY) {
            targetY = maxPanY;
            needsSpring = true;
          } else if (targetY < -maxPanY) {
            targetY = -maxPanY;
            needsSpring = true;
          }

          currentPan.current = { x: targetX, y: targetY };

          if (needsSpring) {
            Animated.spring(pan, {
              toValue: { x: targetX, y: targetY },
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          initialPinchDist.current = null;
          pan.flattenOffset();
          if (currentScale.current <= 1.05) {
            resetZoom();
          }
        },
      }),
    [pan, scale, resetZoom, setZoomLevel],
  );

  // Extract all gallery images (default image first)
  const galleryImages = useMemo(() => {
    if (Array.isArray(product?.gallery) && product.gallery.length > 0) {
      return product.gallery
        .map((g, idx) => {
          if (typeof g === "string") {
            return { id: idx, uri: g, is_default: idx === 0 };
          }
          return {
            id: g.id || idx,
            uri: g.url || g.image,
            is_default: Boolean(g.is_default && Number(g.is_default) === 1),
          };
        })
        .filter((item) => Boolean(item.uri));
    }
    if (Array.isArray(product?.images) && product.images.length > 0) {
      return product.images
        .map((img, idx) => {
          if (typeof img === "string") {
            return { id: idx, uri: img, is_default: idx === 0 };
          }
          return {
            id: img.id || idx,
            uri: img.url || img.image || img.uri,
            is_default: Boolean(img.is_default && Number(img.is_default) === 1),
          };
        })
        .filter((item) => Boolean(item.uri));
    }
    const singleImage = product?.image || product?.product_image;
    if (singleImage) {
      return [{ id: 1, uri: singleImage, is_default: true }];
    }
    return [];
  }, [product]);

  const currentImageUri =
    galleryImages[activeImageIndex]?.uri ||
    product?.image ||
    product?.product_image ||
    null;

  const currentIsDefault = galleryImages[activeImageIndex]?.is_default;

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
    [productId, product],
  );

  useEffect(() => {
    if (productId) {
      setActiveImageIndex(0);
      setZoomScale(1);
      fetchProductDetails();
    }
  }, [productId]);

  useEffect(() => {
    if (route.params?.product) {
      setActiveImageIndex(0);
      setZoomScale(1);
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

  const maxStock =
    product.stock !== undefined && product.stock !== null
      ? Math.max(0, Number(product.stock))
      : 999;
  const inStock =
    maxStock > 0 &&
    (product.stock !== undefined
      ? Number(product.stock) > 0
      : product.inStock !== false) &&
    (product.status === undefined || Number(product.status) === 1);
  const isLowStock = inStock && maxStock <= 5;

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
  const buyNowTotal = unitPrice * (inStock ? quantity : 0);
  const formattedSubtotal = `₹${buyNowTotal.toLocaleString("en-IN")}`;

  const handleDecreaseQuantity = () => {
    if (quantity <= 0 || !inStock) return;
    const newQty = Math.max(0, quantity - 1);
    setQuantity(newQty);
    if (selectedSize) {
      setSizeQuantities((prev) => ({ ...prev, [selectedSize]: newQty }));
    }
  };

  const handleIncreaseQuantity = () => {
    if (!inStock) return;
    if (quantity >= maxStock) {
      showAlert({
        title: "Stock Limit Reached",
        message: `Only ${maxStock} unit${maxStock === 1 ? "" : "s"} available in stock for this product.`,
        type: "warning",
      });
      return;
    }
    const newQty = quantity + 1;
    setQuantity(newQty);
    if (selectedSize) {
      setSizeQuantities((prev) => ({ ...prev, [selectedSize]: newQty }));
    }
  };

  const checkProfileCompleteness = async () => {
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

    if (!currentUser) return true;
    const actualPct = Number(currentUser?.profile_completion_percentage ?? 0);
    const missingList = Array.isArray(currentUser?.missing_fields)
      ? currentUser.missing_fields
      : [];
    const hasMissing = missingList.length > 0;
    const isCompleted =
      (currentUser?.is_profile_completed === true || actualPct >= 100) &&
      !hasMissing &&
      actualPct >= 100;

    if (!isCompleted || actualPct < 100 || hasMissing) {
      setProfileCompletionPct(
        actualPct < 100 ? actualPct : hasMissing ? 99 : actualPct,
      );
      setMissingFields(missingList);
      setIsProfileUnderReview(false);
      setProfileModalMessage("");
      setProfileModalVisible(true);
      return false;
    }

    if (
      isCompleted &&
      (currentUser.is_profile_active === false ||
        currentUser.is_profile_active === 0)
    ) {
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

  const currentCartItem = getCartItemForSize(selectedSize);
  const isCurrentInCart = Boolean(currentCartItem);
  const inCartQuantity = currentCartItem ? Number(currentCartItem.quantity) : 0;

  const handleAddToCart = async () => {
    if (!inStock) {
      showAlert({
        title: "Out of Stock",
        message: "This product is currently out of stock.",
        type: "warning",
      });
      return;
    }

    const existingInCart = currentCartItem;

    if (quantity > maxStock) {
      showAlert({
        title: "Stock Limit",
        message: `Cannot add more than ${maxStock} units.`,
        type: "warning",
      });
      return;
    }

    // 1. Client-side Profile Check with live sync
    const isAllowed = await checkProfileCompleteness();
    if (!isAllowed) {
      return;
    }

    setAddingToCart(true);
    try {
      const sizeInfo = selectedSize ? ` (Size: ${selectedSize})` : "";
      let res = null;

      if (existingInCart) {
        if (quantity <= 0) {
          // User dialed quantity to 0 -> remove from cart
          res = await removeFromCart(existingInCart.cart_id, product.id, selectedSize);
          if (res.success) {
            if (selectedSize) {
              setSizeQuantities((prev) => {
                const updated = { ...prev };
                delete updated[selectedSize];
                return updated;
              });
            }
            showAlert({
              title: "Removed from Cart",
              message: `${product.name}${sizeInfo} removed from your shopping cart.`,
              type: "info",
            });
            if (fetchCart) fetchCart();
            return;
          }
        } else if (quantity === Number(existingInCart.quantity)) {
          // Already in cart with exact quantity
          showAlert({
            title: "Already in Cart",
            message: `✓ ${quantity} × ${product.name}${sizeInfo} is already in your cart.\n\n• Unit Price: ₹${unitPrice.toLocaleString("en-IN")}\n• Total Amount: ${formattedSubtotal}`,
            type: "cart",
            buttons: [
              { text: "Continue Shopping", style: "cancel" },
              { text: "View Cart", onPress: () => navigation.navigate("Cart") },
            ],
          });
          return;
        } else {
          // Update quantity for this variant in cart
          res = await updateQuantity(existingInCart.cart_id, quantity, selectedSize, product.id);
          if (res.success) {
            if (selectedSize) {
              setSizeQuantities((prev) => {
                const updated = { ...prev };
                delete updated[selectedSize];
                return updated;
              });
            }
            showAlert({
              title: "Cart Updated",
              message: `✓ Updated to ${quantity} × ${product.name}${sizeInfo} in your shopping cart!\n\n• Unit Price: ₹${unitPrice.toLocaleString("en-IN")}\n• Total Amount: ${formattedSubtotal}`,
              type: "cart",
              buttons: [
                { text: "Continue Shopping", style: "cancel" },
                { text: "View Cart", onPress: () => navigation.navigate("Cart") },
              ],
            });
            if (fetchCart) fetchCart();
            return;
          }
        }
      } else {
        // Not in cart yet -> Add to cart
        const qtyToAdd = quantity > 0 ? quantity : 1;
        res = await addToCart(product, qtyToAdd, selectedSize);
        if (res.success) {
          setQuantity(qtyToAdd);
          if (selectedSize) {
            setSizeQuantities((prev) => {
              const updated = { ...prev };
              delete updated[selectedSize];
              return updated;
            });
          }
          showAlert({
            title: "Added to Cart",
            message: `✓ ${qtyToAdd} × ${product.name}${sizeInfo}\n\n• Unit Price: ₹${unitPrice.toLocaleString("en-IN")}\n• Total Amount: ₹${(unitPrice * qtyToAdd).toLocaleString("en-IN")}\n\nItem has been successfully added to your shopping cart!`,
            type: "cart",
            buttons: [
              { text: "Continue Shopping", style: "cancel" },
              { text: "View Cart", onPress: () => navigation.navigate("Cart") },
            ],
          });
          if (fetchCart) fetchCart();
          return;
        }
      }

      if (res && !res.success) {
        if (res.isUnderReview || res.isProfileIncomplete) {
          const missingList = res.profileData?.missing_fields || [];
          const hasMissing = missingList.length > 0;
          let pct = Number(
            res.profileData?.profile_completion_percentage ??
              user?.profile_completion_percentage ??
              0,
          );
          if (hasMissing && pct >= 100) {
            pct = 99;
          }
          const underReview =
            Boolean(res.isUnderReview) && !hasMissing && pct >= 100;
          setProfileCompletionPct(pct);
          setMissingFields(missingList);
          setIsProfileUnderReview(underReview);
          setProfileModalMessage(res.message || "");
          setProfileModalVisible(true);
        } else {
          showAlert({
            title: "Cannot Add to Cart",
            message: res.message || "Failed to add product to cart.",
            type: "error",
          });
        }
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!inStock) {
      showAlert({
        title: "Out of Stock",
        message: "This product is currently out of stock.",
        type: "warning",
      });
      return;
    }

    const currentCartItem = getCartItemForSize(selectedSize);
    const inCartQty = currentCartItem ? Number(currentCartItem.quantity) : 0;
    const effectiveQty = quantity > 0 ? quantity : (inCartQty > 0 ? inCartQty : 1);

    if (effectiveQty > maxStock) {
      showAlert({
        title: "Stock Limit",
        message: `Cannot order more than ${maxStock} units.`,
        type: "warning",
      });
      return;
    }

    // 1. Client-side Profile Check with live sync
    const isAllowed = await checkProfileCompleteness();
    if (!isAllowed) {
      return;
    }

    navigation.navigate("CheckoutReview", {
      isBuyNow: true,
      productId: product.id,
      quantity: effectiveQty,
      selectedSize,
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
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 150 + insets.bottom },
        ]}
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
        <TouchableOpacity
          style={styles.imageCard}
          activeOpacity={currentImageUri ? 0.92 : 1}
          onPress={() => {
            if (currentImageUri) {
              resetZoom();
              setZoomModalVisible(true);
            }
          }}
        >
          {currentImageUri ? (
            <Image
              source={{ uri: currentImageUri }}
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

          {/* Role badge: Default vs Secondary (top-left, sits above the image) */}
          {galleryImages.length > 0 && currentImageUri && (
            <View
              style={[
                styles.imageRoleBadge,
                !currentIsDefault && styles.imageRoleBadgeSecondary,
              ]}
            >
              <Ionicons
                name={currentIsDefault ? "star" : "images-outline"}
                size={11}
                color={currentIsDefault ? "#B45309" : "#4B5563"}
              />
              <Text
                style={[
                  styles.imageRoleText,
                  !currentIsDefault && styles.imageRoleTextSecondary,
                ]}
              >
                {currentIsDefault ? "Default" : "Secondary"}
              </Text>
            </View>
          )}

          {/* Stock tag only when unavailable (in-stock status is shown below) */}
          {!inStock && (
            <View style={[styles.stockTag, styles.stockTagOut]}>
              <Text style={styles.stockTagText}>Out of Stock</Text>
            </View>
          )}

          {/* Bottom Card Controls / Indicators */}
          {currentImageUri && (
            <View style={styles.imageCardBottomRow}>
              {galleryImages.length > 1 ? (
                <View style={styles.imageIndexPill}>
                  <Ionicons name="images" size={12} color="#FFFFFF" />
                  <Text style={styles.imageIndexPillText}>
                    {activeImageIndex + 1} / {galleryImages.length}
                  </Text>
                </View>
              ) : (
                <View />
              )}

              <View style={styles.zoomPromptBadge}>
                <Ionicons name="scan-outline" size={12} color="#FFFFFF" />
                <Text style={styles.zoomPromptText}>Tap to Zoom</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Thumbnail Selector Strip (if multiple gallery images exist) */}
        {galleryImages.length > 1 && (
          <View style={styles.thumbnailStripWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailStrip}
            >
              {galleryImages.map((item, idx) => {
                const isSelected = idx === activeImageIndex;
                return (
                  <TouchableOpacity
                    key={item.id || idx}
                    activeOpacity={0.75}
                    onPress={() => setActiveImageIndex(idx)}
                    style={[
                      styles.thumbnailItem,
                      isSelected && styles.thumbnailItemActive,
                    ]}
                  >
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                    {item.is_default && (
                      <View style={styles.thumbnailDefaultDot}>
                        <Ionicons name="star" size={7} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Product Info */}
        <View style={styles.infoSection}>
          {/* Category + Stock — one row */}
          <View style={styles.topMetaRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText} numberOfLines={1}>
                {categoryName}
              </Text>
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

          {/* Size Selector (Amazon / Flipkart Style) */}
          {product.sizes &&
          Array.isArray(product.sizes) &&
          product.sizes.length > 0 ? (
            <View style={styles.sizeSection}>
              <View style={styles.sizeHeaderRow}>
                <View style={styles.sizeHeaderLeft}>
                  <Ionicons name="shirt-outline" size={16} color="#E64A78" />
                  <Text style={styles.sizeSectionTitle}>Select Size</Text>
                </View>
                {selectedSize ? (
                  <View style={styles.selectedSizeIndicator}>
                    <Text style={styles.selectedSizeIndicatorLabel}>
                      Selected:{" "}
                      <Text style={styles.selectedSizeIndicatorValue}>
                        {selectedSize}
                      </Text>
                      {(() => {
                        const inCartItem = getCartItemForSize(selectedSize);
                        if (inCartItem && inCartItem.quantity > 0) {
                          return (
                            <Text style={styles.inCartIndicatorText}>
                              {"  "}• {inCartItem.quantity} in cart
                            </Text>
                          );
                        }
                        return null;
                      })()}
                    </Text>
                  </View>
                ) : null}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sizesPillsContainer}
              >
                {product.sizes.map((sz, idx) => {
                  const isChosen = selectedSize === sz;
                  const itemInCart = getCartItemForSize(sz);
                  const inCartQty = itemInCart ? Number(itemInCart.quantity) : 0;
                  return (
                    <TouchableOpacity
                      key={`${sz}-${idx}`}
                      style={[
                        styles.sizeChip,
                        isChosen && styles.sizeChipSelected,
                      ]}
                      activeOpacity={0.75}
                      onPress={() => {
                        setSelectedSize(sz);
                        setQuantity(getResolvedQuantity(sz));
                      }}
                    >
                      {isChosen && (
                        <Ionicons
                          name="checkmark"
                          size={13}
                          color="#FFFFFF"
                          style={styles.sizeCheckIcon}
                        />
                      )}
                      <Text
                        style={[
                          styles.sizeChipText,
                          isChosen && styles.sizeChipTextSelected,
                        ]}
                      >
                        {sz}
                      </Text>
                      {inCartQty > 0 && (
                        <View
                          style={[
                            styles.sizeCartDot,
                            isChosen && styles.sizeCartDotChosen,
                          ]}
                        >
                          <Text
                            style={[
                              styles.sizeCartDotText,
                              isChosen && styles.sizeCartDotTextChosen,
                            ]}
                          >
                            {inCartQty}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* Quantity & Order Info Card */}
          <View style={styles.quantityCard}>
            <View style={styles.quantityHeaderRow}>
              <View style={styles.quantityTitleGroup}>
                <View style={styles.quantityTitleRow}>
                  <Ionicons name="layers-outline" size={16} color="#E64A78" />
                  <Text style={styles.quantityTitle}>Select Quantity</Text>
                </View>
                <Text style={styles.quantitySubtitle} numberOfLines={2}>
                  {inStock
                    ? `${maxStock} unit${maxStock === 1 ? "" : "s"} available in stock`
                    : "Currently out of stock"}
                </Text>
              </View>

              {/* Stepper Controls */}
              <View
                style={[
                  styles.quantityStepper,
                  !inStock && styles.quantityStepperDisabled,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.quantityBtn,
                    (quantity <= 0 || !inStock) && styles.quantityBtnDisabled,
                  ]}
                  onPress={handleDecreaseQuantity}
                  activeOpacity={0.7}
                  disabled={quantity <= 0 || !inStock}
                >
                  <Ionicons
                    name="remove"
                    size={18}
                    color={quantity <= 0 || !inStock ? "#C4B8BC" : "#2A1E24"}
                  />
                </TouchableOpacity>

                <View style={styles.quantityDivider} />
                <Text style={styles.quantityText}>
                  {inStock ? quantity : 0}
                </Text>
                <View style={styles.quantityDivider} />

                <TouchableOpacity
                  style={[
                    styles.quantityBtn,
                    (quantity >= maxStock || !inStock) &&
                      styles.quantityBtnDisabled,
                  ]}
                  onPress={handleIncreaseQuantity}
                  activeOpacity={0.7}
                  disabled={quantity >= maxStock || !inStock}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={
                      quantity >= maxStock || !inStock ? "#C4B8BC" : "#2A1E24"
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Live Pricing Breakdown Bar */}
            <View style={styles.priceBreakdownRow}>
              <View style={styles.priceBreakdownItem}>
                <Text style={styles.priceBreakdownLabel}>Unit Price</Text>
                <Text
                  style={styles.priceBreakdownValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  ₹{unitPrice.toLocaleString("en-IN")}
                </Text>
              </View>

              <View style={styles.priceBreakdownDivider} />

              <View style={styles.priceBreakdownItem}>
                <Text style={styles.priceBreakdownLabel}>Selected Qty</Text>
                <Text
                  style={styles.priceBreakdownValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {inStock ? quantity : 0} {quantity === 1 ? "Unit" : "Units"}
                </Text>
              </View>

              <View style={styles.priceBreakdownDivider} />

              <View style={styles.priceBreakdownItem}>
                <Text style={styles.priceBreakdownLabel}>Total Amount</Text>
                <Text
                  style={styles.priceBreakdownTotal}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {formattedSubtotal}
                </Text>
              </View>
            </View>

            {/* In-Stock or Max Limit Banner */}
            {inStock && quantity >= maxStock && (
              <View style={styles.stockNoticeBox}>
                <Ionicons name="alert-circle" size={14} color="#D97706" />
                <Text style={styles.stockNoticeText}>
                  Maximum available stock selected ({maxStock} units).
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.descriptionCard}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>
              {product.description ||
                "High quality product carefully formulated to meet your wellness and lifestyle needs."}
            </Text>

            {/* Ingredients if array exists */}
            {Array.isArray(product.ingredients) &&
              product.ingredients.length > 0 && (
                <>
                  <Text
                    style={[styles.sectionTitle, styles.sectionTitleSpaced]}
                  >
                    Key Ingredients
                  </Text>
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
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        {inStock && (
          <View style={styles.bottomSummaryRow}>
            <Text style={styles.bottomSummaryLabel} numberOfLines={1}>
              {quantity > 0
                ? `Total • ${quantity} ${quantity === 1 ? "item" : "items"}`
                : isCurrentInCart
                ? `In Cart • ${inCartQuantity} ${inCartQuantity === 1 ? "item" : "items"}`
                : `Total • 0 items`}
            </Text>
            <Text
              style={styles.bottomSummaryTotal}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {quantity > 0
                ? formattedSubtotal
                : isCurrentInCart
                ? `₹${(unitPrice * inCartQuantity).toLocaleString("en-IN")}`
                : "₹0"}
            </Text>
          </View>
        )}

        <View style={styles.bottomButtonsRow}>
          <TouchableOpacity
            style={[
              styles.addToCartBtn,
              (!inStock || addingToCart) && styles.addToCartBtnDisabled,
              isCurrentInCart && quantity <= 0 && styles.removeFromCartBtn,
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
                  name={
                    !inStock
                      ? "bag-remove-outline"
                      : isCurrentInCart && quantity <= 0
                      ? "trash-outline"
                      : isCurrentInCart && quantity === inCartQuantity
                      ? "checkmark-circle-outline"
                      : isCurrentInCart
                      ? "sync-outline"
                      : "bag-add-outline"
                  }
                  size={20}
                  color={
                    !inStock
                      ? "#9E8E93"
                      : isCurrentInCart && quantity <= 0
                      ? "#EF4444"
                      : "#E64A78"
                  }
                />
                <Text
                  style={[
                    styles.addToCartText,
                    !inStock && styles.addToCartTextDisabled,
                    isCurrentInCart && quantity <= 0 && styles.removeFromCartText,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {!inStock
                    ? "Out of Stock"
                    : isCurrentInCart && quantity <= 0
                    ? "Remove from Cart"
                    : isCurrentInCart && quantity === inCartQuantity
                    ? `In Cart (${inCartQuantity})`
                    : isCurrentInCart
                    ? `Update Cart (${quantity})`
                    : quantity > 0
                    ? `Add to Cart (${quantity})`
                    : "Add to Cart"}
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
            <Text
              style={styles.buyNowText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {inStock ? "Buy Now" : "Unavailable"}
            </Text>
          </TouchableOpacity>
        </View>
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
            quantity: quantity > 0 ? quantity : (inCartQuantity > 0 ? inCartQuantity : 1),
            size: selectedSize,
            image: product.image || product.product_image,
          },
        ]}
        totalAmount={unitPrice * (quantity > 0 ? quantity : (inCartQuantity > 0 ? inCartQuantity : 1))}
        isBuyNow={true}
        productId={product.id}
        quantity={quantity > 0 ? quantity : (inCartQuantity > 0 ? inCartQuantity : 1)}
        size={selectedSize}
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

      {/* Fullscreen Product Gallery & Zoom Modal */}
      <Modal
        visible={zoomModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          resetZoom();
          setZoomModalVisible(false);
        }}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <StatusBar barStyle="light-content" backgroundColor="#0B0B0F" />

          {/* Modal Top Header */}
          <SafeAreaView edges={["top"]} style={styles.modalHeaderSafe}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  resetZoom();
                  setZoomModalVisible(false);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.modalHeaderTitleWrap}>
                <Text style={styles.modalCounterText}>
                  {galleryImages.length > 0
                    ? `${activeImageIndex + 1} of ${galleryImages.length}`
                    : "1 of 1"}
                </Text>
                {currentIsDefault ? (
                  <View style={styles.modalDefaultPill}>
                    <Ionicons name="star" size={10} color="#FBBF24" />
                    <Text style={styles.modalDefaultPillText}>
                      Default Image
                    </Text>
                  </View>
                ) : (
                  <View style={styles.modalSecondaryPill}>
                    <Ionicons name="images-outline" size={10} color="#9CA3AF" />
                    <Text style={styles.modalSecondaryPillText}>
                      Secondary Image
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={resetZoom}
                activeOpacity={0.8}
                title="Reset Zoom"
              >
                <Ionicons name="contract-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Main Zoomable & Moveable Image Viewport */}
          <View style={styles.zoomContainer}>
            {/* Gesture Area for Image Zoom, Unzoom & Drag */}
            <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
              <View style={styles.zoomImageWrapper} pointerEvents="none">
                {currentImageUri ? (
                  <Animated.Image
                    source={{ uri: currentImageUri }}
                    style={[
                      styles.modalMainImage,
                      {
                        transform: [
                          { translateX: pan.x },
                          { translateY: pan.y },
                          { scale: scale },
                        ],
                      },
                    ]}
                    resizeMode="contain"
                  />
                ) : null}
              </View>
            </View>

            {/* Floating Gesture Hint */}
            <View style={styles.zoomGestureHint} pointerEvents="none">
              <Ionicons
                name="finger-print-outline"
                size={13}
                color="rgba(255,255,255,0.7)"
              />
              <Text style={styles.zoomGestureHintText}>
                {zoomScale > 1.05
                  ? "Drag with finger to explore • Double tap to reset"
                  : "Pinch with 2 fingers to zoom • Drag to explore"}
              </Text>
            </View>

            {/* Left & Right Navigation Arrows */}
            {galleryImages.length > 1 && zoomScale <= 1.15 && (
              <>
                {activeImageIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.arrowBtn, styles.arrowLeft]}
                    onPress={() => {
                      setActiveImageIndex((prev) => Math.max(0, prev - 1));
                      resetZoom();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                {activeImageIndex < galleryImages.length - 1 && (
                  <TouchableOpacity
                    style={[styles.arrowBtn, styles.arrowRight]}
                    onPress={() => {
                      setActiveImageIndex((prev) =>
                        Math.min(galleryImages.length - 1, prev + 1),
                      );
                      resetZoom();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Floating Zoom Controls (+ / - / 1x) */}
            <View style={styles.floatingZoomBar}>
              <TouchableOpacity
                style={styles.floatingZoomBtn}
                onPress={() => setZoomLevel(zoomScale + 0.5)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.floatingZoomDivider} />
              <TouchableOpacity
                style={styles.floatingZoomBtn}
                onPress={() => setZoomLevel(zoomScale - 0.5)}
                activeOpacity={0.8}
              >
                <Ionicons name="remove" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.floatingZoomDivider} />
              <TouchableOpacity
                style={styles.floatingZoomBtn}
                onPress={resetZoom}
                activeOpacity={0.8}
              >
                <Text style={styles.floatingZoomText}>
                  {zoomScale <= 1 ? "1x" : `${zoomScale}x`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Thumbnail Strip for Switching Product Images */}
          {galleryImages.length > 1 && (
            <SafeAreaView edges={["bottom"]} style={styles.modalBottomSafe}>
              <View style={styles.modalThumbnailWrapper}>
                <Text style={styles.modalThumbnailTitle}>
                  Product Photos ({galleryImages.length})
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.modalThumbnailStrip}
                >
                  {galleryImages.map((img, idx) => {
                    const isSelected = idx === activeImageIndex;
                    return (
                      <TouchableOpacity
                        key={img.id || idx}
                        activeOpacity={0.8}
                        onPress={() => {
                          setActiveImageIndex(idx);
                          resetZoom();
                        }}
                        style={[
                          styles.modalThumbItem,
                          isSelected && styles.modalThumbItemActive,
                        ]}
                      >
                        <Image
                          source={{ uri: img.uri }}
                          style={styles.modalThumbImage}
                          resizeMode="cover"
                        />
                        {img.is_default && (
                          <View style={styles.modalThumbStarBadge}>
                            <Ionicons name="star" size={8} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </SafeAreaView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAF7F8",
  },
  container: {
    paddingBottom: 150,
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
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 14,
    borderRadius: 24,
    height: 380,
    // Top/bottom padding reserves lanes for the overlay chips,
    // so badges never sit on top of the product photo.
    paddingTop: 52,
    paddingBottom: 52,
    paddingHorizontal: 12,
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
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  fallbackIconBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  stockTag: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#27A462",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  stockTagOut: {
    backgroundColor: "#9E8E93",
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

  /* ── Image Role Badges & Bottom Card Controls ── */
  imageRoleBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  imageRoleBadgeSecondary: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  imageRoleText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10.5,
    color: "#B45309",
  },
  imageRoleTextSecondary: {
    color: "#4B5563",
  },
  imageCardBottomRow: {
    position: "absolute",
    bottom: 12,
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  imageIndexPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(15, 15, 20, 0.72)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  imageIndexPillText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  zoomPromptBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E64A78",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  zoomPromptText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10.5,
    color: "#FFFFFF",
  },

  /* ── Horizontal Thumbnail Strip ── */
  thumbnailStripWrapper: {
    marginBottom: 18,
  },
  thumbnailStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  thumbnailItem: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#F0EAED",
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailItemActive: {
    borderColor: "#E64A78",
    borderWidth: 2.5,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailDefaultDot: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Fullscreen Zoom Modal Styles ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  modalHeaderSafe: {
    backgroundColor: "rgba(11, 11, 15, 0.95)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderTitleWrap: {
    alignItems: "center",
    gap: 3,
  },
  modalCounterText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  modalDefaultPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modalDefaultPillText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 9.5,
    color: "#FBBF24",
  },
  modalSecondaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modalSecondaryPillText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 9.5,
    color: "#9CA3AF",
  },
  modalResetBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomContainer: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#0B0B0F",
  },
  zoomImageWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: SCREEN_WIDTH,
    height: "100%",
  },
  modalMainImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  zoomGestureHint: {
    position: "absolute",
    top: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(20, 20, 26, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    zIndex: 5,
  },
  zoomGestureHintText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
  },
  arrowBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(20, 20, 26, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 10,
  },
  arrowLeft: {
    left: 12,
  },
  arrowRight: {
    right: 12,
  },
  floatingZoomBar: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20, 20, 26, 0.88)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  floatingZoomBtn: {
    width: 38,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingZoomDivider: {
    width: 1,
    height: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  floatingZoomText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  modalBottomSafe: {
    backgroundColor: "rgba(11, 11, 15, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  modalThumbnailWrapper: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalThumbnailTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  modalThumbnailStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalThumbItem: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: "#1F2937",
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
    position: "relative",
  },
  modalThumbItemActive: {
    borderColor: "#E64A78",
  },
  modalThumbImage: {
    width: "100%",
    height: "100%",
  },
  modalThumbStarBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Info Section ── */
  infoSection: {
    paddingHorizontal: 20,
  },
  topMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  categoryBadge: {
    flexShrink: 1,
    backgroundColor: "#FFF0F4",
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
    fontSize: 22,
    color: "#2A1E24",
    lineHeight: 30,
    marginBottom: 6,
  },
  priceSection: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  price: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    color: "#E64A78",
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
  descriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#F0EAED",
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#2A1E24",
    marginBottom: 6,
  },
  sectionTitleSpaced: {
    marginTop: 14,
  },
  description: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    color: "#8C7A82",
    lineHeight: 22,
  },
  ingredientsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  ingredientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FAF7F8",
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

  /* ── Interactive Quantity Card & Stepper ── */
  quantityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#F0EAED",
    marginBottom: 16,
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  quantityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  quantityTitleGroup: {
    flex: 1,
    marginRight: 12,
  },
  quantityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  quantityTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14.5,
    color: "#2A1E24",
  },
  quantitySubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#8C7A82",
  },
  quantityStepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8FA",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#F3D5DF",
    overflow: "hidden",
  },
  quantityStepperDisabled: {
    opacity: 0.5,
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  quantityBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBtnDisabled: {
    opacity: 0.35,
  },
  quantityDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#F3D5DF",
  },
  quantityText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#2A1E24",
    minWidth: 36,
    textAlign: "center",
  },
  priceBreakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAF7F8",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  priceBreakdownItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  priceBreakdownDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#EBDDE2",
  },
  priceBreakdownLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10.5,
    color: "#8C7A82",
    marginBottom: 2,
  },
  priceBreakdownValue: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: "#2A1E24",
  },
  priceBreakdownTotal: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13.5,
    color: "#E64A78",
  },
  stockNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  stockNoticeText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#B45309",
    flex: 1,
  },

  /* ── Bottom Bar ── */
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#F0EAED",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 12,
  },
  bottomSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  bottomSummaryLabel: {
    flexShrink: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 12.5,
    color: "#8C7A82",
  },
  bottomSummaryTotal: {
    flexShrink: 1,
    maxWidth: "65%",
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    color: "#2A1E24",
    textAlign: "right",
  },
  bottomButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  addToCartBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF0F4",
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "#E64A78",
  },
  addToCartBtnDisabled: {
    borderColor: "#F0EAED",
    backgroundColor: "#FAF7F8",
  },
  addToCartText: {
    flexShrink: 1,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#E64A78",
  },
  addToCartTextDisabled: {
    color: "#9E8E93",
  },
  removeFromCartBtn: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
  },
  removeFromCartText: {
    color: "#EF4444",
  },
  buyNowBtn: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E64A78",
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 12,
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
    flexShrink: 1,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },

  /* ── Size Selector ── */
  sizeSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#F0EAED",
    marginBottom: 16,
  },
  sizeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sizeHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sizeSectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14.5,
    color: "#2A1E24",
  },
  selectedSizeIndicator: {
    backgroundColor: "#FFF0F4",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FAD2DE",
  },
  selectedSizeIndicatorLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#8C7A82",
  },
  selectedSizeIndicatorValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 11,
    color: "#E64A78",
  },
  inCartIndicatorText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#27A462",
  },
  sizesPillsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
    paddingRight: 10,
  },
  sizeChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  sizeChipSelected: {
    borderColor: "#E64A78",
    backgroundColor: "#E64A78",
    shadowColor: "#E64A78",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  sizeCheckIcon: {
    marginRight: 4,
  },
  sizeChipText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#374151",
  },
  sizeChipTextSelected: {
    color: "#FFFFFF",
  },
  sizeCartDot: {
    marginLeft: 5,
    backgroundColor: "#FFE4EC",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FBD5E1",
  },
  sizeCartDotChosen: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  sizeCartDotText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 10,
    color: "#E64A78",
    lineHeight: 12,
  },
  sizeCartDotTextChosen: {
    color: "#E64A78",
  },
});
