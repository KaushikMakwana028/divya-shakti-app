import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import profileService from '../services/profileService';
import homeService from '../services/homeService';
import orderService from '../services/orderService';

const MENU_SECTIONS = [
  {
    title: 'Account',
    items: [
      { icon: 'person-outline',        label: 'Edit Profile',       color: '#E64A78', route: 'EditProfile' },
      { icon: 'wallet-outline',         label: 'My Wallet',          color: '#C89738', route: 'Wallet' },
      { icon: 'location-outline',       label: 'My Addresses',       color: '#27A462', route: 'Addresses' },
      { icon: 'document-text-outline',  label: 'My Orders',          color: '#7B61C4', route: 'Orders' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { icon: 'information-circle-outline', label: 'About Us',          color: '#E64A78', route: 'AboutUs' },
      { icon: 'document-text-outline',      label: 'Terms & Conditions', color: '#C89738', route: 'TermsConditions' },
      { icon: 'shield-checkmark-outline',    label: 'Privacy Policy',      color: '#4A7CE6', route: 'PrivacyPolicy' },
      { icon: 'trash-outline',             label: 'Delete Account',      color: '#EF4444', route: 'DeleteAccount' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: 'chatbubble-outline',        label: 'Contact Us',         color: '#E64A78' },
    ],
  },
];

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(user);
  const [statsData, setStatsData] = useState({
    earnings: null,
    members: 0,
    orders: null,
  });

  const currentUser = profileData || user;

  const fetchAllData = useCallback(async () => {
    try {
      const [profileRes, dashRes, ordersRes] = await Promise.allSettled([
        profileService.getProfile(),
        homeService.getDashboard(),
        orderService.getOrders(1, 1),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value?.success && profileRes.value?.data) {
        setProfileData(profileRes.value.data);
      }

      let earningsVal = 0;
      let membersVal = 0;
      let ordersVal = 0;

      if (dashRes.status === 'fulfilled' && dashRes.value?.success && dashRes.value?.data) {
        const d = dashRes.value.data;
        const dEarnings = d.wallet?.total_revenue ?? d.wallet?.wallet_balance;
        if (dEarnings !== undefined && dEarnings !== null) {
          earningsVal = Number(dEarnings);
        }
        if (d.team?.total_members !== undefined) {
          membersVal = Number(d.team.total_members);
        }
        if (d.orders?.total_orders !== undefined) {
          ordersVal = Number(d.orders.total_orders);
        }
      }

      // If orders API returned total orders, use it for 100% accurate count
      if (ordersRes.status === 'fulfilled' && ordersRes.value?.success && ordersRes.value?.total !== undefined) {
        ordersVal = Number(ordersRes.value.total);
      }

      // Fallback for earnings from profile wallet_balance if dashboard is 0
      const profBal =
        profileRes.status === 'fulfilled' && profileRes.value?.data?.wallet_balance !== undefined
          ? profileRes.value.data.wallet_balance
          : currentUser?.wallet_balance;
      if (earningsVal === 0 && profBal) {
        earningsVal = Number(profBal);
      }

      setStatsData({
        earnings: earningsVal,
        members: membersVal,
        orders: ordersVal,
      });
    } catch (err) {
      console.log('Profile fetchAllData error:', err.message);
    }
  }, [currentUser?.wallet_balance]);

  // Sync profile & stats when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [fetchAllData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    if (refreshProfile) await refreshProfile();
    setRefreshing(false);
  }, [fetchAllData, refreshProfile]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const handleMenuItemPress = (item) => {
    if (item.route) {
      navigation.navigate(item.route);
    } else if (item.label === 'Contact Us') {
      Alert.alert(
        'Contact Support',
        'Have questions or need assistance? Reach out to our dedicated support team:\n\nEmail: support@divyashakti.com\nHelpline: +91 98765 43210\nHours: Mon - Sat (9:00 AM - 7:00 PM)',
        [{ text: 'OK', style: 'default' }]
      );
    } else {
      Alert.alert(item.label, `${item.label} will be available soon!`);
    }
  };

  const displayEarnings =
    statsData.earnings !== null
      ? `₹${Number(statsData.earnings).toLocaleString('en-IN')}`
      : currentUser?.wallet_balance !== undefined
        ? `₹${Number(currentUser.wallet_balance).toLocaleString('en-IN')}`
        : '₹0';

  const displayMembers = String(statsData.members ?? 0);

  const displayOrders =
    statsData.orders !== null ? String(statsData.orders) : '0';

  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'DS';

  const avatarUri = currentUser?.profile_image || currentUser?.image;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#E64A78']}
            tintColor="#E64A78"
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.editAvatar}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{currentUser?.name || 'User'}</Text>
          <Text style={styles.profilePhone}>
            {currentUser?.phone || currentUser?.mobile
              ? `+91 ${currentUser?.phone || currentUser?.mobile}`
              : ''}
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.levelBadge}>
              <Ionicons name="star" size={11} color="#C89738" />
              <Text style={styles.levelText}>
                {currentUser?.referral_code
                  ? `Ref: ${currentUser.referral_code}`
                  : 'Member'}
              </Text>
            </View>

            {currentUser?.gender ? (
              <View style={styles.genderBadge}>
                <Ionicons
                  name={
                    currentUser.gender.toLowerCase() === 'female'
                      ? 'female-outline'
                      : currentUser.gender.toLowerCase() === 'male'
                      ? 'male-outline'
                      : 'person-outline'
                  }
                  size={11}
                  color="#E64A78"
                />
                <Text style={styles.genderBadgeText}>
                  {currentUser.gender.charAt(0).toUpperCase() +
                    currentUser.gender.slice(1).toLowerCase()}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          {[
            {
              label: 'Earnings',
              value: displayEarnings,
              onPress: () => navigation.navigate('Wallet'),
            },
            {
              label: 'Members',
              value: displayMembers,
              onPress: () => navigation.navigate('Network'),
            },
            {
              label: 'Orders',
              value: displayOrders,
              onPress: () => navigation.navigate('Orders'),
            },
          ].map((s, i) => (
            <React.Fragment key={i}>
              <TouchableOpacity
                style={styles.statItem}
                onPress={s.onPress}
                activeOpacity={s.onPress ? 0.7 : 1}
                disabled={!s.onPress}
              >
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </TouchableOpacity>
              {i < 2 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Menu Sections */}
        {MENU_SECTIONS.map((section, si) => (
          <View key={si} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[
                    styles.menuItem,
                    ii < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={() => handleMenuItemPress(item)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={15} color="#9E8E93" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#E64A78" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Divya Shakti v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF7F8' },
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#2A1E24',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  avatarText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
  },
  editAvatar: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#E64A78',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FAF7F8',
  },
  profileName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#2A1E24',
    marginBottom: 4,
  },
  profilePhone: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#9E8E93',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(200,151,56,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200,151,56,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#C89738',
  },
  genderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(230,74,120,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(230,74,120,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  genderBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#E64A78',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#2A1E24',
  },
  statLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#9E8E93',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#F0EAED',
  },
  menuSection: { marginBottom: 20 },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#9E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 2,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#FAF7F8',
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#2A1E24',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF0F4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(230,74,120,0.2)',
  },
  logoutText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#E64A78',
  },
  version: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#C5B8BD',
    textAlign: 'center',
  },
});