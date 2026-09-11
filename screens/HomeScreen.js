import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Share,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import homeService from "../services/homeService";

const { width } = Dimensions.get("window");

const QUICK_ACTIONS = [
  {
    icon: "bag-handle-outline",
    label: "Shop",
    screen: "Shop",
    bg: "#FFF0F4",
    color: "#E64A78",
  },
  {
    icon: "wallet-outline",
    label: "Wallet",
    screen: "Wallet",
    bg: "#FBF5E6",
    color: "#C89738",
  },
  {
    icon: "receipt-outline",
    label: "My Orders",
    screen: "Orders",
    bg: "#F5F0FB",
    color: "#7B61C4",
  },
  {
    icon: "people-outline",
    label: "My Team",
    screen: "Network",
    bg: "#EEF5FF",
    color: "#4A7CE6",
  },
];

export default function HomeScreen({ navigation }) {
  const { user, refreshProfile, updateUser } = useAuth();
  const { getCartCount } = useCart();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─────────────────────────────────────────
  // Fetch Dashboard Data (with live profile sync)
  // ─────────────────────────────────────────
  const fetchDashboard = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!dashboardData) {
        setLoading(true);
      }

      try {
        const result = await homeService.getDashboard();
        if (result.success && result.data) {
          setDashboardData(result.data);
          if (result.data.user && updateUser) {
            updateUser(result.data.user);
          }
        }
        if (refreshProfile) {
          refreshProfile();
        }
      } catch (err) {
        console.error("Fetch dashboard error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dashboardData, updateUser, refreshProfile],
  );

  useEffect(() => {
    fetchDashboard(false);
  }, []);

  // Re-fetch automatically whenever user focuses on Home screen
  useFocusEffect(
    useCallback(() => {
      fetchDashboard(false);
    }, [fetchDashboard]),
  );

  // ─────────────────────────────────────────
  // Share Referral
  // ─────────────────────────────────────────
  const handleShareReferral = async () => {
    const referral = dashboardData?.referral;
    const refCode = referral?.referral_code || user?.referral_code;
    if (!refCode) return;

    try {
      await Share.share({
        message:
          referral?.share_message ||
          `Join Divy Shakti and start your wellness & earning journey! Use my referral code: ${refCode}`,
      });
    } catch (err) {
      console.error("Share error:", err);
    }
  };

  // ─────────────────────────────────────────
  // Extracted Data from Backend API
  // ─────────────────────────────────────────
  const userData = dashboardData?.user || user || {};
  const displayName = userData.name || "Member";
  const customId = userData.custom_id || userData.user_id || "";
  const profileImage = userData.profile_image || null;

  // Profile Progression Bar
  const profileProgress =
    dashboardData?.profile_progression_bar ||
    dashboardData?.profile_progress ||
    null;

  const percentage = Number(
    profileProgress?.percentage ?? userData?.profile_completion_percentage ?? 0,
  );
  const completedCount = Number(profileProgress?.completed_count ?? 0);
  const totalFields = Number(profileProgress?.total_fields ?? 13);
  const isCompleted = Boolean(
    profileProgress?.is_profile_completed ?? percentage >= 100,
  );
  const isActive = Boolean(
    profileProgress?.is_profile_active ?? userData?.is_profile_active,
  );

  const statusLabel =
    profileProgress?.status_label ||
    (isCompleted
      ? isActive
        ? "Verified & Active"
        : "Pending Admin Approval"
      : "Incomplete");

  const progressColor =
    profileProgress?.progress_color ||
    (percentage >= 100
      ? "#10b981"
      : percentage >= 70
        ? "#3b82f6"
        : percentage >= 35
          ? "#f59e0b"
          : "#ef4444");

  const progressMessage =
    profileProgress?.message ||
    (isCompleted
      ? isActive
        ? "Your profile is 100% complete and verified."
        : "Your profile is 100% complete and submitted for review. Please wait for admin approval."
      : `Your profile is ${percentage}% complete. Please complete remaining KYC and Bank details to activate shopping and rewards.`);

  const missingDetails = profileProgress?.missing_fields_details || [];

  // Status meta lookup — single source of truth so icon/colors never drift
  const STATUS_META = {
    "Verified & Active": {
      icon: "shield-checkmark",
      badgeIcon: "checkmark-circle",
      iconBg: "#E8F8F0",
      iconColor: "#27A462",
      pillBg: "#E8F8F0",
      pillBorder: "#C6F0DA",
      pillText: "#27A462",
    },
    "Pending Admin Approval": {
      icon: "time",
      badgeIcon: "hourglass",
      iconBg: "#FEF3C7",
      iconColor: "#D97706",
      pillBg: "#FEF3C7",
      pillBorder: "#FDE68A",
      pillText: "#D97706",
    },
    Incomplete: {
      icon: "alert-circle",
      badgeIcon: "alert-circle",
      iconBg: "#FFF0F4",
      iconColor: "#E64A78",
      pillBg: "#FFF0F4",
      pillBorder: "#FCD9E3",
      pillText: "#E64A78",
    },
  };
  const statusMeta = STATUS_META[statusLabel] || STATUS_META.Incomplete;
  const isVerifiedAndActive = statusLabel === "Verified & Active";

  // Financial / Wallet Metrics
  const walletData = dashboardData?.wallet || {};
  const walletBalance = Number(
    walletData.wallet_balance ?? userData.wallet_balance ?? 0,
  );
  const totalRevenue = Number(walletData.total_revenue ?? 0);
  const todayRevenue = Number(walletData.today_revenue ?? 0);
  const thisMonthRevenue = Number(walletData.this_month_revenue ?? 0);
  const totalSpent = Number(walletData.total_spent ?? 0);

  // Team Metrics
  const teamData = dashboardData?.team || {};
  const totalMembers = Number(teamData.total_members ?? 0);
  const activeMembers = Number(teamData.active_members ?? 0);
  const pendingMembers = Number(teamData.pending_members ?? 0);
  const recentMembers = teamData.recent_members || [];

  // Orders Metrics
  const orderData = dashboardData?.orders || {};
  const totalOrders = Number(orderData.total_orders ?? 0);
  const pendingOrders = Number(orderData.pending_orders ?? 0);
  const deliveredOrders = Number(orderData.delivered_orders ?? 0);
  const recentOrders = orderData.recent_orders || [];

  // Cart Metrics
  const cartData = dashboardData?.cart || {};
  const cartTotalItems = Number(cartData.total_items ?? getCartCount() ?? 0);
  const cartSubtotal = Number(cartData.subtotal ?? 0);

  // Referral Info
  const referralCode =
    dashboardData?.referral?.referral_code || userData.referral_code || "";

  // ─────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr.replace(/-/g, "/"));
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getOrderStatusMeta = (status) => {
    switch ((status || "").toLowerCase()) {
      case "pending":
        return {
          label: "Pending",
          bg: "#FEF3C7",
          text: "#D97706",
          border: "#FDE68A",
        };
      case "confirmed":
        return {
          label: "Confirmed",
          bg: "#EFF6FF",
          text: "#2563EB",
          border: "#BFDBFE",
        };
      case "packed":
        return {
          label: "Packed",
          bg: "#F5F3FF",
          text: "#7C3AED",
          border: "#DDD6FE",
        };
      case "out_for_delivery":
        return {
          label: "Out for Delivery",
          bg: "#FFF7ED",
          text: "#EA580C",
          border: "#FFEDD5",
        };
      case "delivered":
      case "completed":
        return {
          label: "Delivered",
          bg: "#E8F8F0",
          text: "#10B981",
          border: "#C6F0DA",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          bg: "#FEE2E2",
          text: "#EF4444",
          border: "#FECACA",
        };
      default:
        return {
          label: status || "Pending",
          bg: "#F3F4F6",
          text: "#6B7280",
          border: "#E5E7EB",
        };
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDashboard(true)}
            colors={["#E64A78"]}
            tintColor="#E64A78"
          />
        }
      >
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.userProfileBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Main", { screen: "Profile" })}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.userAvatar} />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <Text style={styles.userAvatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userTextCol}>
              <Text style={styles.greeting}>Welcome Back 👋</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>
              {customId ? (
                <View style={styles.idChip}>
                  <Text style={styles.idChipText}>ID: {customId}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>

          <View style={styles.topRightActions}>
            {loading && !refreshing && (
              <ActivityIndicator
                size="small"
                color="#E64A78"
                style={{ marginRight: 8 }}
              />
            )}
            {/* Cart Button */}
            <TouchableOpacity
              style={styles.cartIconBtn}
              activeOpacity={0.75}
              onPress={() => navigation.navigate("Cart")}
            >
              <Ionicons name="bag-handle-outline" size={20} color="#2A1E24" />
              {cartTotalItems > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>
                    {cartTotalItems > 99 ? "99+" : cartTotalItems}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Active Cart Banner (If items in cart) ── */}
        {cartTotalItems > 0 && (
          <TouchableOpacity
            style={styles.cartAlertCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Cart")}
          >
            <View style={styles.cartAlertIconBox}>
              <Ionicons name="bag-handle" size={20} color="#E64A78" />
            </View>
            <View style={styles.cartAlertTextCol}>
              <Text style={styles.cartAlertTitle}>
                {cartTotalItems} {cartTotalItems === 1 ? "item" : "items"} in
                your cart
              </Text>
              <Text style={styles.cartAlertSub}>
                Total: ₹{cartSubtotal.toLocaleString("en-IN")} • Tap to proceed
              </Text>
            </View>
            <View style={styles.cartAlertBtn}>
              <Text style={styles.cartAlertBtnText}>Checkout</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* ── Profile Progression Card ──
            Only shown while the profile is NOT fully verified & active.
            Once verified, this entire card disappears and is replaced by a
            single compact pill inside the dark wallet balance card below —
            no need for a full card just to say "you're verified". */}
        {!isVerifiedAndActive && (
          <View style={styles.progressionCard}>
            <View style={styles.progressionHeaderRow}>
              <View
                style={[
                  styles.progressionIconBox,
                  { backgroundColor: statusMeta.iconBg },
                ]}
              >
                <Ionicons
                  name={statusMeta.icon}
                  size={20}
                  color={statusMeta.iconColor}
                />
              </View>
              <View style={styles.progressionHeaderTextCol}>
                <Text style={styles.progressionCardTitle} numberOfLines={1}>
                  Account Verification
                </Text>
                <Text style={styles.progressionCardSub}>
                  {completedCount}/{totalFields} Profile Details
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.progressionStatusPill,
                {
                  backgroundColor: statusMeta.pillBg,
                  borderColor: statusMeta.pillBorder,
                },
              ]}
            >
              <Ionicons
                name={statusMeta.badgeIcon}
                size={13}
                color={statusMeta.pillText}
              />
              <Text
                style={[
                  styles.progressionStatusPillText,
                  { color: statusMeta.pillText },
                ]}
              >
                {statusLabel}
              </Text>
            </View>

            {/* Progress Bar & Percentage */}
            <View style={styles.progressBarSection}>
              <View style={styles.progressBarInfoRow}>
                <Text style={styles.progressPercentLabel}>
                  Profile Completion
                </Text>
                <Text
                  style={[
                    styles.progressPercentValue,
                    { color: progressColor },
                  ]}
                >
                  {percentage}%
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.max(6, Math.min(100, percentage))}%`,
                      backgroundColor: progressColor,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Message Banner */}
            <Text style={styles.progressionMessage}>{progressMessage}</Text>

            {/* Missing Details Pills (if incomplete) */}
            {!isCompleted && missingDetails.length > 0 && (
              <View style={styles.missingPillsRow}>
                {missingDetails.slice(0, 3).map((item, idx) => (
                  <View key={idx} style={styles.missingPill}>
                    <Ionicons name="ellipse" size={6} color="#B45309" />
                    <Text style={styles.missingPillText} numberOfLines={1}>
                      {item.label || item.field}
                    </Text>
                  </View>
                ))}
                {missingDetails.length > 3 && (
                  <View style={styles.missingPillMore}>
                    <Text style={styles.missingPillMoreText}>
                      +{missingDetails.length - 3} more
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Action CTA */}
            <View style={styles.progressionActionRow}>
              {statusLabel === "Pending Admin Approval" ? (
                <TouchableOpacity
                  style={styles.reviewBtn}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate("EditProfile")}
                >
                  <Ionicons name="eye-outline" size={16} color="#D97706" />
                  <Text style={styles.reviewBtnText}>
                    Review Profile Details
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#D97706" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.completeProfileBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("EditProfile")}
                >
                  <Text style={styles.completeProfileBtnText}>
                    Complete Profile ({100 - percentage}% remaining)
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Balance & Wallet Banner ── */}
        <View style={styles.banner}>
          {/* Decorative circles (kept behind content) */}
          <View style={styles.bannerDecorCircle1} pointerEvents="none" />
          <View style={styles.bannerDecorCircle2} pointerEvents="none" />

          {/* Tag row: referral tag + (only when verified) a single compact
              "Verified & Active" pill, styled to sit on the dark card. */}
          <View style={styles.bannerTagRow}>
            <View style={styles.offerTag}>
              <Ionicons name="star" size={11} color="#C89738" />
              <Text style={styles.offerTagText}>
                {referralCode ? `Ref: ${referralCode}` : "Active Member"}
              </Text>
            </View>

            {isVerifiedAndActive && (
              <View style={styles.bannerVerifiedPill}>
                <Ionicons name="checkmark-circle" size={12} color="#6EE7B7" />
                <Text style={styles.bannerVerifiedPillText}>
                  Verified & Active
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.bannerLabel}>Total Wallet Balance</Text>
          <Text style={styles.bannerAmount}>
            ₹ {walletBalance.toLocaleString("en-IN")}
          </Text>

          <View style={styles.bannerRow}>
            <TouchableOpacity
              style={styles.bannerPrimaryBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Wallet")}
            >
              <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
              <Text style={styles.bannerPrimaryBtnText}>My Wallet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bannerSecondaryBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Shop")}
            >
              <Ionicons name="bag-handle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.bannerSecondaryBtnText}>Shop Now</Text>
            </TouchableOpacity>

            {referralCode ? (
              <TouchableOpacity
                style={styles.bannerIconBtn}
                activeOpacity={0.8}
                onPress={handleShareReferral}
              >
                <Ionicons
                  name="share-social-outline"
                  size={16}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ── Financial Metrics Breakdown ──
            Plain (non-interactive) info cards — these are read-only stats,
            not navigable buttons. */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View
              style={[styles.metricIconBox, { backgroundColor: "#FFF0F4" }]}
            >
              <Ionicons name="trending-up" size={18} color="#E64A78" />
            </View>
            <Text style={styles.metricValue} numberOfLines={1}>
              ₹{totalRevenue.toLocaleString("en-IN")}
            </Text>
            <Text style={styles.metricLabel}>Total Revenue</Text>
          </View>

          <View style={styles.metricCard}>
            <View
              style={[styles.metricIconBox, { backgroundColor: "#FBF5E6" }]}
            >
              <Ionicons name="flash-outline" size={18} color="#C89738" />
            </View>
            <Text style={styles.metricValue} numberOfLines={1}>
              ₹{todayRevenue.toLocaleString("en-IN")}
            </Text>
            <Text style={styles.metricLabel}>Today's Earnings</Text>
          </View>

          <View style={styles.metricCard}>
            <View
              style={[styles.metricIconBox, { backgroundColor: "#F5F0FB" }]}
            >
              <Ionicons name="calendar-outline" size={18} color="#7B61C4" />
            </View>
            <Text style={styles.metricValue} numberOfLines={1}>
              ₹{thisMonthRevenue.toLocaleString("en-IN")}
            </Text>
            <Text style={styles.metricLabel}>This Month</Text>
          </View>

          <View style={styles.metricCard}>
            <View
              style={[styles.metricIconBox, { backgroundColor: "#EEF5FF" }]}
            >
              <Ionicons name="cart-outline" size={18} color="#4A7CE6" />
            </View>
            <Text style={styles.metricValue} numberOfLines={1}>
              ₹{totalSpent.toLocaleString("en-IN")}
            </Text>
            <Text style={styles.metricLabel}>Total Spent</Text>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {QUICK_ACTIONS.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={styles.actionItem}
              activeOpacity={0.75}
              onPress={() => navigation.navigate(action.screen)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Team / Downline Overview ── */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View
                style={[
                  styles.sectionHeaderIcon,
                  { backgroundColor: "#FBF5E6" },
                ]}
              >
                <Ionicons name="people" size={17} color="#C89738" />
              </View>
              <Text style={styles.sectionTitle}>My Team</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("Network")}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAll}>View All ({totalMembers})</Text>
            </TouchableOpacity>
          </View>

          {/* Team Summary Numbers */}
          <View style={styles.teamStatsRow}>
            <View style={styles.teamStatCol}>
              <Text style={styles.teamStatVal}>{totalMembers}</Text>
              <Text style={styles.teamStatLbl}>Total Members</Text>
            </View>
            <View style={styles.teamStatDivider} />
            <View style={styles.teamStatCol}>
              <Text style={[styles.teamStatVal, { color: "#27A462" }]}>
                {activeMembers}
              </Text>
              <Text style={styles.teamStatLbl}>Active (Verified)</Text>
            </View>
            <View style={styles.teamStatDivider} />
            <View style={styles.teamStatCol}>
              <Text style={[styles.teamStatVal, { color: "#D97706" }]}>
                {pendingMembers}
              </Text>
              <Text style={styles.teamStatLbl}>Pending</Text>
            </View>
          </View>

          {/* Recent Members Preview */}
          {recentMembers.length > 0 && (
            <View style={styles.recentMembersContainer}>
              <Text style={styles.subSectionTitle}>Recent Registrations</Text>
              {recentMembers.slice(0, 3).map((m, idx) => {
                const isMemberActive = Boolean(m.is_profile_active);
                return (
                  <TouchableOpacity
                    key={m.id || idx}
                    style={styles.recentMemberRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate("MemberDetails", { member: m })
                    }
                  >
                    {m.profile_image ? (
                      <Image
                        source={{ uri: m.profile_image }}
                        style={styles.recentMemberAvatar}
                      />
                    ) : (
                      <View style={styles.recentMemberAvatarPlaceholder}>
                        <Text style={styles.recentMemberAvatarText}>
                          {(m.name || "M").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.recentMemberInfo}>
                      <Text style={styles.recentMemberName} numberOfLines={1}>
                        {m.name}
                      </Text>
                      <Text style={styles.recentMemberSub}>
                        {m.user_id ? `ID: ${m.user_id} • ` : ""}
                        {formatDate(m.registered_at)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.memberStatusBadge,
                        {
                          backgroundColor: isMemberActive
                            ? "#E8F8F0"
                            : "#FEF3C7",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.memberStatusText,
                          {
                            color: isMemberActive ? "#27A462" : "#D97706",
                          },
                        ]}
                      >
                        {isMemberActive ? "Active" : "Pending"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Recent Orders ── */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View
                style={[
                  styles.sectionHeaderIcon,
                  { backgroundColor: "#FFF0F4" },
                ]}
              >
                <Ionicons name="receipt" size={17} color="#E64A78" />
              </View>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("Orders")}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAll}>View All ({totalOrders})</Text>
            </TouchableOpacity>
          </View>

          {/* Orders Breakdown Pills */}
          <View style={styles.ordersBreakdownRow}>
            <View style={styles.orderBreakdownPill}>
              <Text style={styles.orderBreakdownPillText}>
                Total: {totalOrders}
              </Text>
            </View>
            <View
              style={[
                styles.orderBreakdownPill,
                { backgroundColor: "#FEF3C7" },
              ]}
            >
              <Text
                style={[styles.orderBreakdownPillText, { color: "#D97706" }]}
              >
                Pending: {pendingOrders}
              </Text>
            </View>
            <View
              style={[
                styles.orderBreakdownPill,
                { backgroundColor: "#E8F8F0" },
              ]}
            >
              <Text
                style={[styles.orderBreakdownPillText, { color: "#27A462" }]}
              >
                Delivered: {deliveredOrders}
              </Text>
            </View>
          </View>

          {recentOrders.length > 0 ? (
            recentOrders.slice(0, 4).map((item, i) => {
              const orderStatusMeta = getOrderStatusMeta(item.status);
              return (
                <TouchableOpacity
                  key={item.order_id || i}
                  style={styles.activityCard}
                  activeOpacity={0.75}
                  onPress={() =>
                    navigation.navigate("OrderDetails", {
                      orderId: item.order_id,
                    })
                  }
                >
                  {item.product_image ? (
                    <Image
                      source={{ uri: item.product_image }}
                      style={styles.activityImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.activityIcon}>
                      <Ionicons
                        name="bag-check-outline"
                        size={20}
                        color="#E64A78"
                      />
                    </View>
                  )}

                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {item.product_name}
                    </Text>
                    <Text style={styles.activityDate} numberOfLines={1}>
                      Order #{item.order_id} • {formatDate(item.created_at)} •
                      Qty: {item.quantity}
                    </Text>
                  </View>

                  <View style={styles.activityRightCol}>
                    <Text style={styles.activityAmount}>
                      ₹{Number(item.total_amount || 0).toLocaleString("en-IN")}
                    </Text>
                    <View
                      style={[
                        styles.orderStatusPill,
                        {
                          backgroundColor: orderStatusMeta.bg,
                          borderColor: orderStatusMeta.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.orderStatusText,
                          { color: orderStatusMeta.text },
                        ]}
                      >
                        {orderStatusMeta.label}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={36} color="#C4B8BC" />
              <Text style={styles.emptyCardTitle}>No Recent Orders</Text>
              <Text style={styles.emptyCardSub}>
                Explore our authentic Ayurvedic wellness products and place your
                first order.
              </Text>
              <TouchableOpacity
                style={styles.emptyShopBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("Shop")}
              >
                <Text style={styles.emptyShopBtnText}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Referral & Invite Banner ── */}
        {referralCode ? (
          <View style={styles.promoBanner}>
            <View style={styles.promoLeft}>
              <Text style={styles.promoEyebrow}>Refer & Earn</Text>
              <Text style={styles.promoHeadline}>
                Referral Code: {referralCode}
              </Text>
              <Text style={styles.promoSub}>
                Share your referral link with friends and team to earn
                generational commissions.
              </Text>
              <TouchableOpacity
                style={styles.promoBtn}
                onPress={handleShareReferral}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="share-social-outline"
                  size={14}
                  color="#C89738"
                />
                <Text style={styles.promoBtnText}>Share & Invite</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promoRight}>
              <Ionicons
                name="gift-outline"
                size={64}
                color="rgba(200,151,56,0.3)"
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAF7F8",
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 110,
  },

  /* ── Top Bar ── */
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  userProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FDEFF3",
    borderWidth: 1.5,
    borderColor: "#E64A78",
  },
  userAvatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FDEFF3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E64A78",
  },
  userAvatarText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#E64A78",
  },
  userTextCol: {
    flexShrink: 1,
  },
  greeting: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#8C7A82",
  },
  userName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    color: "#2A1E24",
  },
  idChip: {
    backgroundColor: "#FAF0F3",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 3,
  },
  idChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10,
    color: "#E64A78",
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  cartIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F0EAED",
    position: "relative",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  cartBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E64A78",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FAF7F8",
  },
  cartBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 9,
    color: "#FFFFFF",
  },

  /* ── Active Cart Alert Banner ── */
  cartAlertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F4",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FCD9E3",
  },
  cartAlertIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(230,74,120,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cartAlertTextCol: {
    flex: 1,
  },
  cartAlertTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#2A1E24",
  },
  cartAlertSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#8C7A82",
    marginTop: 1,
  },
  cartAlertBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E64A78",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  cartAlertBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
    color: "#FFFFFF",
  },

  /* ── Profile Progression Card (incomplete / pending states only) ── */
  progressionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F0EAED",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  progressionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  progressionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  progressionHeaderTextCol: {
    flex: 1,
    minWidth: 0,
  },
  progressionCardTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#2A1E24",
  },
  progressionCardSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#8C7A82",
    marginTop: 2,
  },
  progressionStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  progressionStatusPillText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
  },
  progressBarSection: {
    marginBottom: 10,
  },
  progressBarInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressPercentLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#8C7A82",
  },
  progressPercentValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13.5,
  },
  progressBarTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: "#EDE6E9",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  progressionMessage: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#6B5A63",
    lineHeight: 18,
    marginBottom: 10,
  },
  missingPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  missingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  missingPillText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10.5,
    color: "#B45309",
  },
  missingPillMore: {
    backgroundColor: "#F3EDF0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  missingPillMoreText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10.5,
    color: "#8C7A82",
  },
  progressionActionRow: {
    marginTop: 2,
  },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  reviewBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: "#D97706",
  },
  completeProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E64A78",
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: "#E64A78",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
    elevation: 3,
  },
  completeProfileBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },

  /* ── Balance Banner ── */
  banner: {
    backgroundColor: "#2A1E24",
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  bannerTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  offerTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(200,151,56,0.18)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(200,151,56,0.3)",
  },
  offerTagText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#C89738",
  },
  bannerVerifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(39,164,98,0.18)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(110,231,183,0.35)",
  },
  bannerVerifiedPillText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#6EE7B7",
  },
  bannerLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 4,
  },
  bannerAmount: {
    fontFamily: "Poppins_700Bold",
    fontSize: 32,
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginBottom: 18,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  bannerPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E64A78",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: "#E64A78",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  bannerPrimaryBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: "#FFFFFF",
  },
  bannerSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  bannerSecondaryBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: "#FFFFFF",
  },
  bannerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  bannerDecorCircle1: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: -40,
    right: -30,
  },
  bannerDecorCircle2: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -20,
    right: 60,
  },

  /* ── Financial Metrics Grid (non-interactive cards) ── */
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    width: (width - 36 - 10) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0EAED",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  metricIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15.5,
    color: "#2A1E24",
    marginBottom: 2,
  },
  metricLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#8C7A82",
  },

  /* ── Quick Actions ── */
  sectionTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#2A1E24",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
    marginTop: 10,
  },
  actionItem: {
    alignItems: "center",
    gap: 7,
  },
  actionIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: "#2A1E24",
  },

  /* ── Section Box Container ── */
  sectionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F0EAED",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  seeAll: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#E64A78",
  },

  /* ── Team Stats Row ── */
  teamStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAF7F8",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  teamStatCol: {
    flex: 1,
    alignItems: "center",
  },
  teamStatVal: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#2A1E24",
  },
  teamStatLbl: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: "#8C7A82",
    marginTop: 2,
  },
  teamStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E8DFE2",
  },
  recentMembersContainer: {
    marginTop: 4,
  },
  subSectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#8C7A82",
    marginBottom: 8,
  },
  recentMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F7F3F5",
  },
  recentMemberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: "#FDEFF3",
  },
  recentMemberAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FDEFF3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  recentMemberAvatarText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    color: "#E64A78",
  },
  recentMemberInfo: {
    flex: 1,
  },
  recentMemberName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#2A1E24",
  },
  recentMemberSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#9E8E93",
    marginTop: 1,
  },
  memberStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  memberStatusText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10.5,
  },

  /* ── Orders Breakdown Row ── */
  ordersBreakdownRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  orderBreakdownPill: {
    backgroundColor: "#F5F0FB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderBreakdownPillText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#7B61C4",
  },

  /* ── Activity & Order Cards ── */
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF7F8",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  activityImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    marginRight: 12,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  activityTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: "#2A1E24",
    marginBottom: 2,
  },
  activityDate: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5,
    color: "#9E8E93",
  },
  activityRightCol: {
    alignItems: "flex-end",
    gap: 3,
  },
  activityAmount: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13.5,
    color: "#2A1E24",
  },
  orderStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  orderStatusText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 9.5,
  },
  emptyCard: {
    backgroundColor: "#FAF7F8",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EDE6E9",
    borderStyle: "dashed",
    marginVertical: 4,
  },
  emptyCardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#2A1E24",
    marginTop: 8,
    marginBottom: 3,
  },
  emptyCardSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#9E8E93",
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 12,
  },
  emptyShopBtn: {
    backgroundColor: "#E64A78",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyShopBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },

  /* ── Promo Banner ── */
  promoBanner: {
    backgroundColor: "#2A1E24",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  promoLeft: { flex: 1 },
  promoEyebrow: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#C89738",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  promoHeadline: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  promoSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 16,
    marginBottom: 12,
  },
  promoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(200,151,56,0.15)",
    borderWidth: 1,
    borderColor: "rgba(200,151,56,0.4)",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  promoBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
    color: "#C89738",
  },
  promoRight: {
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 10,
  },
});
