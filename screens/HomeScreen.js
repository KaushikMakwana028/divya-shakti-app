import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import homeService from '../services/homeService';

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
  { icon: 'flash',       label: 'Activate',  bg: '#FFF0F4', color: '#E64A78' },
  { icon: 'gift',        label: 'Rewards',   bg: '#FBF5E6', color: '#C89738' },
  { icon: 'bar-chart',   label: 'Analytics', bg: '#F5F0FB', color: '#7B61C4' },
  { icon: 'help-circle', label: 'Support',   bg: '#EEF5FF', color: '#4A7CE6' },
];

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await homeService.getDashboard();
      if (result.success && result.data) {
        setDashboardData(result.data);
      }
    } catch (err) {
      console.error('Fetch dashboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

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
      console.error('Share error:', err);
    }
  };

  const displayName = dashboardData?.user?.name || user?.name || 'Member';
  const walletBalance = Number(dashboardData?.wallet?.wallet_balance ?? user?.wallet_balance ?? 0);
  const totalRevenue = Number(dashboardData?.wallet?.total_revenue ?? 0);
  const totalMembers = dashboardData?.team?.total_members ?? 0;
  const totalOrders = dashboardData?.orders?.total_orders ?? 0;
  const referralCode = dashboardData?.referral?.referral_code || user?.referral_code || '';
  const recentOrders = dashboardData?.orders?.recent_orders || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDashboard(true)}
            colors={['#E64A78']}
            tintColor="#E64A78"
          />
        }
      >
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Welcome Back 👋</Text>
            <Text style={styles.userName}>{displayName}</Text>
          </View>
          {loading && !refreshing && (
            <ActivityIndicator size="small" color="#E64A78" />
          )}
        </View>

        {/* ── Balance Banner ── */}
        <View style={styles.banner}>
          {/* Tag */}
          <View style={styles.offerTag}>
            <Ionicons name="star" size={11} color="#C89738" />
            <Text style={styles.offerTagText}>
              {referralCode ? `Ref: ${referralCode}` : 'Member'}
            </Text>
          </View>

          <Text style={styles.bannerLabel}>Total Balance</Text>
          <Text style={styles.bannerAmount}>
            ₹ {walletBalance.toLocaleString('en-IN')}
          </Text>

          <View style={styles.bannerRow}>
            <TouchableOpacity
              style={styles.bannerPrimaryBtn}
              activeOpacity={0.8}
              onPress={() => navigation?.navigate?.('Shop')}
            >
              <Ionicons name="bag-handle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.bannerPrimaryBtnText}>Explore Shop</Text>
            </TouchableOpacity>
            {referralCode ? (
              <TouchableOpacity
                style={styles.bannerSecondaryBtn}
                activeOpacity={0.8}
                onPress={handleShareReferral}
              >
                <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                <Text style={styles.bannerSecondaryBtnText}>Share</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Decorative circles */}
          <View style={styles.bannerDecorCircle1} />
          <View style={styles.bannerDecorCircle2} />
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          {/* Earnings / Revenue */}
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={() => navigation?.navigate?.('Wallet')}
          >
            <View style={styles.statIconBox}>
              <Ionicons name="trending-up" size={18} color="#E64A78" />
            </View>
            <Text style={styles.statValue}>
              ₹{totalRevenue.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.statDivider} />

          {/* Network */}
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={() => navigation?.navigate?.('Network')}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#FBF5E6' }]}>
              <Ionicons name="people-outline" size={18} color="#C89738" />
            </View>
            <Text style={styles.statValue}>{totalMembers}</Text>
            <Text style={styles.statLabel}>Team</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.statDivider} />

          {/* Orders */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#EEF5FF' }]}>
              <Ionicons name="bag-outline" size={18} color="#4A7CE6" />
            </View>
            <Text style={styles.statValue}>{totalOrders}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {QUICK_ACTIONS.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={styles.actionItem}
              activeOpacity={0.7}
              onPress={() => {
                if (action.label === 'Rewards') handleShareReferral();
                if (action.label === 'Analytics') navigation?.navigate?.('Network');
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Promo / Referral Banner ── */}
        {referralCode ? (
          <View style={styles.promoBanner}>
            <View style={styles.promoLeft}>
              <Text style={styles.promoEyebrow}>Refer & Earn</Text>
              <Text style={styles.promoHeadline}>
                Code: {referralCode}
              </Text>
              <TouchableOpacity
                style={styles.promoBtn}
                onPress={handleShareReferral}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={14} color="#C89738" />
                <Text style={styles.promoBtnText}>Share & Invite</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promoRight}>
              <Ionicons name="gift-outline" size={56} color="rgba(200,151,56,0.35)" />
            </View>
          </View>
        ) : null}

        {/* ── Recent Activity ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {recentOrders.length > 0 && (
            <TouchableOpacity onPress={() => navigation?.navigate?.('Shop')}>
              <Text style={styles.seeAll}>View Shop</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentOrders.length > 0 ? (
          recentOrders.map((item, i) => (
            <View key={item.order_id || i} style={styles.activityCard}>
              <View style={[styles.activityIcon, { backgroundColor: '#FFF0F4' }]}>
                <Ionicons name="bag-check-outline" size={20} color="#E64A78" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle} numberOfLines={1}>
                  {item.product_name}
                </Text>
                <Text style={styles.activityDate}>
                  {item.created_at || 'Recently'} • Qty: {item.quantity}
                </Text>
              </View>
              <Text style={[styles.activityAmount, { color: '#27A462' }]}>
                ₹{Number(item.total_amount || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={36} color="#C4B8BC" />
            <Text style={styles.emptyCardTitle}>No Recent Orders</Text>
            <Text style={styles.emptyCardSub}>
              Start shopping or grow your team to see activity here.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF7F8',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 110,
  },

  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  greeting: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#9E8E93',
  },
  userName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#2A1E24',
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E64A78',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  /* Banner */
  banner: {
    backgroundColor: '#2A1E24',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  offerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(200,151,56,0.18)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(200,151,56,0.3)',
  },
  offerTagText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#C89738',
  },
  bannerLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 4,
  },
  bannerAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 36,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 22,
  },
  bannerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bannerPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E64A78',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  bannerPrimaryBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  bannerSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  bannerSecondaryBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  bannerDecorCircle1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -40,
    right: -30,
  },
  bannerDecorCircle2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -20,
    right: 60,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#F0EAED',
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF0F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#2A1E24',
  },
  statLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#9E8E93',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FBF5E6',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 2,
  },
  trendText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: '#C89738',
  },

  /* Quick Actions */
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#2A1E24',
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#2A1E24',
  },

  /* Promo Banner */
  promoBanner: {
    backgroundColor: '#2A1E24',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  promoLeft: { flex: 1 },
  promoEyebrow: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    color: '#C89738',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  promoHeadline: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 14,
  },
  promoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(200,151,56,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(200,151,56,0.4)',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  promoBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#C89738',
  },
  promoRight: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 12,
  },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  seeAll: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#E64A78',
  },

  /* Activity */
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  activityInfo: { flex: 1 },
  activityTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#2A1E24',
    marginBottom: 3,
  },
  activityDate: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#9E8E93',
  },
  activityAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0EAED',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  emptyCardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#2A1E24',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyCardSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#9E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
});