import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import CheckoutModal from '../components/CheckoutModal';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { showAlert } from '../contexts/AlertContext';

export default function CartScreen({ navigation }) {
  const {
    cartItems,
    loading,
    fetchCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartCount,
  } = useCart();
  const { user, refreshProfile } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // Profile Incomplete Modal State
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileCompletionPct, setProfileCompletionPct] = useState(0);
  const [missingFields, setMissingFields] = useState([]);
  const [isProfileUnderReview, setIsProfileUnderReview] = useState(false);
  const [profileModalMessage, setProfileModalMessage] = useState('');

  // Checkout Modal State
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  // Silently refresh profile whenever user focuses on Cart screen
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
      fetchCart(),
      refreshProfile ? refreshProfile() : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [fetchCart, refreshProfile]);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      showAlert({
        title: 'Cart Empty',
        message: 'Please add items to your cart first.',
        type: 'warning',
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

    // Check profile completion (100% required & active required)
    const actualPct = Number(currentUser?.profile_completion_percentage ?? 0);
    const missingList = Array.isArray(currentUser?.missing_fields) ? currentUser.missing_fields : [];
    const hasMissing = missingList.length > 0;
    const isProfileComplete = (currentUser?.is_profile_completed === true || actualPct >= 100) && !hasMissing && actualPct >= 100;

    if (currentUser && (!isProfileComplete || actualPct < 100 || hasMissing)) {
      setProfileCompletionPct(actualPct < 100 ? actualPct : (hasMissing ? 99 : actualPct));
      setMissingFields(missingList);
      setIsProfileUnderReview(false);
      setProfileModalMessage('');
      setProfileModalVisible(true);
      return;
    }

    if (currentUser && isProfileComplete && (currentUser.is_profile_active === false || currentUser.is_profile_active === 0)) {
      setProfileCompletionPct(100);
      setMissingFields([]);
      setIsProfileUnderReview(true);
      setProfileModalMessage(
        'Your profile is 100% complete and submitted for review. Please wait for admin to activate your profile before adding items to cart or purchasing products.'
      );
      setProfileModalVisible(true);
      return;
    }

    navigation.navigate('CheckoutReview', {
      isBuyNow: false,
    });
  };

  const handleUpdateQty = async (item, newQty) => {
    const uniqueKey = item.cart_id || `${item.product_id}_${item.size || ''}`;
    setUpdatingId(uniqueKey);
    try {
      const res = await updateQuantity(item.cart_id, newQty, item.size, item.product_id);
      if (!res.success && res.message) {
        showAlert({
          title: 'Notice',
          message: res.message,
          type: 'info',
        });
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = (item) => {
    const uniqueKey = item.cart_id || `${item.product_id}_${item.size || ''}`;
    const sizeNote = item.size ? ` (Size: ${item.size})` : '';
    showAlert({
      title: 'Remove Item',
      message: `Remove ${item.name || item.product_name}${sizeNote} from your cart?`,
      type: 'confirm',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUpdatingId(uniqueKey);
            try {
              await removeFromCart(item.cart_id, item.product_id, item.size);
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ],
    });
  };

  if (loading && cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="Shopping Cart" showBack={true} />
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#E64A78" />
          <Text style={styles.loaderText}>Loading your cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="Shopping Cart" showBack={true} />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="bag-outline" size={70} color="#E64A78" />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Add some products to get started!</Text>
          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Shop' })}
            activeOpacity={0.8}
          >
            <Ionicons name="storefront-outline" size={18} color="#FFFFFF" />
            <Text style={styles.shopNowText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const subtotal = getCartTotal();
  const finalTotal = subtotal;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Shopping Cart" showBack={true} />

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
        {/* Profile Warning Banner if < 100% */}
        {user &&
          user.profile_completion_percentage !== undefined &&
          Number(user.profile_completion_percentage) < 100 && (
            <TouchableOpacity
              style={styles.profileWarningCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Profile')}
            >
              <View style={styles.warningIconCircle}>
                <Ionicons name="shield-alert" size={20} color="#DC2626" />
              </View>
              <View style={styles.warningTextCol}>
                <Text style={styles.warningTitle}>
                  Profile {user.profile_completion_percentage || 0}% Complete
                </Text>
                <Text style={styles.warningDesc}>
                  100% profile is required to checkout. Tap to complete.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#DC2626" />
            </TouchableOpacity>
          )}

        {/* Cart Items */}
        {cartItems.map((item, index) => {
          const uniqueKey = item.cart_id ? `cart-${item.cart_id}` : `prod-${item.product_id}-${item.size || 'nosize'}-${index}`;
          const isItemUpdating = updatingId === (item.cart_id || `${item.product_id}_${item.size || ''}`);
          const formattedPrice =
            typeof item.price === 'number'
              ? `₹${item.price.toLocaleString('en-IN')}`
              : String(item.price).startsWith('₹')
              ? item.price
              : `₹${item.price}`;

          return (
            <View key={uniqueKey} style={styles.cartItem}>
              {/* Product Thumbnail */}
              <View style={styles.itemImage}>
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.thumbImg}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.fallbackIcon}>
                    <Ionicons name="bag" size={28} color="#E64A78" />
                  </View>
                )}
              </View>

              {/* Product Info */}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name || item.product_name}
                </Text>
                <Text style={styles.itemPrice}>{formattedPrice}</Text>
                {item.size ? (
                  <View style={styles.sizeBadge}>
                    <Ionicons name="shirt-outline" size={12} color="#E64A78" />
                    <Text style={styles.sizeBadgeText}>Size: {item.size}</Text>
                  </View>
                ) : null}
                {item.product_stock !== undefined && (
                  <Text style={styles.stockHint}>
                    {item.product_stock > 0 ? `${item.product_stock} in stock` : 'Out of stock'}
                  </Text>
                )}
              </View>

              {/* Actions: Delete & Quantity */}
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveItem(item)}
                  activeOpacity={0.7}
                  disabled={isItemUpdating}
                >
                  <Ionicons name="trash-outline" size={16} color="#E64A78" />
                </TouchableOpacity>

                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => handleUpdateQty(item, item.quantity - 1)}
                    activeOpacity={0.7}
                    disabled={isItemUpdating}
                  >
                    <Ionicons name="remove" size={14} color="#2A1E24" />
                  </TouchableOpacity>

                  <Text style={styles.qtyText}>
                    {isItemUpdating ? '...' : item.quantity}
                  </Text>

                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => handleUpdateQty(item, item.quantity + 1)}
                    activeOpacity={0.7}
                    disabled={isItemUpdating}
                  >
                    <Ionicons name="add" size={14} color="#2A1E24" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {/* Price Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Price Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({getCartCount()} items)</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Charges</Text>
            <Text style={[styles.summaryValue, { color: '#E64A78', fontWeight: '600' }]}>As per order</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{finalTotal.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Checkout Bar */}
      <View style={styles.checkoutBar}>
        <View style={styles.checkoutLeft}>
          <Text style={styles.checkoutLabel}>Total</Text>
          <Text style={styles.checkoutPrice}>₹{finalTotal.toLocaleString('en-IN')}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={handleCheckout}
          activeOpacity={0.8}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Checkout Modal */}
      <CheckoutModal
        visible={checkoutVisible}
        onClose={() => setCheckoutVisible(false)}
        navigation={navigation}
        items={cartItems}
        totalAmount={finalTotal}
        isBuyNow={false}
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
  profileWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  warningIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningTextCol: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 2,
  },
  warningDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: '#991B1B',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 120,
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#9E8E93',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFF0F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(230,74,120,0.2)',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#2A1E24',
    marginBottom: 6,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13.5,
    color: '#9E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  shopNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E64A78',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 16,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shopNowText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0EAED',
    alignItems: 'center',
  },
  itemImage: {
    width: 68,
    height: 68,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FAF7F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  fallbackIcon: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F4',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#2A1E24',
    marginBottom: 4,
  },
  itemPrice: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#E64A78',
    marginBottom: 2,
  },
  stockHint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#27A462',
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 64,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFF0F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAF7F8',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  qtyBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#2A1E24',
    minWidth: 18,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0EAED',
    marginTop: 10,
  },
  summaryTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#2A1E24',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#9E8E93',
  },
  summaryValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#2A1E24',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F0EAED',
    marginVertical: 12,
  },
  totalLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#2A1E24',
  },
  totalValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#E64A78',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8FBF5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  savingsText: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#27A462',
  },
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0EAED',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 10,
  },
  checkoutLeft: {},
  checkoutLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#9E8E93',
  },
  checkoutPrice: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#2A1E24',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E64A78',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 16,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkoutBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  sizeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FBD5E1',
    marginTop: 4,
    marginBottom: 2,
  },
  sizeBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#E64A78',
  },
});