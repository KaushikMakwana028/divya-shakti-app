import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import orderService from '../services/orderService';

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchOrders = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const res = await orderService.getOrders(pageNum, 10);
      if (res.success) {
        const fetchedOrders = res.orders || [];
        if (pageNum === 1) {
          setOrders(fetchedOrders);
        } else {
          setOrders((prev) => [...prev, ...fetchedOrders]);
        }
        setTotal(res.total || 0);
        setPage(pageNum);
        setHasMore(fetchedOrders.length === 10);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const onRefresh = () => {
    fetchOrders(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchOrders(page + 1);
    }
  };

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return { label: 'Completed', color: '#27A462', bg: '#E8F5E9', icon: 'checkmark-circle' };
      case 'processing':
      case 'confirmed':
        return { label: 'Processing', color: '#3B82F6', bg: '#EFF6FF', icon: 'sync' };
      case 'shipped':
        return { label: 'Shipped', color: '#8B5CF6', bg: '#F5F3FF', icon: 'cube' };
      case 'cancelled':
        return { label: 'Cancelled', color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle' };
      default:
        return { label: status || 'Pending', color: '#F59E0B', bg: '#FEF3C7', icon: 'time' };
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

  const renderOrderItem = ({ item }) => {
    const statusCfg = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
      >
        {/* Card Header: Order ID, Date & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.orderIdGroup}>
            <Text style={styles.orderIdText}>Order #{item.id}</Text>
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Ionicons name={statusCfg.icon} size={13} color={statusCfg.color} />
            <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Card Body: Product Info */}
        <View style={styles.cardBody}>
          <View style={styles.imageContainer}>
            {item.product_image ? (
              <Image
                source={{ uri: item.product_image }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imageFallback}>
                <Ionicons name="cube-outline" size={26} color="#8C7A82" />
              </View>
            )}
          </View>

          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.product_name}
            </Text>
            <View style={styles.qtyRow}>
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyBadgeText}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.amountText}>
                ₹{Number(item.amount || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Card Footer: View Details Action */}
        <View style={styles.cardFooter}>
          <Text style={styles.detailsActionText}>View Order Details</Text>
          <Ionicons name="chevron-forward" size={16} color="#E64A78" />
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#E64A78" />
          <Text style={styles.loaderText}>Loading your orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="bag-handle-outline" size={64} color="#E64A78" />
          </View>
          <Text style={styles.emptyTitle}>No Orders Yet</Text>
          <Text style={styles.emptySubtitle}>
            You haven't placed any orders yet. Explore our divine collection of idols and spiritual essentials.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Shop' })}
            activeOpacity={0.85}
          >
            <Ionicons name="storefront-outline" size={18} color="#FFFFFF" />
            <Text style={styles.exploreBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#E64A78']}
              tintColor="#E64A78"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#E64A78" />
              </View>
            ) : null
          }
        />
      )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FDEFF3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A1E24',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#8C7A82',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E64A78',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  orderCard: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderIdGroup: {
    flex: 1,
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A1E24',
  },
  orderDate: {
    fontSize: 12,
    color: '#8C7A82',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3EFF1',
    marginVertical: 12,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageContainer: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FAF7F8',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3EFF1',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#2A1E24',
    lineHeight: 20,
    marginBottom: 6,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyBadge: {
    backgroundColor: '#FAF7F8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  qtyBadgeText: {
    fontSize: 12,
    color: '#8C7A82',
    fontWeight: '500',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A1E24',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailsActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E64A78',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
