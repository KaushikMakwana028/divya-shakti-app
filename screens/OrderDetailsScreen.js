import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Alert from "../services/alertService";
import orderService from "../services/orderService";
import { useAuth } from "../contexts/AuthContext";

// ─────────────────────────────────────────────────────────────
// Centralized Status Palette
// Every place on this screen that shows a status — the top banner,
// the timeline steps, and the bottom notice box — pulls from this
// single map. Previously the bottom "shipping" notice box stayed a
// fixed purple for BOTH "Packed" and "Out for Delivery" even though
// their icon/title colors switched to orange — a mismatched box.
// Centralizing it here guarantees every status is visually distinct
// and internally consistent wherever it's shown.
// ─────────────────────────────────────────────────────────────
const STATUS_META = {
  pending: {
    label: "Payment Pending",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: "time",
    step: 1,
  },
  placed_paid: {
    label: "Order Placed & Paid",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    icon: "checkmark-circle",
    step: 2,
  },
  confirmed: {
    label: "Order Confirmed",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    icon: "checkmark-circle",
    step: 2,
  },
  packed: {
    label: "Order Packed",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    icon: "cube",
    step: 3,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "#EA580C",
    bg: "#FFF7ED",
    border: "#FED7AA",
    icon: "bicycle",
    step: 4,
  },
  delivered: {
    label: "Delivered",
    color: "#10B981",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    icon: "checkmark-done-circle",
    step: 5,
  },
  cancelled: {
    label: "Cancelled",
    color: "#EF4444",
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: "close-circle",
    step: 0,
  },
};

