import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import orderService from "../services/orderService";

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  const fetchOrders = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setErrorMessage(null);
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
      } else {
        setErrorMessage(res.message || "Failed to fetch orders.");
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
      setErrorMessage(err.message || "Network error. Failed to fetch orders.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders(1);
    }, [fetchOrders])
  );

  const onRefresh = () => {
    fetchOrders(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchOrders(page + 1);
    }
  };

  // ─────────────────────────────────────────
  // Map internal statuses to required user-facing labels and colors:
  // pending -> "Awaiting Payment" (gray)
  // placed -> "Order Placed" (blue)
  // confirmed -> "Confirmed" (indigo)
  // packed -> "Packed" (purple)
  // out_for_delivery -> "Out for Delivery" (orange)
  // delivered -> "Delivered" (green)
  // cancelled -> "Cancelled" (red)
  // ─────────────────────────────────────────
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return {
          label: "Awaiting Payment",
          color: "#4B5563", // Gray
          bg: "#F3F4F6",
          border: "#E5E7EB",
          icon: "time",
        };
      case "placed":
        return {
          label: "Order Placed",
          color: "#2563EB", // Blue
          bg: "#EFF6FF",
          border: "#BFDBFE",
          icon: "bag-check",
        };
      case "confirmed":
        return {
          label: "Confirmed",
          color: "#4F46E5", // Indigo
          bg: "#EEF2FF",
          border: "#C7D2FE",
          icon: "checkmark-circle",
        };
      case "packed":
        return {
          label: "Packed",
          color: "#7C3AED", // Purple
          bg: "#F5F3FF",
          border: "#DDD6FE",
          icon: "cube",
        };
      case "out_for_delivery":
        return {
          label: "Out for Delivery",
          color: "#EA580C", // Orange
          bg: "#FFF7ED",
          border: "#FED7AA",
          icon: "bicycle",
        };
      case "delivered":
        return {
          label: "Delivered",
          color: "#16A34A", // Green
          bg: "#F0FDF4",
          border: "#BBF7D0",
          icon: "checkmark-done-circle",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          color: "#DC2626", // Red
          bg: "#FEF2F2",
          border: "#FECACA",
          icon: "close-circle",
        };
      default:
        return {
          label: ucwords(status || "Pending"),
          color: "#4B5563",
          bg: "#F3F4F6",
          border: "#E5E7EB",
          icon: "time",
        };
    }
  };

  const ucwords = (str) => {
    return String(str)
      .replace(/_/g, " ")
      .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      let s = String(dateStr).trim().replace(" ", "T");
      if (!s.includes("+") && !s.includes("Z") && !s.includes("-", 10)) {
        s += "+05:30";
      }
      const d = new Date(s);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });
    } catch {
      return dateStr;
    }
  };

  const renderOrderItem = ({ item }) => {
    const statusCfg = getStatusConfig(item.status);
    const isPending = item.status?.toLowerCase() === "pending";
    const hasMultipleItems = item.items_count > 1 || (item.items && item.items.length > 1);
    const totalItemsCount = item.items_count || (item.items ? item.items.length : 1);

    return (
      <View style={styles.orderCard}>
        {/* Card Header: Order ID, Date & Status */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate("OrderDetails", { orderId: item.id })}
        >
          <View style={styles.cardHeader}>
            <View style={styles.orderIdGroup}>
              <Text style={styles.orderIdText}>Order #{item.id}</Text>
              <View style={styles.orderDateRow}>
                <Ionicons name="time-outline" size={11} color="#9E8E93" />
                <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusCfg.bg, borderColor: statusCfg.border },
              ]}
            >
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
                  <Ionicons name="cube-outline" size={26} color="#C4B8BC" />
                </View>
              )}
            </View>

            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.product_name}
              </Text>
              {hasMultipleItems && (
                <View style={styles.multiItemsBadge}>
                  <Ionicons name="layers-outline" size={11} color="#E64A78" />
                  <Text style={styles.multiItemsBadgeText}>
                    +{totalItemsCount - 1} more item{totalItemsCount - 1 > 1 ? "s" : ""}
                  </Text>
                </View>
              )}
              <View style={styles.qtyRow}>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyBadgeText}>
                    Qty: {item.quantity}{hasMultipleItems ? ` (${totalItemsCount} items)` : ""}
                  </Text>
                </View>
                {item.size ? (
                  <View style={styles.sizeBadge}>
                    <Ionicons name="shirt-outline" size={10} color="#E64A78" />
                    <Text style={styles.sizeBadgeText}>Size: {item.size}</Text>
                  </View>
                ) : null}
                <Text style={styles.amountText}>
                  ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Card Footer: If Pending -> "Complete Payment" button taking user straight to Confirm & Pay flow */}
        {isPending ? (
          <View style={styles.cardFooterPending}>
            <TouchableOpacity
              style={styles.completePaymentBtn}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("CheckoutReview", {
                  pendingOrderId: item.id,
                })
              }
            >
              <Ionicons name="card-outline" size={16} color="#FFFFFF" />
              <Text style={styles.completePaymentBtnText}>Complete Payment</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.cardFooter}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("OrderDetails", { orderId: item.id })}
          >
            <Text style={styles.detailsActionText}>View Details / Track Order</Text>
            <View style={styles.detailsActionIconWrap}>
              <Ionicons name="chevron-forward" size={14} color="#E64A78" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#E64A78" />
        <Text style={styles.footerLoaderText}>Loading more orders...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color="#2A1E24" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>My Orders</Text>
          {total > 0 && (
            <Text style={styles.headerSubtitle}>
              {total} {total === 1 ? "order" : "orders"} placed
            </Text>
          )}
        </View>

        <View style={{ width: 38 }} />
      </View>

      {/* Error Banner */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#DC2626" />
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#E64A78" />
          <Text style={styles.loaderText}>Loading your orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="receipt-outline" size={60} color="#C4B8BC" />
          </View>
          <Text style={styles.emptyTitle}>No Orders Yet</Text>
          <Text style={styles.emptyText}>
            You haven't placed any orders yet. Explore our products and find something you like!
          </Text>
          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => navigation.navigate("Main", { screen: "Shop" })}
            activeOpacity={0.8}
          >
            <Ionicons name="storefront-outline" size={18} color="#FFFFFF" />
            <Text style={styles.shopNowText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#E64A78"]}
              tintColor="#E64A78"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAF7F8",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0E6E9",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F7EFF1",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleCol: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2A1E24",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#7A6E74",
    marginTop: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#DC2626",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F0E6E9",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  orderIdGroup: {
    flex: 1,
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2A1E24",
  },
  orderDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  orderDate: {
    fontSize: 11,
    color: "#9E8E93",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#F5ECEF",
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#F7EFF1",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2A1E24",
    lineHeight: 18,
    marginBottom: 4,
  },
  multiItemsBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "#FDF2F4",
    borderWidth: 1,
    borderColor: "#FBCFE8",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 6,
  },
  multiItemsBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#E64A78",
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyBadge: {
    backgroundColor: "#F5ECEF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qtyBadgeText: {
    fontSize: 11,
    color: "#7A6E74",
    fontWeight: "600",
  },
  sizeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF0F5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FBD5E1",
  },
  sizeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#E64A78",
  },
  amountText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2A1E24",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#FAF7F8",
  },
  detailsActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E64A78",
  },
  detailsActionIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FDE2E8",
    justifyContent: "center",
    alignItems: "center",
  },
  cardFooterPending: {
    padding: 10,
    backgroundColor: "#FAF7F8",
  },
  completePaymentBtn: {
    backgroundColor: "#E64A78",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  completePaymentBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loaderCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: "#7A6E74",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#F7EFF1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2A1E24",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#7A6E74",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
  },
  shopNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E64A78",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  shopNowText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  footerLoaderText: {
    fontSize: 12,
    color: "#7A6E74",
  },
});
