import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
  { icon: 'flash',       label: 'Activate',  bg: '#FFF0F4', color: '#E64A78' },
  { icon: 'gift',        label: 'Rewards',   bg: '#FBF5E6', color: '#C89738' },
  { icon: 'bar-chart',   label: 'Analytics', bg: '#F5F0FB', color: '#7B61C4' },
  { icon: 'help-circle', label: 'Support',   bg: '#EEF5FF', color: '#4A7CE6' },
];

const ACTIVITY = [
  {
    icon: 'arrow-down',
    title: 'Commission Received',
    date: 'Today, 10:30 AM',
    amount: '+ ₹840',
    positive: true,
    bg: '#FFF0F4',
    iconColor: '#E64A78',
  },
  {
    icon: 'arrow-up',
    title: 'Withdrawal',
    date: 'Yesterday, 3:00 PM',
    amount: '- ₹2,000',
    positive: false,
    bg: '#FBF5E6',
    iconColor: '#C89738',
  },
  {
    icon: 'flash',
    title: 'Bonus Activated',
    date: '2 days ago',
    amount: '+ ₹1,200',
    positive: true,
    bg: '#F5F0FB',
    iconColor: '#7B61C4',
  },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <View>
            {/* <Text style={styles.greeting}>Good Morning 👋</Text> */}
            <Text style={styles.userName}>Hello 👋! Rajesh Kumar</Text>
          </View>
        </View>

        {/* ── Balance Banner ── */}
        <View style={styles.banner}>
          {/* Gold offer tag */}
          <View style={styles.offerTag}>
            <Ionicons name="star" size={11} color="#C89738" />
            <Text style={styles.offerTagText}>Gold Member</Text>
          </View>

          <Text style={styles.bannerLabel}>Total Balance</Text>
          <Text style={styles.bannerAmount}>₹ 48,250</Text>

          <View style={styles.bannerRow}>
            <TouchableOpacity style={styles.bannerPrimaryBtn}>
              <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.bannerPrimaryBtnText}>Add Funds</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bannerSecondaryBtn}>
              <Ionicons name="arrow-up-circle-outline" size={16} color="#2A1E24" />
              <Text style={styles.bannerSecondaryBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>

          {/* Decorative circle */}
          <View style={styles.bannerDecorCircle1} />
          <View style={styles.bannerDecorCircle2} />
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          {/* Earnings */}
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <Ionicons name="trending-up" size={18} color="#E64A78" />
            </View>
            <Text style={styles.statValue}>₹12,840</Text>
            <Text style={styles.statLabel}>Earnings</Text>
            <View style={styles.trendBadge}>
              <Ionicons name="arrow-up" size={9} color="#C89738" />
              <Text style={styles.trendText}>+12%</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.statDivider} />

          {/* Network */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FBF5E6' }]}>
              <Ionicons name="people-outline" size={18} color="#C89738" />
            </View>
            <Text style={styles.statValue}>248</Text>
            <Text style={styles.statLabel}>Network</Text>
            <View style={styles.trendBadge}>
              <Ionicons name="arrow-up" size={9} color="#C89738" />
              <Text style={styles.trendText}>+5%</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.statDivider} />

          {/* Orders */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#EEF5FF' }]}>
              <Ionicons name="bag-outline" size={18} color="#4A7CE6" />
            </View>
            <Text style={styles.statValue}>36</Text>
            <Text style={styles.statLabel}>Orders</Text>
            <View style={styles.trendBadge}>
              <Ionicons name="arrow-up" size={9} color="#C89738" />
              <Text style={styles.trendText}>+3%</Text>
            </View>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {QUICK_ACTIONS.map((action, i) => (
            <TouchableOpacity key={i} style={styles.actionItem} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent Activity ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {ACTIVITY.map((item, i) => (
          <View key={i} style={styles.activityCard}>
            <View style={[styles.activityIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={18} color={item.iconColor} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityDate}>{item.date}</Text>
            </View>
            <Text style={[
              styles.activityAmount,
              { color: item.positive ? '#27A462' : '#E64A78' },
            ]}>
              {item.amount}
            </Text>
          </View>
        ))}
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
});