// Fixed per-stage colors for the tracking timeline, so progress reads
// as a distinct color per milestone (amber → blue → purple → orange →
// green) instead of every completed step turning the same green.
const TIMELINE_STEP_META = [
  { key: "placed", title: "Order Placed", color: "#D97706" },
  { key: "confirmed", title: "Order Confirmed", color: "#2563EB" },
  { key: "packed", title: "Order Packed", color: "#7C3AED" },
  { key: "out_for_delivery", title: "Out for Delivery", color: "#EA580C" },
  { key: "delivered", title: "Delivered", color: "#10B981" },
];

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
      setError("Order ID is missing");
      setLoading(false);
      return;
    }

    try {
      const res = await orderService.getOrderDetails(orderId);
      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        setError(res.message || "Failed to fetch order details");
      }
    } catch (err) {
      console.error("OrderDetails error:", err);
      setError("An error occurred while loading order details.");
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

  const handlePayNow = () => {
    if (!order) return;
    navigation.navigate("CheckoutReview", {
      pendingOrderId: order.id,
    });
  };

  const handleViewProduct = () => {
    if (!order?.product_id) return;
    navigation.navigate("ProductDetails", {
      productId: order.product_id,
      product: {
        id: order.product_id,
        name: order.product_name,
        price: order.product_price,
        image: order.product_image,
        category_name: order.category_name,
        category: order.category_name,
      },
    });
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    const isPaid = Boolean(
      order.is_paid || order.status?.toLowerCase() === "confirmed" || order.status?.toLowerCase() === "placed"
    );
    const alertTitle = isPaid ? "Cancel Order & Refund" : "Cancel Order";
    const alertMsg = isPaid
      ? `Are you sure you want to cancel Order #${order.id}? The paid amount of ₹${Number(order.amount || 0).toLocaleString("en-IN")} will be refunded immediately to your Divy Shakti wallet.`
      : `Are you sure you want to cancel Order #${order.id}?`;

    Alert.alert(alertTitle, alertMsg, [
      { text: "Keep Order", style: "cancel" },
      {
        text: isPaid ? "Yes, Cancel & Refund" : "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await orderService.cancelOrder(order.id);
            if (res.success) {
              await refreshProfile();
              const isRefundIssued = Boolean(res.data?.refund_issued || res.data?.was_paid);
              const refundAmt = Number(res.data?.refund_amount || order.amount || 0);
              const toastMsg = isRefundIssued
                ? `Order #${order.id} cancelled. ₹${refundAmt.toLocaleString("en-IN")} has been refunded to your wallet.`
                : res.message || `Order #${order.id} cancelled successfully.`;

              Alert.alert("Order Cancelled", toastMsg);
              fetchDetails();
            } else {
              Alert.alert(
                "Cannot Cancel",
                res.message || "Failed to cancel order."
              );
            }
          } catch (err) {
            Alert.alert("Error", err.message || "Cancellation failed.");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // Looks up the centralized STATUS_META instead of holding its own
  // duplicate color values, so this screen can never show two
  // different colors for the same status.
  const getStatusConfig = (status, isPaid = false) => {
    const key = status?.toLowerCase();
    switch (key) {
      case "completed":
      case "delivered":
        return STATUS_META.delivered;
      case "out_for_delivery":
        return STATUS_META.out_for_delivery;
      case "packed":
        return STATUS_META.packed;
      case "processing":
      case "confirmed":
        return STATUS_META.confirmed;
      case "placed":
        return isPaid ? STATUS_META.placed_paid : STATUS_META.pending;
      case "cancelled":
        return STATUS_META.cancelled;
      case "pending":
      default:
        return STATUS_META.pending;
    }
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

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#2A1E24" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order #{orderId || ""}</Text>
          <View style={{ width: 38 }} />
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
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#2A1E24" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.errorCenter}>
          <View style={styles.errorIconBox}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>
            {error || "Order could not be found"}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            activeOpacity={0.85}
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
  const statusKey = order.status?.toLowerCase();
  const addr = order.shipping_address;

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
        <Text style={styles.headerTitle}>Order #{order.id}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#E64A78"]}
            tintColor="#E64A78"
          />
        }
      >
        {/* Status Card Banner — background now tinted with the status
            color too, not just a colored border, so it reads instantly */}
        <View
          style={[
            styles.statusCard,
            { backgroundColor: statusCfg.bg, borderColor: statusCfg.border },
          ]}
        >
          <View style={[styles.statusIconBox, { backgroundColor: "#FFFFFF" }]}>
            <Ionicons name={statusCfg.icon} size={26} color={statusCfg.color} />
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

        {/* Timeline Tracker (if not cancelled) — each stage now keeps its
            own color as it completes instead of turning uniformly green */}
        {statusKey !== "cancelled" && (
          <View style={styles.timelineCard}>
            <Text style={styles.sectionHeader}>Order Tracking</Text>
            <View style={styles.timelineList}>
              {TIMELINE_STEP_META.map((stepMeta, idx) => {
                const stepNum = idx + 1;
                const done = statusCfg.step >= stepNum;
                const isCurrent = statusCfg.step === stepNum;
                const desc =
                  stepMeta.key === "placed"
                    ? formatDate(order.created_at)
                    : done
                      ? {
                          confirmed: "Payment verified & confirmed",
                          packed: "Item packed at warehouse",
                          out_for_delivery: "With delivery partner",
                          delivered: "Delivered & referral rewards credited",
                        }[stepMeta.key]
                      : {
                          confirmed: "Awaiting payment verification",
                          packed: "Packing pending",
                          out_for_delivery: "Dispatch pending",
                          delivered: "Delivery & rewards pending",
                        }[stepMeta.key];

                return (
                  <View key={stepMeta.key} style={styles.timelineRow}>
                    <View style={styles.timelineIndicatorCol}>
                      <View
                        style={[
                          styles.timelineCircle,
                          done && {
                            backgroundColor: stepMeta.color,
                            borderColor: stepMeta.color,
                          },
                          isCurrent && styles.timelineCircleCurrent,
                        ]}
                      >
                        {done ? (
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color="#FFFFFF"
                          />
                        ) : (
                          <View style={styles.timelineDot} />
                        )}
                      </View>
                      {idx < TIMELINE_STEP_META.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            statusCfg.step > stepNum && {
                              backgroundColor:
                                TIMELINE_STEP_META[idx + 1].color,
                            },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.timelineTextCol}>
                      <Text
                        style={[
                          styles.timelineTitle,
                          done && { color: stepMeta.color, fontWeight: "700" },
                        ]}
                      >
                        {stepMeta.title}
                      </Text>
                      <Text style={styles.timelineDesc}>{desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Product Details Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>
            Item Details{order.items && order.items.length > 0 ? ` (${order.items.length})` : ""}
          </Text>

          {Array.isArray(order.items) && order.items.length > 0 ? (
            order.items.map((item, idx) => (
              <View key={item.id || idx}>
                {idx > 0 && <View style={[styles.divider, { marginVertical: 12 }]} />}
                <TouchableOpacity
                  style={styles.productRow}
                  activeOpacity={item.product_id ? 0.7 : 1}
                  onPress={() => {
                    if (item.product_id) {
                      navigation.navigate("ProductDetails", { productId: item.product_id });
                    }
                  }}
                  disabled={!item.product_id}
                >
                  <View style={styles.productImgBox}>
                    {item.product_image ? (
                      <Image
                        source={{ uri: item.product_image }}
                        style={styles.productImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.fallbackBox}>
                        <Ionicons name="cube-outline" size={28} color="#C4B8BC" />
                      </View>
                    )}
                  </View>

                  <View style={styles.productDetailsCol}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.product_name}
                    </Text>
                    {item.category_name && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                          {item.category_name}
                        </Text>
                      </View>
                    )}
                    <View style={styles.productPriceRow}>
                      <Text style={styles.priceEach}>
                        ₹{Number(item.price || 0).toLocaleString("en-IN")} × {item.quantity}
                      </Text>
                      {item.size ? (
                        <View style={styles.sizePill}>
                          <Ionicons name="shirt-outline" size={11} color="#E64A78" />
                          <Text style={styles.sizePillText}>Size: {item.size}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.priceSubtotal}>
                        ₹{Number(item.subtotal || 0).toLocaleString("en-IN")}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {item.product_id ? (
                  <TouchableOpacity
                    style={styles.viewProductBtn}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate("ProductDetails", { productId: item.product_id })
                    }
                  >
                    <Text style={styles.viewProductText}>View Product</Text>
                    <Ionicons name="arrow-forward" size={15} color="#E64A78" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          ) : (
            <>
              <TouchableOpacity
                style={styles.productRow}
                activeOpacity={order.product_id ? 0.7 : 1}
                onPress={order.product_id ? handleViewProduct : undefined}
                disabled={!order.product_id}
              >
                <View style={styles.productImgBox}>
                  {order.product_image ? (
                    <Image
                      source={{ uri: order.product_image }}
                      style={styles.productImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.fallbackBox}>
                      <Ionicons name="cube-outline" size={28} color="#C4B8BC" />
                    </View>
                  )}
                </View>

                <View style={styles.productDetailsCol}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {order.product_name}
                  </Text>
                  {order.category_name && (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {order.category_name}
                      </Text>
                    </View>
                  )}
                  <View style={styles.productPriceRow}>
                    <Text style={styles.priceEach}>
                      ₹{Number(order.product_price || 0).toLocaleString("en-IN")} ×{" "}
                      {order.quantity}
                    </Text>
                    {order.size ? (
                      <View style={styles.sizePill}>
                        <Ionicons name="shirt-outline" size={11} color="#E64A78" />
                        <Text style={styles.sizePillText}>Size: {order.size}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.priceSubtotal}>
                      ₹{Number(order.amount || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {order.product_id && (
                <TouchableOpacity
                  style={styles.viewProductBtn}
                  activeOpacity={0.7}
                  onPress={handleViewProduct}
                >
                  <Text style={styles.viewProductText}>View Product</Text>
                  <Ionicons name="arrow-forward" size={15} color="#E64A78" />
                </TouchableOpacity>
              )}
            </>
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
                {addr.address_line2 ? `, ${addr.address_line2}` : ""}
              </Text>
              {addr.landmark ? (
                <Text style={styles.addrLandmark}>
                  Landmark: {addr.landmark}
                </Text>
              ) : null}
              <Text style={styles.addrCity}>
                {addr.city}, {addr.state} - {addr.pincode}
              </Text>
              <Text style={styles.addrCountry}>{addr.country || "India"}</Text>
              <View style={styles.addrPhoneRow}>
                <Ionicons name="call-outline" size={14} color="#8C7A82" />
                <Text style={styles.addrPhone}>{addr.mobile}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noAddressText}>
              No shipping address recorded.
            </Text>
          )}
        </View>

        {/* Price Breakdown Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Price Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Item Subtotal ({order.quantity}{" "}
              {order.quantity === 1 ? "item" : "items"})
            </Text>
            <Text style={styles.summaryValue}>
              ₹{Number(order.amount || 0).toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Charge</Text>
            <Text style={[styles.summaryValue, { color: "#E64A78", fontWeight: "600" }]}>
              {order?.delivery_charge > 0 ? `₹${Number(order.delivery_charge).toLocaleString("en-IN")}` : "As per order"}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>
              {!order.is_paid ? "Total Payable" : "Total Amount Paid"}
            </Text>
            <Text style={styles.totalValue}>
              ₹{Number(order.amount || 0).toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        {/* Pending Order Actions (Unpaid) — amber, matches STATUS_META.pending */}
        {!order.is_paid &&
          (statusKey === "pending" || statusKey === "placed") && (
            <View
              style={[
                styles.noticeBox,
                {
                  backgroundColor: STATUS_META.pending.bg,
                  borderColor: STATUS_META.pending.border,
                },
              ]}
            >
              <View style={styles.noticeHeader}>
                <Ionicons
                  name="time"
                  size={18}
                  color={STATUS_META.pending.color}
                />
                <Text style={[styles.noticeTitle, { color: "#B45309" }]}>
                  Payment Pending
                </Text>
              </View>
              <Text style={[styles.noticeDesc, { color: "#92400E" }]}>
                Complete payment from your wallet balance to confirm and
                dispatch your order.
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
                      Pay ₹{Number(order.amount || 0).toLocaleString("en-IN")}{" "}
                      with Wallet
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

        {/* Confirmed / Placed & Paid Order Actions — blue, matches STATUS_META.confirmed */}
        {Boolean(order.is_paid) &&
          (statusKey === "confirmed" || statusKey === "placed") && (
            <View
              style={[
                styles.noticeBox,
                {
                  backgroundColor: STATUS_META.confirmed.bg,
                  borderColor: STATUS_META.confirmed.border,
                },
              ]}
            >
              <View style={styles.noticeHeader}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={STATUS_META.confirmed.color}
                />
                <Text style={[styles.noticeTitle, { color: "#1D4ED8" }]}>
                  Order Placed & Paid
                </Text>
              </View>
              <Text style={[styles.noticeDesc, { color: "#1E40AF" }]}>
                Payment received. Your order is being prepared for packaging.
                You can cancel this order before packing begins to receive an
                immediate refund in your wallet.
              </Text>

              <TouchableOpacity
                style={[
                  styles.cancelRefundBtn,
                  actionLoading && styles.btnDisabled,
                ]}
                activeOpacity={0.7}
                disabled={actionLoading}
                onPress={handleCancelOrder}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Ionicons
                      name="close-circle-outline"
                      size={17}
                      color="#EF4444"
                    />
                    <Text style={styles.cancelRefundBtnText}>
                      Cancel Order (Refund ₹
                      {Number(order.amount || 0).toLocaleString("en-IN")} to
                      Wallet)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

        {/* Packed Notice — purple, matches STATUS_META.packed */}
        {statusKey === "packed" && (
          <View
            style={[
              styles.noticeBox,
              {
                backgroundColor: STATUS_META.packed.bg,
                borderColor: STATUS_META.packed.border,
              },
            ]}
          >
            <View style={styles.noticeHeader}>
              <Ionicons
                name="cube"
                size={18}
                color={STATUS_META.packed.color}
              />
              <Text style={[styles.noticeTitle, { color: "#6D28D9" }]}>
                Order Packed
              </Text>
            </View>
            <Text style={[styles.noticeDesc, { color: "#5B21B6" }]}>
              Your order has been securely packed at our fulfillment warehouse
              and is awaiting courier pickup. It can no longer be cancelled.
            </Text>
          </View>
        )}

        {/* Out for Delivery Notice — orange, matches STATUS_META.out_for_delivery
            (previously this shared the same purple box as "Packed" above,
            despite its icon already being orange — now it gets its own
            correctly-tinted box) */}
        {statusKey === "out_for_delivery" && (
          <View
            style={[
              styles.noticeBox,
              {
                backgroundColor: STATUS_META.out_for_delivery.bg,
                borderColor: STATUS_META.out_for_delivery.border,
              },
            ]}
          >
            <View style={styles.noticeHeader}>
              <Ionicons
                name="bicycle"
                size={18}
                color={STATUS_META.out_for_delivery.color}
              />
              <Text style={[styles.noticeTitle, { color: "#C2410C" }]}>
                Out for Delivery
              </Text>
            </View>
            <Text style={[styles.noticeDesc, { color: "#9A3412" }]}>
              Your order is on the way with our courier delivery executive and
              will reach you shortly.
            </Text>
          </View>
        )}

        {/* Delivered Notice — green, matches STATUS_META.delivered */}
        {(statusKey === "delivered" || statusKey === "completed") && (
          <View
            style={[
              styles.noticeBox,
              {
                backgroundColor: STATUS_META.delivered.bg,
                borderColor: STATUS_META.delivered.border,
              },
            ]}
          >
            <View style={styles.noticeHeader}>
              <Ionicons
                name="checkmark-done-circle"
                size={20}
                color={STATUS_META.delivered.color}
              />
              <Text style={[styles.noticeTitle, { color: "#047857" }]}>
                Delivered Successfully
              </Text>
            </View>
            <Text style={[styles.noticeDesc, { color: "#065F46" }]}>
              Thank you for shopping with Divy Shakti! Your order was delivered successfully.
            </Text>
          </View>
        )}

        {/* Cancelled Notice — red, matches STATUS_META.cancelled */}
        {statusKey === "cancelled" && (
          <View
            style={[
              styles.noticeBox,
              {
                backgroundColor: STATUS_META.cancelled.bg,
                borderColor: STATUS_META.cancelled.border,
              },
            ]}
          >
            <View style={styles.noticeHeader}>
              <Ionicons
                name="close-circle"
                size={20}
                color={STATUS_META.cancelled.color}
              />
              <Text style={[styles.noticeTitle, { color: "#B91C1C" }]}>
                Order Cancelled
              </Text>
            </View>
            <Text style={[styles.noticeDesc, { color: "#991B1B" }]}>
              This order was cancelled. Any paid amount has been refunded
              directly to your Divy Shakti wallet.
            </Text>
          </View>
        )}

        {/* Need Help CTA */}
        <TouchableOpacity
          style={styles.helpBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Main", { screen: "Shop" })}
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
    borderBottomColor: "#F0EAED",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FAF7F8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    color: "#2A1E24",
  },
  loaderCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loaderText: {
    marginTop: 12,
    fontFamily: "Poppins_500Medium",
    fontSize: 13.5,
    color: "#8C7A82",
  },
  errorCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  errorTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    color: "#2A1E24",
    marginTop: 12,
  },
  errorSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    color: "#8C7A82",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#E64A78",
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14.5,
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
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    gap: 14,
  },
  statusIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 1,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    marginBottom: 4,
  },
  statusDate: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: "#6B5A63",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0EAED",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#2A1E24",
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  timelineList: {
    marginTop: 6,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineIndicatorCol: {
    alignItems: "center",
    width: 28,
  },
  timelineCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineCircleCurrent: {
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  timelineLine: {
    width: 2,
    height: 32,
    backgroundColor: "#E5E7EB",
  },
  timelineTextCol: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 20,
  },
  timelineTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    color: "#9E8E93",
  },
  timelineDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#8C7A82",
    marginTop: 2,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  productImgBox: {
    width: 74,
    height: 74,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FAF7F8",
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  productImg: {
    width: "100%",
    height: "100%",
  },
  fallbackBox: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  productDetailsCol: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#2A1E24",
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FAF7F8",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  categoryBadgeText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#8C7A82",
  },
  productPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceEach: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#8C7A82",
  },
  sizePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF0F5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FBD5E1",
  },
  sizePillText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#E64A78",
  },
  priceSubtotal: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#2A1E24",
  },
  viewProductBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3EFF1",
  },
  viewProductText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    color: "#E64A78",
  },
  addressInfoBox: {
    gap: 3,
    marginTop: 4,
  },
  addrRecipient: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14.5,
    color: "#2A1E24",
    marginBottom: 2,
  },
  addrLine: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    lineHeight: 19,
    color: "#4B3F45",
  },
  addrLandmark: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: "#8C7A82",
    fontStyle: "italic",
  },
  addrCity: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#2A1E24",
    marginTop: 2,
  },
  addrCountry: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: "#8C7A82",
  },
  addrPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  addrPhone: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#2A1E24",
  },
  noAddressText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#8C7A82",
    fontStyle: "italic",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    color: "#8C7A82",
  },
  summaryValue: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    color: "#2A1E24",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#F0EAED",
    marginVertical: 10,
  },
  totalLabel: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#2A1E24",
  },
  totalValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    color: "#E64A78",
  },
  helpBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FAF7F8",
    borderWidth: 1.5,
    borderColor: "#E64A78",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
  },
  helpBtnText: {
    color: "#E64A78",
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
  },

  // Shared notice box shell — background/border color now always comes
  // from STATUS_META at the call site, so it can never drift out of
  // sync with the icon/title color like the old purple-always box did.
  noticeBox: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  noticeTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14.5,
  },
  noticeDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    lineHeight: 18,
  },

  payNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E64A78",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 16,
    marginBottom: 10,
    shadowColor: "#E64A78",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  payNowBtnText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    fontSize: 14.5,
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  cancelBtnText: {
    color: "#EF4444",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  cancelRefundBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EF4444",
    marginTop: 14,
  },
  cancelRefundBtnText: {
    color: "#EF4444",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
});
