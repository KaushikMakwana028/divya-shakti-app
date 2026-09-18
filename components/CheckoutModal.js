import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import addressService from '../services/addressService';
import walletService from '../services/walletService';
import orderService from '../services/orderService';
import storageService from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import ProfileIncompleteModal from './ProfileIncompleteModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CheckoutModal({
  visible,
  onClose,
  navigation,
  items = [],
  totalAmount = 0,
  isBuyNow = false,
  productId = null,
  quantity = 1,
  onOrderSuccess,
}) {
  const { user, refreshProfile } = useAuth();
  const { fetchCart, clearCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectingAddress, setSelectingAddress] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);

  // Success state
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [confirmedOrders, setConfirmedOrders] = useState([]);

  // Profile incomplete alert modal
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [profilePct, setProfilePct] = useState(0);
  const [isProfileUnderReview, setIsProfileUnderReview] = useState(false);
  const [profileModalMessage, setProfileModalMessage] = useState('');

  // ─────────────────────────────────────────
  // Fetch Latest Addresses and Wallet Balance
  // ─────────────────────────────────────────
  // ─────────────────────────────────────────
  // Fetch Latest Addresses and Wallet Balance
  // ─────────────────────────────────────────
  const fetchCheckoutData = useCallback(async () => {
    setLoading(true);
    setOrderSuccess(false);
    setConfirmedOrders([]);
    setProcessing(false);
    setSelectingAddress(false);

    try {
      // 1. Try fetching from server-side /checkout API
      const checkoutRes = await orderService.getCheckout({
        product_id: isBuyNow ? productId : null,
        quantity: isBuyNow ? quantity : null,
      });

      if (checkoutRes.success && checkoutRes.data) {
        const cData = checkoutRes.data;
        const addrList = cData.shipping_addresses || [];
        setAddresses(addrList);

        if (cData.selected_address?.id) {
          setSelectedAddressId(cData.selected_address.id);
        } else if (addrList.length > 0) {
          const def = addrList.find((a) => a.is_default == 1 || a.is_default === true);
          setSelectedAddressId(def ? def.id : addrList[0].id);
        } else {
          setSelectedAddressId(null);
        }

        const wallBal = cData.wallet_payment_preview?.current_wallet_balance;
        const pendingAmt = await storageService.getPendingWithdrawAmount().catch(() => 0);
        if (wallBal !== undefined && wallBal !== null) {
          setWalletBalance(Math.max(0, Number(wallBal) - pendingAmt));
        } else if (user?.wallet_balance !== undefined) {
          setWalletBalance(Number(user.wallet_balance || 0));
        }
      } else if (checkoutRes.isProfileIncomplete || checkoutRes.isUnderReview) {
        const pct =
          checkoutRes.profileData?.profile_completion_percentage ??
          (checkoutRes.isUnderReview ? 100 : 0);
        setProfilePct(Number(pct));
        setMissingFields(checkoutRes.profileData?.missing_fields || []);
        setIsProfileUnderReview(Boolean(checkoutRes.isUnderReview || Number(pct) >= 100));
        setProfileModalMessage(checkoutRes.message || '');
        setProfileModalVisible(true);
      } else {
        // Fallback to addressService & walletService
        const addrRes = await addressService.getAddresses();
        const addrList = addrRes.success ? addrRes.addresses || [] : [];
        setAddresses(addrList);

        if (addrList.length > 0) {
          const def = addrList.find((a) => a.is_default == 1 || a.is_default === true);
          setSelectedAddressId(def ? def.id : addrList[0].id);
        } else {
          setSelectedAddressId(null);
        }

        const wallRes = await walletService.getWalletBalance();
        if (wallRes.success) {
          setWalletBalance(Number(wallRes.balance || 0));
        } else if (user?.wallet_balance !== undefined) {
          setWalletBalance(Number(user.wallet_balance || 0));
        }
      }
    } catch (err) {
      console.error('fetchCheckoutData error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isBuyNow, productId, quantity]);

  useEffect(() => {
    if (visible) {
      fetchCheckoutData();
    }
  }, [visible, fetchCheckoutData]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const numericTotal = Number(totalAmount || 0);
  const hasSufficientBalance = walletBalance >= numericTotal;
  const shortfall = Math.max(0, numericTotal - walletBalance);
  const remainingBalance = Math.max(0, walletBalance - numericTotal);

  // ─────────────────────────────────────────
  // Process Checkout & Payment
  // ─────────────────────────────────────────
  const handleConfirmOrder = async () => {
    // 1. Address Validation
    if (!selectedAddressId) {
      Alert.alert(
        'Address Required',
        'Please add or select a delivery address to proceed with your order.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Address',
            onPress: () => {
              onClose();
              navigation?.navigate('Addresses');
            },
          },
        ]
      );
      return;
    }

    // 2. Wallet Balance Validation
    if (!hasSufficientBalance) {
      Alert.alert(
        'Insufficient Wallet Balance',
        `Your wallet balance (₹${walletBalance.toLocaleString('en-IN')}) is insufficient for this order (₹${numericTotal.toLocaleString('en-IN')}).\n\nPlease add ₹${shortfall.toLocaleString('en-IN')} to your wallet.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Money',
            onPress: () => {
              onClose();
              navigation?.navigate('Wallet');
            },
          },
        ]
      );
      return;
    }

    // 3. Begin Order Placement (Immediate Wallet Payment)
    setProcessing(true);
    setProcessingStep('Placing your order and processing wallet payment...');

    try {
      const placePayload = {
        address_id: selectedAddressId,
        payment_method: 'wallet',
        pay_now: 1,
      };

      if (isBuyNow && productId) {
        placePayload.product_id = productId;
        placePayload.quantity = quantity;
      }

      const placeRes = await orderService.placeOrder(placePayload);

      if (!placeRes.success) {
        if (placeRes.isUnderReview || placeRes.isProfileIncomplete) {
          const pct =
            placeRes.profileData?.profile_completion_percentage ??
            (placeRes.isUnderReview ? 100 : 0);
          setProfilePct(Number(pct));
          setMissingFields(placeRes.profileData?.missing_fields || []);
          setIsProfileUnderReview(Boolean(placeRes.isUnderReview || Number(pct) >= 100));
          setProfileModalMessage(placeRes.message || '');
          setProfileModalVisible(true);
        } else {
          Alert.alert('Order Placement Failed', placeRes.message || 'Could not place your order.');
        }
        setProcessing(false);
        return;
      }

      const placedData = placeRes.data;
      const rawData = placeRes.raw || {};
      let verifiedResults = [];

      // If backend already completed payment via wallet in place_order (is_paid === true)
      if (placeRes.is_paid || rawData.is_paid || placedData?.is_paid) {
        if (Array.isArray(placedData) && placedData.length > 0) {
          verifiedResults = placedData;
        } else if (Array.isArray(placedData?.orders) && placedData.orders.length > 0) {
          verifiedResults = placedData.orders;
        } else if (Array.isArray(rawData.orders) && rawData.orders.length > 0) {
          verifiedResults = rawData.orders;
        } else if (placedData && typeof placedData === 'object' && placedData.id) {
          verifiedResults = [placedData];
        } else if (rawData.order && typeof rawData.order === 'object' && rawData.order.id) {
          verifiedResults = [rawData.order];
        } else if (Array.isArray(rawData.order_ids) && rawData.order_ids.length > 0) {
          verifiedResults = rawData.order_ids.map((id) => ({ id, status: 'placed', is_paid: true }));
        } else if (Array.isArray(placedData?.order_ids) && placedData.order_ids.length > 0) {
          verifiedResults = placedData.order_ids.map((id) => ({ id, status: 'placed', is_paid: true }));
        }
      } else {
        // Fallback: If order was created unpaid, verify payment via /verify_order_payment
        setProcessingStep('Verifying wallet payment & confirming...');

        const orderIdsToVerify = [];
        if (Array.isArray(rawData?.order_ids)) {
          orderIdsToVerify.push(...rawData.order_ids);
        } else if (Array.isArray(placedData?.order_ids)) {
          orderIdsToVerify.push(...placedData.order_ids);
        } else if (Array.isArray(placedData)) {
          placedData.forEach((ord) => {
            if (ord?.id) orderIdsToVerify.push(ord.id);
          });
        } else if (Array.isArray(rawData.orders)) {
          rawData.orders.forEach((ord) => {
            if (ord?.id) orderIdsToVerify.push(ord.id);
          });
        } else if (rawData.order?.id) {
          orderIdsToVerify.push(rawData.order.id);
        } else if (placedData && placedData.id) {
          orderIdsToVerify.push(placedData.id);
        } else if (placedData && placedData.order_id) {
          orderIdsToVerify.push(placedData.order_id);
        }

        for (const ordId of orderIdsToVerify) {
          const verifyRes = await (orderService.verifyOrderPayment
            ? orderService.verifyOrderPayment(ordId)
            : orderService.verifyPayment(ordId));
          if (verifyRes.success) {
            verifiedResults.push(verifyRes.data || { id: ordId, status: 'placed', is_paid: true });
          } else {
            console.warn(`Payment verification failed for order #${ordId}:`, verifyRes.message);
            verifiedResults.push({ id: ordId, status: 'placed', is_paid: false, error: verifyRes.message });
          }
        }
      }

      // 4. Update user state (Cart & Auth Wallet)
      if (!isBuyNow) {
        await clearCart();
      }
      await fetchCart();
      await refreshProfile();

      // 5. Present Order Placed Success UI
      setConfirmedOrders(verifiedResults);
      setOrderSuccess(true);
      if (onOrderSuccess) onOrderSuccess(verifiedResults);
    } catch (err) {
      console.error('Checkout error:', err);
      Alert.alert('Error', err.message || 'An unexpected error occurred during checkout.');
    } finally {
      setProcessing(false);
    }
  };

  // ─────────────────────────────────────────
  // Render Success State
  // ─────────────────────────────────────────
  if (orderSuccess) {
    const firstOrderId = confirmedOrders[0]?.id;
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheetContainer}>
            <View style={styles.successWrapper}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-sharp" size={42} color="#FFFFFF" />
              </View>

              <Text style={styles.successTitle}>Order Confirmed!</Text>
              <Text style={styles.successSub}>
                Thank you! Your payment of ₹{numericTotal.toLocaleString('en-IN')} was successfully debited from your wallet.
              </Text>

              {confirmedOrders.length > 0 && (
                <View style={styles.orderBadgeRow}>
                  <Ionicons name="receipt-outline" size={16} color="#E64A78" />
                  <Text style={styles.orderBadgeText}>
                    Order #{confirmedOrders.map((o) => o.id).join(', #')}
                  </Text>
                </View>
              )}

              {selectedAddress && (
                <View style={styles.deliverySummaryBox}>
                  <View style={styles.deliverySummaryHeader}>
                    <Ionicons name="location-outline" size={16} color="#8C7A82" />
                    <Text style={styles.deliverySummaryTitle}>Delivery to</Text>
                  </View>
                  <Text style={styles.deliverySummaryName}>{selectedAddress.full_name}</Text>
                  <Text style={styles.deliverySummaryAddr} numberOfLines={2}>
                    {selectedAddress.address_line1}, {selectedAddress.city} - {selectedAddress.pincode}
                  </Text>
                </View>
              )}

              <View style={styles.successBtnGroup}>
                {firstOrderId && (
                  <TouchableOpacity
                    style={styles.primarySuccessBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      onClose();
                      navigation?.navigate('OrderDetails', { orderId: firstOrderId });
                    }}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primarySuccessBtnText}>View Order Details</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.secondarySuccessBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    onClose();
                    navigation?.navigate('Orders');
                  }}
                >
                  <Text style={styles.secondarySuccessBtnText}>Go to My Orders</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.textSuccessBtn}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    navigation?.navigate('Main', { screen: 'Shop' });
                  }}
                >
                  <Text style={styles.textSuccessBtnText}>Continue Shopping</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ─────────────────────────────────────────
  // Render Main Checkout Sheet
  // ─────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Checkout</Text>
              <Text style={styles.sheetSub}>
                {items.length} {items.length === 1 ? 'item' : 'items'} • Complete Payment
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={processing}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#2A1E24" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#E64A78" />
              <Text style={styles.loaderText}>Preparing checkout...</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollBody}
            >
              {/* ── 1. Shipping Address Section ── */}
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="location" size={18} color="#E64A78" />
                    <Text style={styles.sectionHeading}>Shipping Address</Text>
                  </View>
                  {addresses.length > 1 && (
                    <TouchableOpacity
                      onPress={() => setSelectingAddress(!selectingAddress)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={styles.changeActionText}>
                        {selectingAddress ? 'Done' : 'Change'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {addresses.length === 0 ? (
                  <View style={styles.noAddressBox}>
                    <Ionicons name="alert-circle-outline" size={28} color="#F59E0B" />
                    <Text style={styles.noAddressTitle}>No Shipping Address Found</Text>
                    <Text style={styles.noAddressSub}>
                      Please add an address to deliver your order.
                    </Text>
                    <TouchableOpacity
                      style={styles.addAddressBtn}
                      onPress={() => {
                        onClose();
                        navigation?.navigate('Addresses');
                      }}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={styles.addAddressBtnText}>Add New Address</Text>
                    </TouchableOpacity>
                  </View>
                ) : selectingAddress ? (
                  /* Address Selection List */
                  <View style={styles.addressListContainer}>
                    {addresses.map((addr) => {
                      const isSelected = addr.id === selectedAddressId;
                      return (
                        <TouchableOpacity
                          key={addr.id}
                          style={[
                            styles.addressSelectItem,
                            isSelected && styles.addressSelectItemActive,
                          ]}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedAddressId(addr.id);
                            setSelectingAddress(false);
                          }}
                        >
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSelected ? '#E64A78' : '#8C7A82'}
                            style={{ marginTop: 2, marginRight: 10 }}
                          />
                          <View style={{ flex: 1 }}>
                            <View style={styles.addrNameBadgeRow}>
                              <Text style={styles.addrSelectName}>{addr.full_name}</Text>
                              {addr.is_default == 1 && (
                                <View style={styles.defChip}>
                                  <Text style={styles.defChipText}>Default</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.addrSelectText}>
                              {addr.address_line1}
                              {addr.address_line2 ? `, ${addr.address_line2}` : ''},{' '}
                              {addr.city} - {addr.pincode}
                            </Text>
                            <Text style={styles.addrSelectPhone}>Mobile: {addr.mobile}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      style={styles.addNewAddrRow}
                      onPress={() => {
                        onClose();
                        navigation?.navigate('Addresses');
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#E64A78" />
                      <Text style={styles.addNewAddrRowText}>Add another address</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Single Selected Address Card */
                  selectedAddress && (
                    <View style={styles.selectedAddressCard}>
                      <View style={styles.addrCardHeader}>
                        <Text style={styles.addrName}>{selectedAddress.full_name}</Text>
                        <Text style={styles.addrPhone}>+91 {selectedAddress.mobile}</Text>
                      </View>
                      <Text style={styles.addrDetails}>
                        {selectedAddress.address_line1}
                        {selectedAddress.address_line2 ? `, ${selectedAddress.address_line2}` : ''}
                        {selectedAddress.landmark ? ` (${selectedAddress.landmark})` : ''}
                      </Text>
                      <Text style={styles.addrCity}>
                        {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                      </Text>
                    </View>
                  )
                )}
              </View>

              {/* ── 2. Items Overview ── */}
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="cube-outline" size={18} color="#E64A78" />
                    <Text style={styles.sectionHeading}>Order Items</Text>
                  </View>
                  <Text style={styles.itemCountText}>
                    {items.reduce((s, i) => s + (Number(i.quantity) || 1), 0)} units
                  </Text>
                </View>

                {items.map((it, idx) => {
                  const itemPrice =
                    typeof it.price === 'number'
                      ? it.price
                      : parseInt(String(it.price || 0).replace(/[₹,]/g, '')) || 0;
                  const itemQty = Number(it.quantity) || 1;
                  const itemLineTotal = itemPrice * itemQty;

                  return (
                    <View key={it.id || idx} style={styles.itemRow}>
                      <View style={styles.itemThumb}>
                        {it.image ? (
                          <Image
                            source={{ uri: it.image }}
                            style={styles.thumbImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.fallbackThumb}>
                            <Ionicons name="bag" size={20} color="#E64A78" />
                          </View>
                        )}
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {it.name || it.product_name}
                        </Text>
                        <Text style={styles.itemQtyPrice}>
                          ₹{itemPrice.toLocaleString('en-IN')} × {itemQty}
                        </Text>
                      </View>
                      <Text style={styles.itemTotal}>
                        ₹{itemLineTotal.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* ── 3. Payment Method: Wallet ── */}
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="wallet-outline" size={18} color="#E64A78" />
                    <Text style={styles.sectionHeading}>Payment via Wallet</Text>
                  </View>
                  <View
                    style={[
                      styles.walletStatusBadge,
                      { backgroundColor: hasSufficientBalance ? '#E8F5E9' : '#FEE2E2' },
                    ]}
                  >
                    <Ionicons
                      name={hasSufficientBalance ? 'checkmark-circle' : 'close-circle'}
                      size={13}
                      color={hasSufficientBalance ? '#27A462' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.walletStatusBadgeText,
                        { color: hasSufficientBalance ? '#27A462' : '#EF4444' },
                      ]}
                    >
                      {hasSufficientBalance ? 'Sufficient' : 'Low Balance'}
                    </Text>
                  </View>
                </View>

                <View style={styles.walletCard}>
                  <View style={styles.walletBalanceRow}>
                    <Text style={styles.walletLabel}>Available Wallet Balance</Text>
                    <Text style={styles.walletAmount}>
                      ₹{walletBalance.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.walletDivider} />

                  <View style={styles.walletBalanceRow}>
                    <Text style={styles.walletLabel}>Order Total</Text>
                    <Text style={styles.walletTotalAmount}>
                      ₹{numericTotal.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  {hasSufficientBalance ? (
                    <View style={styles.remainingBalanceRow}>
                      <Text style={styles.remainingLabel}>Remaining Balance After Payment:</Text>
                      <Text style={styles.remainingValue}>
                        ₹{remainingBalance.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.shortfallBox}>
                      <View style={styles.shortfallTextCol}>
                        <Text style={styles.shortfallTitle}>
                          Insufficient Wallet Balance
                        </Text>
                        <Text style={styles.shortfallDesc}>
                          Add ₹{shortfall.toLocaleString('en-IN')} more to your wallet to place this order.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.topUpBtn}
                        onPress={() => {
                          onClose();
                          navigation?.navigate('Wallet');
                        }}
                      >
                        <Text style={styles.topUpBtnText}>Add Money</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* ── 4. Price Breakdown ── */}
              <View style={styles.billBox}>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Items Subtotal</Text>
                  <Text style={styles.billVal}>₹{numericTotal.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Shipping & Delivery</Text>
                  <Text style={[styles.billVal, { color: '#27A462' }]}>FREE</Text>
                </View>
                <View style={styles.billDivider} />
                <View style={styles.billRow}>
                  <Text style={styles.totalPayableLabel}>Total Payable</Text>
                  <Text style={styles.totalPayableVal}>
                    ₹{numericTotal.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Bottom Action Footer */}
          {!loading && (
            <View style={styles.footerContainer}>
              <View style={styles.footerInfo}>
                <Text style={styles.footerTotalLabel}>Total Amount</Text>
                <Text style={styles.footerTotalPrice}>
                  ₹{numericTotal.toLocaleString('en-IN')}
                </Text>
              </View>

              {hasSufficientBalance ? (
                <TouchableOpacity
                  style={[
                    styles.payBtn,
                    (!selectedAddressId || processing) && styles.payBtnDisabled,
                  ]}
                  disabled={!selectedAddressId || processing}
                  onPress={handleConfirmOrder}
                  activeOpacity={0.8}
                >
                  {processing ? (
                    <View style={styles.processingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.processingText}>{processingStep}</Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                      <Text style={styles.payBtnText}>
                        Pay ₹{numericTotal.toLocaleString('en-IN')} with Wallet
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.addMoneyFooterBtn}
                  onPress={() => {
                    onClose();
                    navigation?.navigate('Wallet');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.addMoneyFooterText}>Top-up Wallet to Pay</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Profile Incomplete Modal Alert */}
      <ProfileIncompleteModal
        visible={profileModalVisible}
        percentage={profilePct}
        missingFields={missingFields}
        isUnderReview={isProfileUnderReview}
        message={profileModalMessage}
        onClose={() => setProfileModalVisible(false)}
        onComplete={() => {
          setProfileModalVisible(false);
          onClose();
          navigation?.navigate('EditProfile');
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FAF7F8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.9,
    minHeight: SCREEN_HEIGHT * 0.55,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAED',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#2A1E24',
  },
  sheetSub: {
    fontSize: 12,
    color: '#8C7A82',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8C7A82',
  },
  scrollBody: {
    padding: 18,
    paddingBottom: 24,
  },

  /* Sections */
  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A1E24',
  },
  changeActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E64A78',
  },

  /* Address Styling */
  noAddressBox: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  noAddressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A1E24',
    marginTop: 6,
  },
  noAddressSub: {
    fontSize: 12,
    color: '#8C7A82',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E64A78',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addAddressBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  selectedAddressCard: {
    backgroundColor: '#FFF9FB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDEFF3',
  },
  addrCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  addrName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A1E24',
  },
  addrPhone: {
    fontSize: 12,
    color: '#8C7A82',
    fontWeight: '500',
  },
  addrDetails: {
    fontSize: 12.5,
    color: '#55444C',
    lineHeight: 18,
  },
  addrCity: {
    fontSize: 12,
    color: '#8C7A82',
    marginTop: 3,
  },

  addressListContainer: {
    gap: 10,
  },
  addressSelectItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAF7F8',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  addressSelectItemActive: {
    backgroundColor: '#FFF9FB',
    borderColor: '#E64A78',
  },
  addrNameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  addrSelectName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2A1E24',
  },
  defChip: {
    backgroundColor: '#FDEFF3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E64A78',
  },
  addrSelectText: {
    fontSize: 12,
    color: '#55444C',
    lineHeight: 16,
  },
  addrSelectPhone: {
    fontSize: 11,
    color: '#8C7A82',
    marginTop: 2,
  },
  addNewAddrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  addNewAddrRowText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E64A78',
  },

  /* Item rows */
  itemCountText: {
    fontSize: 12,
    color: '#8C7A82',
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F3F5',
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FAF7F8',
    marginRight: 12,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  fallbackThumb: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDEFF3',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A1E24',
    marginBottom: 2,
  },
  itemQtyPrice: {
    fontSize: 12,
    color: '#8C7A82',
  },
  itemTotal: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2A1E24',
  },

  /* Wallet Section */
  walletStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  walletStatusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  walletCard: {
    backgroundColor: '#FAF7F8',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  walletBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  walletLabel: {
    fontSize: 13,
    color: '#6F5F67',
  },
  walletAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A1E24',
  },
  walletTotalAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E64A78',
  },
  walletDivider: {
    height: 1,
    backgroundColor: '#EAE2E6',
    marginVertical: 8,
  },
  remainingBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EAE2E6',
  },
  remainingLabel: {
    fontSize: 11.5,
    color: '#27A462',
    fontWeight: '500',
  },
  remainingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#27A462',
  },
  shortfallBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF2F2',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  shortfallTextCol: {
    flex: 1,
    marginRight: 8,
  },
  shortfallTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  shortfallDesc: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 2,
  },
  topUpBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  topUpBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Bill Summary */
  billBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0EAED',
    marginBottom: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 13,
    color: '#8C7A82',
  },
  billVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A1E24',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#F0EAED',
    marginVertical: 6,
  },
  totalPayableLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A1E24',
  },
  totalPayableVal: {
    fontSize: 17,
    fontWeight: '700',
    color: '#E64A78',
  },

  /* Footer */
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0EAED',
    gap: 16,
  },
  footerInfo: {
    minWidth: 90,
  },
  footerTotalLabel: {
    fontSize: 11,
    color: '#8C7A82',
  },
  footerTotalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A1E24',
  },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E64A78',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payBtnDisabled: {
    backgroundColor: '#DFD7DC',
    shadowOpacity: 0,
    elevation: 0,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  addMoneyFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  addMoneyFooterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Success View */
  successWrapper: {
    padding: 24,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#27A462',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#27A462',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2A1E24',
    marginBottom: 8,
  },
  successSub: {
    fontSize: 13.5,
    color: '#8C7A82',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  orderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0F4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  orderBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E64A78',
  },
  deliverySummaryBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    marginBottom: 20,
  },
  deliverySummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  deliverySummaryTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#8C7A82',
    textTransform: 'uppercase',
  },
  deliverySummaryName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2A1E24',
  },
  deliverySummaryAddr: {
    fontSize: 12,
    color: '#6F5F67',
    marginTop: 2,
  },
  successBtnGroup: {
    width: '100%',
    gap: 10,
  },
  primarySuccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E64A78',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primarySuccessBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondarySuccessBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E64A78',
  },
  secondarySuccessBtnText: {
    color: '#E64A78',
    fontSize: 14,
    fontWeight: '600',
  },
  textSuccessBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  textSuccessBtnText: {
    fontSize: 13,
    color: '#8C7A82',
    fontWeight: '500',
  },
});
