import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import orderService from '../services/orderService';
import walletService from '../services/walletService';
import storageService from '../services/storageService';
import { useCart } from '../contexts/CartContext';
import { showAlert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CheckoutReviewScreen({ route, navigation }) {
  const {
    isBuyNow = false,
    productId = null,
    quantity = 1,
    selectedSize = null,
    size = null,
    pendingOrderId = null,
    pendingOrderIds = null,
  } = route?.params || {};
  const chosenSize = selectedSize || size || null;

  const { fetchCart } = useCart();
  const { user, refreshProfile } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'address' | 'cart' | 'stock' | 'general'

  // Review data from place_order response
  const [storedOrderIds, setStoredOrderIds] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [orderSummary, setOrderSummary] = useState(null);
  const [shippingAddresses, setShippingAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [walletInfo, setWalletInfo] = useState(null);

  // Address picker modal
  const [addressModalVisible, setAddressModalVisible] = useState(false);

  // Payment processing state (double-tap protection)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const isPayingRef = useRef(false);

  // ─────────────────────────────────────────
  // Fetch / Refresh Checkout Review
  // ─────────────────────────────────────────
  const loadReviewData = useCallback(
    async (overrideAddressId = null) => {
      setLoading(true);
      setErrorMessage(null);
      setErrorType(null);

      try {
        // If resuming a pending order from My Orders list
        if (pendingOrderId || (pendingOrderIds && pendingOrderIds.length > 0)) {
          const targetId = pendingOrderId || pendingOrderIds[0];
          const [detailsRes, walletRes] = await Promise.all([
            orderService.getOrderDetails(targetId),
            walletService.getWalletBalance(),
          ]);

          if (detailsRes.success && detailsRes.data) {
            const ord = detailsRes.data;

            // Check if already paid or no longer pending
            const isAlreadyPaid = Boolean(ord.is_paid || (ord.status && ord.status.toLowerCase() !== 'pending'));
            if (isAlreadyPaid) {
              setErrorMessage(`Payment has already been completed for Order #${ord.id}.`);
              setErrorType('already_paid');
              setStoredOrderIds([Number(ord.id)]);
              setLineItems([]);
              return;
            }

            const targetIds = pendingOrderIds || [Number(targetId)];
            setStoredOrderIds(targetIds);

            setLineItems([
              {
                order_id: ord.id,
                product_id: ord.product_id,
                product_name: ord.product_name,
                product_image: ord.product_image,
                unit_price: ord.product_price || ord.amount / (ord.quantity || 1),
                quantity: ord.quantity,
                size: ord.size || null,
                line_total: ord.amount,
              },
            ]);

            setOrderSummary({
              total_items: 1,
              total_quantity: ord.quantity,
              subtotal: ord.amount,
              delivery_charge: 0,
              discount: 0,
              total_payable_amount: ord.amount,
            });

            setSelectedAddress(ord.shipping_address || null);

            const curBalance = walletRes.success ? Number(walletRes.balance || 0) : Number(user?.wallet_balance || 0);
            const totalPay = Number(ord.amount || 0);
            const isSufficient = curBalance >= totalPay;
            const deficit = isSufficient ? 0 : Math.round((totalPay - curBalance) * 100) / 100;

            setWalletInfo({
              current_wallet_balance: curBalance,
              order_total: totalPay,
              is_wallet_sufficient: isSufficient,
              balance_after_payment: isSufficient ? curBalance - totalPay : 0,
              wallet_deficit: deficit,
              message: isSufficient
                ? `Wallet balance is sufficient. Confirming will deduct ₹${totalPay.toFixed(2)}.`
                : `Insufficient wallet balance. You need ₹${deficit.toFixed(2)} more. Please add funds.`,
            });
            return;
          } else {
            setErrorMessage(detailsRes.message || 'Unable to load pending order details.');
            setErrorType('general');
            return;
          }
        }

        // Standard place_order review flow in preview mode (Buy Now or Cart) - no orders inserted into DB
        const payload = {
          preview: 1,
        };
        if (isBuyNow && productId) {
          payload.product_id = productId;
          payload.quantity = quantity || 1;
          if (chosenSize) {
            payload.size = chosenSize;
          }
        }
        if (overrideAddressId !== null && overrideAddressId !== undefined) {
          payload.address_id = overrideAddressId;
        } else if (selectedAddress?.id) {
          payload.address_id = selectedAddress.id;
        }

        const res = await orderService.placeOrder(payload);

        if (res.success && res.data) {
          const d = res.data;
          setStoredOrderIds(d.order_ids || (d.order_id ? [d.order_id] : []));
          setLineItems(d.line_items || []);
          setOrderSummary(d.order_summary || null);
          setShippingAddresses(d.shipping_addresses || []);
          setSelectedAddress(d.selected_address || null);

          // Deduct pending withdrawal holds so checkout cannot use pending withdrawal funds
          if (d.wallet_info) {
            const pendingAmt = await storageService.getPendingWithdrawAmount().catch(() => 0);
            if (pendingAmt > 0) {
              const rawBal = Number(d.wallet_info.current_wallet_balance || 0);
              const availBal = Math.max(0, rawBal - pendingAmt);
              const ordTotal = Number(d.wallet_info.order_total || 0);
              const isSuff = availBal >= ordTotal;
              const def = isSuff ? 0 : Math.round((ordTotal - availBal) * 100) / 100;
              d.wallet_info.current_wallet_balance = availBal;
              d.wallet_info.is_wallet_sufficient = isSuff;
              d.wallet_info.balance_after_payment = isSuff ? availBal - ordTotal : 0;
              d.wallet_info.wallet_deficit = def;
              d.wallet_info.message = isSuff
                ? `Wallet balance is sufficient. Confirming will deduct ₹${ordTotal.toFixed(2)}.`
                : `Insufficient wallet balance. You need ₹${def.toFixed(2)} more. Please add funds.`;
            }
          }

          setWalletInfo(d.wallet_info || null);
        } else {
          // Exact API error message handling
          const msg = res.message || 'Unable to prepare order review.';
          setErrorMessage(msg);

          const lowerMsg = msg.toLowerCase();
          if (lowerMsg.includes('address')) {
            setErrorType('address');
          } else if (lowerMsg.includes('cart is empty') || lowerMsg.includes('cart')) {
            setErrorType('cart');
          } else if (lowerMsg.includes('stock') || lowerMsg.includes('units left')) {
            setErrorType('stock');
          } else {
            setErrorType('general');
          }
        }
      } catch (err) {
        console.error('Checkout review load error:', err);
        setErrorMessage(err.message || 'Network request failed. Please try again.');
        setErrorType('general');
      } finally {
        setLoading(false);
      }
    },
    [isBuyNow, productId, quantity, pendingOrderId, pendingOrderIds, selectedAddress?.id, user?.wallet_balance]
  );

  // Load review on mount or screen focus
  useFocusEffect(
    useCallback(() => {
      loadReviewData();
    }, [loadReviewData])
  );

  // Address selection handler
  const handleSelectAddress = async (addr) => {
    setSelectedAddress(addr);
    setAddressModalVisible(false);
    // Refresh review with new address_id
    await loadReviewData(addr.id);
  };

  // ─────────────────────────────────────────
  // Confirm & Pay (verify_order_payment)
  // ─────────────────────────────────────────
  const handleConfirmAndPay = async () => {
    // Prevent double taps immediately
    if (isPayingRef.current || isProcessingPayment) {
      return;
    }

    if (!selectedAddress?.id) {
      showAlert({
        title: 'Address Required',
        message: 'Please select or add a delivery address to proceed with your order.',
        type: 'warning',
      });
      return;
    }

    if (!walletInfo?.is_wallet_sufficient) {
      showAlert({
        title: 'Insufficient Balance',
        message: walletInfo?.message || 'Your wallet does not have enough balance to complete this purchase.',
        type: 'warning',
      });
      return;
    }

    isPayingRef.current = true;
    setIsProcessingPayment(true);

    try {
      // 1. Resuming payment for an existing pending order from My Orders
      if (pendingOrderId || (pendingOrderIds && pendingOrderIds.length > 0)) {
        const targetIds = pendingOrderIds || [pendingOrderId];
        const res = await orderService.verifyOrderPayment(targetIds);

        if (res.success && res.data) {
          await Promise.allSettled([
            fetchCart(),
            refreshProfile(),
          ]);

          const verifiedData = res.data;
          const totalPaid = verifiedData.total_amount_paid ?? orderSummary?.total_payable_amount ?? 0;
          const newBalance = verifiedData.buyer_updated_balance ?? walletInfo?.balance_after_payment ?? 0;

          navigation.replace('OrderPlaced', {
            orderIds: targetIds,
            totalAmountPaid: totalPaid,
            newWalletBalance: newBalance,
            orders: verifiedData.orders || [],
          });
          return;
        } else {
          showAlert({
            title: 'Payment Failed',
            message: res.message || 'Payment verification failed.',
            type: 'error',
          });
          return;
        }
      }

      // 2. Direct atomic order placement & immediate wallet payment with stock deduction
      const placePayload = {
        address_id: selectedAddress.id,
        payment_method: 'wallet',
        pay_now: 1,
        preview: 0,
      };
      if (isBuyNow && productId) {
        placePayload.product_id = productId;
        placePayload.quantity = quantity || 1;
        if (chosenSize) {
          placePayload.size = chosenSize;
        }
      }

      const placeRes = await orderService.placeOrder(placePayload);

      if (placeRes.success && placeRes.data) {
        await Promise.allSettled([
          fetchCart(),
          refreshProfile(),
        ]);

        const verifiedData = placeRes.data;
        const totalPaid = verifiedData.total_amount_paid ?? orderSummary?.total_payable_amount ?? 0;
        const newBalance = verifiedData.buyer_updated_balance ?? walletInfo?.balance_after_payment ?? 0;
        const finalOrderIds = placeRes.order_ids || (verifiedData.order_id ? [verifiedData.order_id] : (storedOrderIds || []));

        // Navigate to Order Placed Success Screen
        navigation.replace('OrderPlaced', {
          orderIds: finalOrderIds,
          totalAmountPaid: totalPaid,
          newWalletBalance: newBalance,
          orders: verifiedData.orders || (verifiedData.order ? [verifiedData.order] : []),
        });
      } else {
        const failMessage = placeRes.message || 'Order placement failed.';
        showAlert({
          title: 'Order Placement Failed',
          message: failMessage,
          type: 'error',
        });
      }
    } catch (err) {
      console.warn('Payment verification error notice:', err.message);
      showAlert({
        title: 'Error',
        message: err.message || 'Payment could not be verified.',
        type: 'error',
      });
    } finally {
      isPayingRef.current = false;
      setIsProcessingPayment(false);
    }
  };

  // ─────────────────────────────────────────
  // Render Loading State
  // ─────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Header title="Checkout Review" showBack={true} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E64A78" />
          <Text style={styles.loadingText}>Preparing your order review...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────
  // Render Inline Error State (Empty cart, no address, stock issues)
  // ─────────────────────────────────────────
  if (errorMessage && (!lineItems || lineItems.length === 0)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Header title="Checkout Review" showBack={true} />
        <View style={styles.errorScreenContainer}>
          <View style={[styles.errorScreenIconBox, errorType === 'already_paid' && { backgroundColor: '#DCFCE7' }]}>
            <Ionicons
              name={
                errorType === 'already_paid'
                  ? 'checkmark-circle-outline'
                  : errorType === 'address'
                  ? 'location-outline'
                  : errorType === 'cart'
                  ? 'cart-outline'
                  : 'alert-circle-outline'
              }
              size={54}
              color={errorType === 'already_paid' ? '#16A34A' : '#DC2626'}
            />
          </View>
          <Text style={styles.errorScreenTitle}>
            {errorType === 'already_paid'
              ? 'Order Already Paid'
              : errorType === 'address'
              ? 'Shipping Address Required'
              : errorType === 'cart'
              ? 'Cart Is Empty'
              : 'Notice'}
          </Text>
          <Text style={styles.errorScreenMsg}>{errorMessage}</Text>

          {errorType === 'already_paid' ? (
            <View style={{ gap: 10, width: '100%', alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.errorActionBtn, { backgroundColor: '#16A34A' }]}
                activeOpacity={0.8}
                onPress={() => {
                  const targetId = storedOrderIds[0] || pendingOrderId;
                  if (targetId) {
                    navigation.replace('OrderDetails', { orderId: targetId });
                  } else {
                    navigation.replace('Orders');
                  }
                }}
              >
                <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />
                <Text style={styles.errorActionBtnText}>View Order Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.errorActionBtn, { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#16A34A' }]}
                activeOpacity={0.8}
                onPress={() => navigation.replace('Orders')}
              >
                <Text style={[styles.errorActionBtnText, { color: '#16A34A' }]}>Back to My Orders</Text>
              </TouchableOpacity>
            </View>
          ) : errorType === 'address' ? (
            <TouchableOpacity
              style={styles.errorActionBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Addresses')}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.errorActionBtnText}>Add Shipping Address</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.errorActionBtn}
              activeOpacity={0.8}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              <Text style={styles.errorActionBtnText}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const isWalletSufficient = Boolean(walletInfo?.is_wallet_sufficient);
  const deficitAmount = walletInfo?.wallet_deficit || 0;
  const currentBalance = walletInfo?.current_wallet_balance || 0;
  const totalPayable = orderSummary?.total_payable_amount || 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title="Checkout Review" showBack={true} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Inline API Error Notice (if partial error or warning) */}
        {errorMessage ? (
          <View style={styles.inlineWarningBanner}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.inlineWarningText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* 1. Delivery Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="location" size={18} color="#E64A78" />
              <Text style={styles.cardTitle}>Shipping Address</Text>
            </View>
            <TouchableOpacity
              style={styles.changeAddressBtn}
              onPress={() => {
                if (shippingAddresses.length > 0) {
                  setAddressModalVisible(true);
                } else {
                  navigation.navigate('Addresses');
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.changeAddressText}>
                {shippingAddresses.length > 1 ? 'Change' : 'Manage'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#E64A78" />
            </TouchableOpacity>
          </View>

          {selectedAddress ? (
            <View style={styles.addressBox}>
              <View style={styles.addressNameRow}>
                <Text style={styles.addressName}>{selectedAddress.full_name}</Text>
                {selectedAddress.is_default ? (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.addressPhone}>Mobile: {selectedAddress.mobile}</Text>
              <Text style={styles.addressStreet}>
                {[selectedAddress.address_line1, selectedAddress.address_line2, selectedAddress.landmark]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
              <Text style={styles.addressCity}>
                {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.noAddressBox}
              onPress={() => {
                if (shippingAddresses && shippingAddresses.length > 0) {
                  setAddressModalVisible(true);
                } else {
                  navigation.navigate('Addresses');
                }
              }}
              activeOpacity={0.8}
            >
              <View style={styles.noAddressIconBox}>
                <Ionicons name="add-circle" size={24} color="#E64A78" />
              </View>
              <View style={styles.noAddressTextBox}>
                <Text style={styles.noAddressTitle}>
                  {shippingAddresses && shippingAddresses.length > 0
                    ? 'No shipping address selected'
                    : 'No shipping address found'}
                </Text>
                <Text style={styles.noAddressSub}>
                  {shippingAddresses && shippingAddresses.length > 0
                    ? 'Tap to select or add address'
                    : 'Tap to add delivery address'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#E64A78" />
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Line Items Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="bag-handle" size={18} color="#E64A78" />
              <Text style={styles.cardTitle}>Order Items ({lineItems.length})</Text>
            </View>
          </View>

          {lineItems.map((item, index) => (
            <View key={`${item.product_id}-${index}`} style={styles.lineItem}>
              <View style={styles.itemThumbnailBox}>
                {item.product_image ? (
                  <Image
                    source={{ uri: item.product_image }}
                    style={styles.itemThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.fallbackThumbnail}>
                    <Ionicons name="cube-outline" size={24} color="#C4B8BC" />
                  </View>
                )}
              </View>

              <View style={styles.itemInfoCol}>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.product_name}
                </Text>
                <View style={styles.itemMetaRow}>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                  {item.size ? (
                    <View style={styles.itemSizeBadge}>
                      <Ionicons name="shirt-outline" size={10} color="#E64A78" />
                      <Text style={styles.itemSizeBadgeText}>Size: {item.size}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.itemUnitPrice}>
                    ₹{Number(item.unit_price || 0).toLocaleString('en-IN')} each
                  </Text>
                </View>
              </View>

              <View style={styles.itemTotalCol}>
                <Text style={styles.itemLineTotal}>
                  ₹{Number(item.line_total || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* 3. Order Summary Card */}
        {orderSummary && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="receipt-outline" size={18} color="#E64A78" />
                <Text style={styles.cardTitle}>Price Details</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Subtotal ({orderSummary.total_quantity || lineItems.length} items)
              </Text>
              <Text style={styles.summaryValue}>
                ₹{Number(orderSummary.subtotal || 0).toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Charges</Text>
              <Text style={[styles.summaryValue, { color: '#E64A78', fontWeight: '600' }]}>
                {orderSummary.delivery_charge > 0 ? `₹${orderSummary.delivery_charge}` : 'As per order'}
              </Text>
            </View>

            {orderSummary.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
                  -₹{orderSummary.discount}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalPayableLabel}>Total Payable Amount</Text>
              <Text style={styles.totalPayableValue}>
                ₹{Number(orderSummary.total_payable_amount || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        )}

        {/* 4. Wallet Balance & Sufficiency Preview */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="wallet-outline" size={18} color="#E64A78" />
              <Text style={styles.cardTitle}>Payment: Divy Shakti Wallet</Text>
            </View>
          </View>

          <View style={styles.walletPreviewBox}>
            <View style={styles.walletBalanceRow}>
              <Text style={styles.walletBalanceLabel}>Available Wallet Balance</Text>
              <Text style={styles.walletBalanceValue}>
                ₹{Number(currentBalance).toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.walletBalanceRow}>
              <Text style={styles.walletBalanceLabel}>Order Amount</Text>
              <Text style={styles.walletDeductValue}>
                -₹{Number(totalPayable).toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.walletDivider} />

            {isWalletSufficient ? (
              <View style={styles.walletSufficiencyBox}>
                <View style={styles.sufficientRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                  <Text style={styles.sufficientText}>
                    Remaining balance after payment: ₹
                    {Number(walletInfo?.balance_after_payment || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <Text style={styles.sufficientNote}>
                  Funds will be automatically deducted upon tapping Confirm & Pay.
                </Text>
              </View>
            ) : (
              <View style={styles.deficitBox}>
                <View style={styles.deficitHeaderRow}>
                  <Ionicons name="warning" size={18} color="#D97706" />
                  <Text style={styles.deficitTitle}>Insufficient Wallet Balance</Text>
                </View>
                <Text style={styles.deficitMessage}>
                  You need ₹{Number(deficitAmount).toLocaleString('en-IN')} more to complete this order.
                </Text>
                <TouchableOpacity
                  style={styles.addMoneyBtn}
                  onPress={() => navigation.navigate('Wallet')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.addMoneyBtnText}>
                    Add ₹{Math.ceil(deficitAmount)} to Wallet
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceLabel}>Total Amount</Text>
          <Text style={styles.bottomPriceValue}>
            ₹{Number(totalPayable).toLocaleString('en-IN')}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (!isWalletSufficient || isProcessingPayment || !selectedAddress) && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirmAndPay}
          disabled={!isWalletSufficient || isProcessingPayment || !selectedAddress}
          activeOpacity={0.85}
        >
          {isProcessingPayment ? (
            <View style={styles.processingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Processing Payment...</Text>
            </View>
          ) : (
            <View style={styles.processingRow}>
              <Text style={styles.confirmBtnText}>
                {isWalletSufficient ? 'Confirm & Pay' : 'Add Funds to Pay'}
              </Text>
              <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Address Switcher Modal */}
      <Modal
        visible={addressModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Delivery Address</Text>
              <TouchableOpacity
                onPress={() => setAddressModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#2A1E24" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {shippingAddresses.map((addr) => {
                const isSelected = selectedAddress?.id === addr.id;
                return (
                  <TouchableOpacity
                    key={addr.id}
                    style={[styles.modalAddrCard, isSelected && styles.modalAddrCardSelected]}
                    onPress={() => handleSelectAddress(addr)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalAddrRadio}>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={isSelected ? '#E64A78' : '#C4B8BC'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalAddrName}>{addr.full_name}</Text>
                      <Text style={styles.modalAddrPhone}>Mobile: {addr.mobile}</Text>
                      <Text style={styles.modalAddrText} numberOfLines={2}>
                        {[addr.address_line1, addr.address_line2, addr.city, addr.state, addr.pincode]
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalAddBtn}
              onPress={() => {
                setAddressModalVisible(false);
                navigation.navigate('Addresses');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#E64A78" />
              <Text style={styles.modalAddBtnText}>Add New Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF7F8',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#7A6E74',
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0E6E9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A1E24',
  },
  changeAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeAddressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E64A78',
  },
  addressBox: {
    backgroundColor: '#FDFBFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3EDEF',
  },
  addressNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  addressName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A1E24',
  },
  defaultBadge: {
    backgroundColor: '#FDE2E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E64A78',
  },
  addressPhone: {
    fontSize: 13,
    color: '#55484E',
    marginBottom: 4,
  },
  addressStreet: {
    fontSize: 13,
    color: '#7A6E74',
    lineHeight: 18,
  },
  addressCity: {
    fontSize: 13,
    color: '#7A6E74',
    marginTop: 2,
  },
  noAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FFF1F4',
    borderWidth: 1,
    borderColor: '#FCD8E1',
  },
  noAddressIconBox: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAddressTextBox: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 6,
  },
  noAddressTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#E64A78',
    marginBottom: 2,
  },
  noAddressSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9E3C62',
    lineHeight: 16,
  },
  noAddressText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#E64A78',
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECEF',
  },
  itemThumbnailBox: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#F7EFF1',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemThumbnail: {
    width: '100%',
    height: '100%',
  },
  fallbackThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfoCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A1E24',
    lineHeight: 18,
    marginBottom: 4,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemQty: {
    fontSize: 12,
    color: '#7A6E74',
    fontWeight: '500',
  },
  itemUnitPrice: {
    fontSize: 12,
    color: '#7A6E74',
  },
  itemTotalCol: {
    alignItems: 'flex-end',
  },
  itemLineTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A1E24',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#7A6E74',
  },
  summaryValue: {
    fontSize: 13,
    color: '#2A1E24',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0E6E9',
    marginVertical: 10,
  },
  totalPayableLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A1E24',
  },
  totalPayableValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E64A78',
  },
  walletPreviewBox: {
    backgroundColor: '#FDFBFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F4ECEE',
  },
  walletBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  walletBalanceLabel: {
    fontSize: 13,
    color: '#55484E',
  },
  walletBalanceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A1E24',
  },
  walletDeductValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  walletDivider: {
    height: 1,
    backgroundColor: '#F0E6E9',
    marginVertical: 8,
  },
  walletSufficiencyBox: {
    marginTop: 4,
  },
  sufficientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sufficientText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  sufficientNote: {
    fontSize: 11,
    color: '#7A6E74',
    marginTop: 4,
  },
  deficitBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 4,
  },
  deficitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  deficitTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  deficitMessage: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
    marginBottom: 10,
  },
  addMoneyBtn: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addMoneyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inlineWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  inlineWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0E6E9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomPriceCol: {
    justifyContent: 'center',
  },
  bottomPriceLabel: {
    fontSize: 11,
    color: '#7A6E74',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  bottomPriceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#E64A78',
  },
  confirmBtn: {
    backgroundColor: '#E64A78',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 160,
  },
  confirmBtnDisabled: {
    backgroundColor: '#A8A29E',
    opacity: 0.6,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorScreenIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorScreenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A1E24',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorScreenMsg: {
    fontSize: 14,
    color: '#7A6E74',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 300,
  },
  errorActionBtn: {
    backgroundColor: '#E64A78',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  errorActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A1E24',
  },
  modalAddrCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0E6E9',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  modalAddrCardSelected: {
    borderColor: '#E64A78',
    backgroundColor: '#FFF9FA',
  },
  modalAddrRadio: {
    marginTop: 2,
  },
  modalAddrName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A1E24',
    marginBottom: 2,
  },
  modalAddrPhone: {
    fontSize: 12,
    color: '#55484E',
    marginBottom: 2,
  },
  modalAddrText: {
    fontSize: 12,
    color: '#7A6E74',
    lineHeight: 16,
  },
  modalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E64A78',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  modalAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E64A78',
  },
  itemSizeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FBD5E1',
  },
  itemSizeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E64A78',
  },
});
