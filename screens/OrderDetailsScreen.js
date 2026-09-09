import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import orderService from '../services/orderService';
import { useAuth } from '../contexts/AuthContext';

export default function OrderDetailsScreen({ route, navigation }) {
  const orderId = route?.params?.orderId;
  const { refreshProfile } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetails = useCallback(async () => {
    if (!orderId) {
      setError('Order ID is missing');
      setLoading(false);
      return;
    }

    try {
      const res = await orderService.getOrderDetails(orderId);
      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        setError(res.message || 'Failed to fetch order details');
      }
    } catch (err) {
      console.error('OrderDetails error:', err);
      setError('An error occurred while loading order details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetails();
  };

  const handlePayNow = async () => {
    if (!order) return;
    Alert.alert(
      'Confirm Payment',
      `Pay ₹${Number(order.amount || 0).toLocaleString('en-IN')} from your wallet for Order #${order.id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await orderService.verifyPayment(order.id);
              if (res.success) {
                await refreshProfile();
                Alert.alert('Success', 'Payment verified and order confirmed successfully!');
                fetchDetails();
              } else {
                Alert.alert('Payment Failed', res.message || 'Could not verify payment.');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Payment processing failed.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    const isPaid = Boolean(order.is_paid || order.status?.toLowerCase() === 'confirmed');
    const alertTitle = isPaid ? 'Cancel Order & Refund' : 'Cancel Order';
    const alertMsg = isPaid
      ? `Are you sure you want to cancel Order #${order.id}? The paid amount of ₹${Number(order.amount || 0).toLocaleString('en-IN')} will be refunded immediately to your Divya Shakti wallet.`
      : `Are you sure you want to cancel Order #${order.id}?`;

    Alert.alert(
      alertTitle,
      alertMsg,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: isPaid ? 'Yes, Cancel & Refund' : 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await orderService.cancelOrder(order.id);
              if (res.success) {
                await refreshProfile();
                Alert.alert(
                  'Order Cancelled',
                  res.message ||
                    (isPaid
                      ? `Your order has been cancelled and ₹${Number(order.amount || 0).toLocaleString('en-IN')} has been refunded to your wallet.`
                      : 'Your order has been cancelled successfully.')
                );
                fetchDetails();
              } else {
                Alert.alert('Cannot Cancel', res.message || 'Failed to cancel order.');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Cancellation failed.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const getStatusConfig = (status, isPaid = false) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return {
          label: 'Delivered',
          color: '#10B981',
          bg: '#E8F8F0',
          icon: 'checkmark-done-circle',
          step: 5,
        };
      case 'out_for_delivery':
        return {
          label: 'Out for Delivery',
          color: '#EA580C',
          bg: '#FFF7ED',
          icon: 'bicycle',
          step: 4,
        };
      case 'packed':
        return {
          label: 'Order Packed',
          color: '#7C3AED',
          bg: '#F5F3FF',
          icon: 'cube',
          step: 3,
        };
      case 'processing':
      case 'confirmed':
        return {
          label: 'Order Confirmed',
          color: '#2563EB',
          bg: '#EFF6FF',
          icon: 'checkmark-circle',
          step: 2,
        };
      case 'placed':
        return isPaid
          ? {
              label: 'Order Placed & Paid',
              color: '#2563EB',
              bg: '#EFF6FF',
              icon: 'checkmark-circle',
              step: 2,
            }
          : {
              label: 'Payment Pending',
              color: '#D97706',
              bg: '#FEF3C7',
              icon: 'time',
              step: 1,
            };
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: '#EF4444',
          bg: '#FEF2F2',
          icon: 'close-circle',
          step: 0,
        };
      case 'pending':
      default:
        return {
          label: 'Payment Pending',
          color: '#D97706',
          bg: '#FEF3C7',
          icon: 'time',
          step: 1,
        };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#2A1E24" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order #{orderId || ''}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#E64A78" />
          <Text style={styles.loaderText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#2A1E24" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={50} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Order could not be found'}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              fetchDetails();
            }}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = getStatusConfig(order.status, order.is_paid);
  const addr = order.shipping_address;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#2A1E24" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.id}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#E64A78']}
            tintColor="#E64A78"
          />
        }
      >
        {/* Status Card Banner */}
        <View style={[styles.statusCard, { borderColor: `${statusCfg.color}40` }]}>
          <View style={[styles.statusIconBox, { backgroundColor: statusCfg.bg }]}>
            <Ionicons name={statusCfg.icon} size={28} color={statusCfg.color} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
            <Text style={styles.statusDate}>
              Placed on {formatDate(order.created_at)}
            </Text>
          </View>
        </View>

        {/* Timeline Tracker (if not cancelled) */}
        {order.status !== 'cancelled' && (
          <View style={styles.timelineCard}>
            <Text style={styles.sectionHeader}>Order Tracking</Text>
            <View style={styles.timelineList}>
              {[
                {
                  title: 'Order Placed',
                  desc: formatDate(order.created_at),
                  done: statusCfg.step >= 1,
                },
                {
                  title: 'Order Confirmed',
                  desc: statusCfg.step >= 2 ? 'Payment verified & confirmed' : 'Awaiting payment verification',
                  done: statusCfg.step >= 2,
                },
                {
                  title: 'Order Packed',
                  desc: statusCfg.step >= 3 ? 'Item packed at warehouse' : 'Packing pending',
                  done: statusCfg.step >= 3,
                },
                {
                  title: 'Out for Delivery',
                  desc: statusCfg.step >= 4 ? 'With delivery partner' : 'Dispatch pending',
                  done: statusCfg.step >= 4,
                },
                {
                  title: 'Delivered',
                  desc: statusCfg.step >= 5 ? 'Completed successfully' : 'Delivery pending',
                  done: statusCfg.step >= 5,
                },
              ].map((stepItem, idx) => (
                <View key={idx} style={styles.timelineRow}>
                  <View style={styles.timelineIndicatorCol}>
                    <View
                      style={[
                        styles.timelineCircle,
                        stepItem.done && styles.timelineCircleDone,
                      ]}
                    >
                      {stepItem.done ? (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      ) : (
                        <View style={styles.timelineDot} />
                      )}
                    </View>
                    {idx < 4 && (
                      <View
                        style={[
                          styles.timelineLine,
                          stepItem.done && statusCfg.step > idx + 1 && styles.timelineLineDone,
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineTextCol}>
                    <Text style={[styles.timelineTitle, stepItem.done && styles.timelineTitleDone]}>
                      {stepItem.title}
                    </Text>
                    <Text style={styles.timelineDesc}>{stepItem.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Product Details Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Item Details</Text>
          <View style={styles.productRow}>
            <View style={styles.productImgBox}>
              {order.product_image ? (
                <Image
                  source={{ uri: order.product_image }}
                  style={styles.productImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.fallbackBox}>
                  <Ionicons name="cube-outline" size={30} color="#8C7A82" />
                </View>
              )}
            </View>

            <View style={styles.productDetailsCol}>
              <Text style={styles.productName} numberOfLines={2}>
                {order.product_name}
              </Text>
              {order.category_name && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{order.category_name}</Text>
                </View>
              )}
              <View style={styles.productPriceRow}>
                <Text style={styles.priceEach}>
                  ₹{Number(order.product_price || 0).toLocaleString('en-IN')} × {order.quantity}
                </Text>
                <Text style={styles.priceSubtotal}>
                  ₹{Number(order.amount || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          {order.product_id && (
            <TouchableOpacity
              style={styles.viewProductBtn}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('ProductDetails', {
                  product: {
                    id: order.product_id,
                    slug: order.product_slug,
                    name: order.product_name,
                  },
                })
              }
            >
              <Text style={styles.viewProductText}>View Product</Text>
              <Ionicons name="arrow-forward" size={15} color="#E64A78" />
            </TouchableOpacity>
          )}
        </View>

        {/* Delivery / Shipping Address Card */}
        <View style={styles.sectionCard}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="location-outline" size={20} color="#27A462" />
            <Text style={styles.sectionHeader}>Delivery Address</Text>
          </View>

          {addr ? (
            <View style={styles.addressInfoBox}>
              <Text style={styles.addrRecipient}>{addr.full_name}</Text>
              <Text style={styles.addrLine}>
                {addr.address_line1}
                {addr.address_line2 ? `, ${addr.address_line2}` : ''}
              </Text>
              {addr.landmark ? (
                <Text style={styles.addrLandmark}>Landmark: {addr.landmark}</Text>
              ) : null}
              <Text style={styles.addrCity}>
                {addr.city}, {addr.state} - {addr.pincode}
              </Text>
              <Text style={styles.addrCountry}>{addr.country || 'India'}</Text>
              <View style={styles.addrPhoneRow}>
                <Ionicons name="call-outline" size={14} color="#8C7A82" />
                <Text style={styles.addrPhone}>{addr.mobile}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noAddressText}>No shipping address recorded.</Text>
          )}
        </View>

        {/* Price Breakdown Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Price Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Item Subtotal ({order.quantity} {order.quantity === 1 ? 'item' : 'items'})
            </Text>
            <Text style={styles.summaryValue}>
              ₹{Number(order.amount || 0).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Charge</Text>
            <Text style={[styles.summaryValue, { color: '#27A462' }]}>FREE</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>
              {!order.is_paid ? 'Total Payable' : 'Total Amount Paid'}
            </Text>
            <Text style={styles.totalValue}>
              ₹{Number(order.amount || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Pending Order Actions (Unpaid) */}
        {!order.is_paid && (order.status?.toLowerCase() === 'pending' || order.status?.toLowerCase() === 'placed') && (
          <View style={styles.pendingActionBox}>
            <View style={styles.pendingAlertHeader}>
              <Ionicons name="time" size={18} color="#D97706" />
              <Text style={styles.pendingAlertTitle}>Payment Pending</Text>
            </View>
            <Text style={styles.pendingAlertDesc}>
              Complete payment from your wallet balance to confirm and dispatch your order.
            </Text>

            <TouchableOpacity
              style={[styles.payNowBtn, actionLoading && styles.btnDisabled]}
              activeOpacity={0.8}
              disabled={actionLoading}
              onPress={handlePayNow}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.payNowBtnText}>
                    Pay ₹{Number(order.amount || 0).toLocaleString('en-IN')} with Wallet
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, actionLoading && styles.btnDisabled]}
              activeOpacity={0.7}
              disabled={actionLoading}
              onPress={handleCancelOrder}
            >
              <Text style={styles.cancelBtnText}>Cancel Order</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Confirmed / Placed & Paid Order Actions (User can cancel for full wallet refund before packed) */}
        {Boolean(order.is_paid) && (order.status?.toLowerCase() === 'confirmed' || order.status?.toLowerCase() === 'placed') && (
          <View style={styles.confirmedActionBox}>
            <View style={styles.confirmedAlertHeader}>
              <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
              <Text style={styles.confirmedAlertTitle}>Order Placed & Paid</Text>
            </View>
            <Text style={styles.confirmedAlertDesc}>
              Payment received. Your order is being prepared for packaging. You can cancel this order before packing begins to receive an immediate refund in your wallet.
            </Text>

            <TouchableOpacity
              style={[styles.cancelRefundBtn, actionLoading && styles.btnDisabled]}
              activeOpacity={0.7}
              disabled={actionLoading}
              onPress={handleCancelOrder}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={17} color="#EF4444" />
                  <Text style={styles.cancelRefundBtnText}>
                    Cancel Order (Refund ₹{Number(order.amount || 0).toLocaleString('en-IN')} to Wallet)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Packed / Out for Delivery Notice */}
        {(order.status?.toLowerCase() === 'packed' || order.status?.toLowerCase() === 'out_for_delivery') && (
          <View style={styles.shippingNoticeBox}>
            <View style={styles.shippingNoticeHeader}>
              <Ionicons
                name={order.status?.toLowerCase() === 'packed' ? 'cube' : 'bicycle'}
                size={18}
                color={order.status?.toLowerCase() === 'packed' ? '#7C3AED' : '#EA580C'}
              />
              <Text
                style={[
                  styles.shippingNoticeTitle,
                  { color: order.status?.toLowerCase() === 'packed' ? '#6D28D9' : '#C2410C' },
                ]}
              >
                {order.status?.toLowerCase() === 'packed' ? 'Order Packed' : 'Out for Delivery'}
              </Text>
            </View>
            <Text style={styles.shippingNoticeDesc}>
              {order.status?.toLowerCase() === 'packed'
                ? 'Your order has been securely packed at our fulfillment warehouse and is awaiting courier pickup. It can no longer be cancelled.'
                : 'Your order is on the way with our courier delivery executive and will reach you shortly.'}
            </Text>
          </View>
        )}

        {/* Delivered Notice */}
        {(order.status?.toLowerCase() === 'delivered' || order.status?.toLowerCase() === 'completed') && (
          <View style={styles.deliveredNoticeBox}>
            <View style={styles.deliveredNoticeHeader}>
              <Ionicons name="checkmark-done-circle" size={20} color="#10B981" />
              <Text style={styles.deliveredNoticeTitle}>Delivered Successfully</Text>
            </View>
            <Text style={styles.deliveredNoticeDesc}>
              Thank you for shopping with Divya Shakti! We hope your divine idol brings blessings, prosperity, and peace into your home.
            </Text>
          </View>
        )}

        {/* Cancelled Notice */}
        {order.status?.toLowerCase() === 'cancelled' && (
          <View style={styles.cancelledNoticeBox}>
            <View style={styles.cancelledNoticeHeader}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.cancelledNoticeTitle}>Order Cancelled</Text>
            </View>
            <Text style={styles.cancelledNoticeDesc}>
              This order was cancelled. Any paid amount has been refunded directly to your Divya Shakti wallet.
            </Text>
          </View>
        )}

        {/* Need Help CTA */}
        <TouchableOpacity
          style={styles.helpBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Main', { screen: 'Shop' })}
        >
          <Ionicons name="bag-handle-outline" size={18} color="#E64A78" />
          <Text style={styles.helpBtnText}>Continue Shopping</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF7F8',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAED',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A1E24',
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8C7A82',
    fontWeight: '500',
  },
  errorCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A1E24',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#8C7A82',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E64A78',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    gap: 14,
  },
  statusIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusDate: {
    fontSize: 12.5,
    color: '#8C7A82',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0EAED',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A1E24',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  timelineList: {
    marginTop: 6,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIndicatorCol: {
    alignItems: 'center',
    width: 28,
  },
  timelineCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCircleDone: {
    backgroundColor: '#27A462',
    borderColor: '#27A462',
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  timelineLine: {
    width: 2,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  timelineLineDone: {
    backgroundColor: '#27A462',
  },
  timelineTextCol: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 20,
  },
  timelineTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#8C7A82',
  },
  timelineTitleDone: {
    color: '#2A1E24',
  },
  timelineDesc: {
    fontSize: 12,
    color: '#8C7A82',
    marginTop: 2,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productImgBox: {
    width: 74,
    height: 74,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FAF7F8',
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  fallbackBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetailsCol: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A1E24',
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FAF7F8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  categoryBadgeText: {
    fontSize: 11,
    color: '#8C7A82',
    fontWeight: '500',
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceEach: {
    fontSize: 13,
    color: '#8C7A82',
  },
  priceSubtotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A1E24',
  },
  viewProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3EFF1',
  },
  viewProductText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#E64A78',
  },
  addressInfoBox: {
    gap: 3,
    marginTop: 4,
  },
  addrRecipient: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#2A1E24',
    marginBottom: 2,
  },
  addrLine: {
    fontSize: 13.5,
    lineHeight: 19,
    color: '#4B3F45',
  },
  addrLandmark: {
    fontSize: 12.5,
    color: '#8C7A82',
    fontStyle: 'italic',
  },
  addrCity: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A1E24',
    marginTop: 2,
  },
  addrCountry: {
    fontSize: 12.5,
    color: '#8C7A82',
  },
  addrPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  addrPhone: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A1E24',
  },
  noAddressText: {
    fontSize: 13,
    color: '#8C7A82',
    fontStyle: 'italic',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13.5,
    color: '#8C7A82',
  },
  summaryValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#2A1E24',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F0EAED',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A1E24',
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#E64A78',
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAF7F8',
    borderWidth: 1.5,
    borderColor: '#E64A78',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
  },
  helpBtnText: {
    color: '#E64A78',
    fontSize: 15,
    fontWeight: '700',
  },
  pendingActionBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  pendingAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  pendingAlertTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#B45309',
  },
  pendingAlertDesc: {
    fontSize: 12.5,
    color: '#92400E',
    lineHeight: 18,
    marginBottom: 16,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E64A78',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 10,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  payNowBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 13.5,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmedActionBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  confirmedAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  confirmedAlertTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  confirmedAlertDesc: {
    fontSize: 12.5,
    color: '#1E40AF',
    lineHeight: 18,
    marginBottom: 14,
  },
  cancelRefundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelRefundBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  shippingNoticeBox: {
    backgroundColor: '#F5F3FF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    marginBottom: 16,
  },
  shippingNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  shippingNoticeTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#6D28D9',
  },
  shippingNoticeDesc: {
    fontSize: 12.5,
    color: '#5B21B6',
    lineHeight: 18,
  },
  deliveredNoticeBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  deliveredNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  deliveredNoticeTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#047857',
  },
  deliveredNoticeDesc: {
    fontSize: 12.5,
    color: '#065F46',
    lineHeight: 18,
  },
  cancelledNoticeBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  cancelledNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cancelledNoticeTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#B91C1C',
  },
  cancelledNoticeDesc: {
    fontSize: 12.5,
    color: '#991B1B',
    lineHeight: 18,
  },
});
