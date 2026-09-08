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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import orderService from '../services/orderService';

export default function OrderDetailsScreen({ route, navigation }) {
  const orderId = route?.params?.orderId;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return {
          label: 'Completed / Delivered',
          color: '#27A462',
          bg: '#E8F5E9',
          icon: 'checkmark-circle',
          step: 4,
        };
      case 'shipped':
        return {
          label: 'Shipped & In Transit',
          color: '#8B5CF6',
          bg: '#F5F3FF',
          icon: 'cube',
          step: 3,
        };
      case 'processing':
      case 'confirmed':
        return {
          label: 'Processing Order',
          color: '#3B82F6',
          bg: '#EFF6FF',
          icon: 'sync',
          step: 2,
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: '#EF4444',
          bg: '#FEF2F2',
          icon: 'close-circle',
          step: 0,
        };
      default:
        return {
          label: 'Order Placed (Pending)',
          color: '#F59E0B',
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
        <View style={styles.errorCenter}>
          <Ionicons name="alert-circle-outline" size={54} color="#EF4444" />
          <Text style={styles.errorTitle}>Unable to load order</Text>
          <Text style={styles.errorSubtitle}>{error || 'Order not found.'}</Text>
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

  const statusCfg = getStatusConfig(order.status);
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
                { title: 'Order Placed', desc: formatDate(order.created_at), done: statusCfg.step >= 1 },
                { title: 'Order Confirmed', desc: 'Verified by merchant', done: statusCfg.step >= 2 },
                { title: 'Dispatched & Shipped', desc: 'Handed to courier', done: statusCfg.step >= 3 },
                { title: 'Delivered', desc: 'Completed successfully', done: statusCfg.step >= 4 },
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
                    {idx < 3 && (
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
            <Text style={styles.totalLabel}>Total Amount Paid</Text>
            <Text style={styles.totalValue}>
              ₹{Number(order.amount || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

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
});
