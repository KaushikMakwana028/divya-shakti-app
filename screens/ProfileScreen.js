import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { showAlert } from '../contexts/AlertContext';
import profileService from '../services/profileService';
import homeService from '../services/homeService';
import orderService from '../services/orderService';
import storageService from '../services/storageService';

const MENU_SECTIONS = [
  {
    title: 'Account',
    items: [
      { icon: 'person-outline', label: 'Edit Profile', color: '#E64A78', route: 'EditProfile' },
      { icon: 'wallet-outline', label: 'My Wallet', color: '#C89738', route: 'Wallet' },
      { icon: 'arrow-up-circle-outline', label: 'Withdraw Money', color: '#0E9F6E', route: 'Withdraw' },
      { icon: 'location-outline', label: 'My Addresses', color: '#27A462', route: 'Addresses' },
      { icon: 'document-text-outline', label: 'My Orders', color: '#7B61C4', route: 'Orders' },
    ],
  },
  {
    title: 'Settings',
    items: [
      // { icon: 'information-circle-outline', label: 'About Us',          color: '#E64A78', route: 'AboutUs' },
      { icon: 'document-text-outline', label: 'Terms & Conditions', color: '#C89738', route: 'TermsConditions' },
      { icon: 'shield-checkmark-outline', label: 'Privacy Policy', color: '#0E9F6E', route: 'PrivacyPolicy' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: 'chatbubble-outline', label: 'Contact Us', color: '#E64A78', route: 'ContactUs' },
    ],
  }
];

const DELETE_CONFIRM_WORD = 'delete';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(user);
  const [statsData, setStatsData] = useState({
    walletBalance: 0,
    earnings: null,
    members: 0,
    orders: null,
    pendingAmount: 0,
  });

  // Delete account state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const currentUser = profileData || user;

  // Fetch dashboard stats (revenue, members, orders) + profile in parallel
  const fetchAllData = useCallback(async () => {
    try {
      const [dashRes, profileRes, ordersRes, pendingHoldRes] = await Promise.allSettled([
        homeService.getDashboard(),
        profileService.getProfile(),
        orderService.getOrders(1, 1),
        storageService.getPendingWithdrawAmount(),
      ]);

      const pendingHoldVal =
        pendingHoldRes.status === 'fulfilled' ? Number(pendingHoldRes.value || 0) : 0;

      if (profileRes.status === 'fulfilled' && profileRes.value?.success && profileRes.value?.data) {
        setProfileData(profileRes.value.data);
      }

      let walletBalVal = 0;
      let earningsVal = 0;
      let membersVal = 0;
      let ordersVal = 0;

      if (dashRes.status === 'fulfilled' && dashRes.value?.success && dashRes.value?.data) {
        const d = dashRes.value.data;
        if (d.wallet?.wallet_balance !== undefined && d.wallet?.wallet_balance !== null) {
          walletBalVal = Number(d.wallet.wallet_balance);
        }
        if (d.wallet?.total_revenue !== undefined && d.wallet?.total_revenue !== null) {
          earningsVal = Number(d.wallet.total_revenue);
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

      // Wallet balance from profile API or current user
      const profBal =
        profileRes.status === 'fulfilled' && profileRes.value?.data?.wallet_balance !== undefined
          ? Number(profileRes.value.data.wallet_balance)
          : currentUser?.wallet_balance !== undefined
            ? Number(currentUser.wallet_balance)
            : 0;

      if (profBal > 0 || walletBalVal === 0) {
        walletBalVal = profBal;
      }

      // Fallback for earnings from profile wallet_balance if dashboard is 0
      if (earningsVal === 0 && profBal > 0) {
        earningsVal = profBal;
      }

      setStatsData({
        walletBalance: walletBalVal,
        earnings: earningsVal,
        members: membersVal,
        orders: ordersVal,
        pendingAmount: pendingHoldVal,
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
    showAlert({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      type: 'confirm',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ],
    });
  };

  const openDeleteModal = () => {
    setDeleteConfirmText('');
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    if (deletingAccount) return; // don't allow closing mid-request
    setDeleteModalVisible(false);
    setDeleteConfirmText('');
  };

  const isDeleteConfirmed =
    deleteConfirmText.trim().toLowerCase() === DELETE_CONFIRM_WORD;

  const handleDeleteAccount = async () => {
    if (!isDeleteConfirmed || deletingAccount) return;

    setDeletingAccount(true);
    try {
      // NOTE: profileService.deleteAccount() should call:
      //   DELETE https://divyshakti.visiontechnolabs.com/api/delete-account
      // through the same axios instance used elsewhere in this app so the
      // auth token header is attached automatically. Example implementation
      // to add in services/profileService.js if it isn't there yet:
      //
      //   deleteAccount: () => api.delete('/delete-account'),
      //
      // (adjust base URL / path to match how `api` is configured)
      const response = await profileService.deleteAccount();

      if (response && response.success === false) {
        showAlert({
          title: 'Delete Account Failed',
          message: response.message || 'We could not delete your account. Please try again.',
          type: 'error',
        });
        return;
      }

      // Clear local session/storage and send the user to Login
      await logout();
      setDeleteModalVisible(false);
      setDeleteConfirmText('');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (err) {
      console.log('Delete account error:', err?.message);
      showAlert({
        title: 'Delete Account Failed',
        message: err?.response?.data?.message || 'Something went wrong. Please try again.',
        type: 'error',
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleMenuItemPress = (item) => {
    if (item.action === 'delete-account') {
      openDeleteModal();
      return;
    }
    if (item.route) {
      navigation.navigate(item.route);
    } else if (item.label === 'Contact Us') {
      showAlert({
        title: 'Contact Support',
        message: 'Have questions or need assistance? Reach out to our dedicated support team:\n\nEmail: support@divyashakti.com\nHelpline: +91 98765 43210\nHours: Mon - Sat (9:00 AM - 7:00 PM)',
        type: 'info',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } else {
      showAlert({
        title: item.label,
        message: `${item.label} will be available soon!`,
        type: 'info',
      });
    }
  };

  const currentWalletBalance =
    profileData?.wallet_balance !== undefined && profileData?.wallet_balance !== null
      ? Number(profileData.wallet_balance)
      : statsData.walletBalance > 0
        ? statsData.walletBalance
        : currentUser?.wallet_balance !== undefined
          ? Number(currentUser.wallet_balance)
          : 0;

  const displayWalletBalance = `₹${Number(currentWalletBalance).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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
              <View
                style={[
                  styles.genderBadge,
                  currentUser.gender.toLowerCase() === 'male'
                    ? styles.genderBadgeMale
                    : styles.genderBadgeFemale,
                ]}
              >
                <Ionicons
                  name={
                    currentUser.gender.toLowerCase() === 'female'
                      ? 'female-outline'
                      : 'male-outline'
                  }
                  size={11}
                  color={
                    currentUser.gender.toLowerCase() === 'male'
                      ? '#2563EB'
                      : '#E64A78'
                  }
                />
                <Text
                  style={[
                    styles.genderBadgeText,
                    currentUser.gender.toLowerCase() === 'male'
                      ? styles.genderBadgeTextMale
                      : styles.genderBadgeTextFemale,
                  ]}
                >
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

        {/* Quick Wallet & Withdraw Card */}
        <View style={styles.walletWithdrawCard}>
          <TouchableOpacity
            style={styles.walletWithdrawLeft}
            onPress={() => navigation.navigate('Wallet')}
            activeOpacity={0.7}
          >
            <View style={styles.walletWithdrawIconBox}>
              <Ionicons name="wallet-outline" size={20} color="#0E9F6E" />
            </View>
            <View style={styles.walletWithdrawInfo}>
              <Text style={styles.walletWithdrawSub} numberOfLines={1}>
                Available Balance
              </Text>
              <View style={styles.walletAmountRow}>
                <Text style={styles.walletWithdrawAmount} numberOfLines={1}>
                  {displayWalletBalance}
                </Text>
                {statsData.pendingAmount > 0 && (
                  <View style={styles.walletHoldBadge}>
                    <Ionicons name="time-outline" size={10} color="#D97706" />
                    <Text style={styles.walletHoldBadgeText}>
                      ₹{Number(statsData.pendingAmount).toLocaleString('en-IN')} held
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.walletWithdrawBtn}
            onPress={() => navigation.navigate('Withdraw')}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up-circle" size={16} color="#FFFFFF" />
            <Text style={styles.walletWithdrawBtnText}>Withdraw</Text>
          </TouchableOpacity>
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
                  <Text
                    style={[
                      styles.menuLabel,
                      item.action === 'delete-account' && styles.menuLabelDanger,
                    ]}
                  >
                    {item.label}
                  </Text>
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

        {/* Danger Zone — Delete Account (last) */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={openDeleteModal}
              activeOpacity={0.6}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#DC262615' }]}>
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </View>
              <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Delete Account</Text>
              <Ionicons name="chevron-forward" size={15} color="#9E8E93" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.version}>Divy Shakti v1.0.0</Text>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Ionicons name="warning-outline" size={26} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalDesc}>
              This action is permanent and cannot be undone. Your profile, wallet balance, and
              order history will be permanently deleted.
            </Text>
            <Text style={styles.modalInstruction}>
              Type <Text style={styles.modalInstructionBold}>delete</Text> below to confirm.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Type delete"
              placeholderTextColor="#C5B8BD"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              editable={!deletingAccount}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closeDeleteModal}
                activeOpacity={0.7}
                disabled={deletingAccount}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalDeleteBtn,
                  (!isDeleteConfirmed || deletingAccount) && styles.modalDeleteBtnDisabled,
                ]}
                onPress={handleDeleteAccount}
                activeOpacity={0.8}
                disabled={!isDeleteConfirmed || deletingAccount}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  genderBadgeMale: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderColor: 'rgba(37, 99, 235, 0.25)',
  },
  genderBadgeFemale: {
    backgroundColor: 'rgba(230, 74, 120, 0.1)',
    borderColor: 'rgba(230, 74, 120, 0.25)',
  },
  genderBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  genderBadgeTextMale: {
    color: '#2563EB',
  },
  genderBadgeTextFemale: {
    color: '#E64A78',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  walletWithdrawCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#F0EAED',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  walletWithdrawLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  walletWithdrawIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(14, 159, 110, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletWithdrawInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  walletWithdrawSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#9E8E93',
    marginBottom: 2,
  },
  walletAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  walletWithdrawAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16.5,
    color: '#2A1E24',
  },
  walletHoldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  walletHoldBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: '#B45309',
  },
  walletWithdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0E9F6E',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 13,
    shadowColor: '#0E9F6E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    flexShrink: 0,
  },
  walletWithdrawBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
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
  menuLabelDanger: {
    color: '#DC2626',
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
  // Delete account modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 30, 36, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  modalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#2A1E24',
    marginBottom: 8,
  },
  modalDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#6B5B60',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 14,
  },
  modalInstruction: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#2A1E24',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  modalInstructionBold: {
    fontFamily: 'Poppins_700Bold',
    color: '#DC2626',
  },
  modalInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#F0EAED',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#2A1E24',
    backgroundColor: '#FAF7F8',
    marginBottom: 18,
  },
  modalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0EAED',
  },
  modalCancelText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#2A1E24',
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
  },
  modalDeleteBtnDisabled: {
    backgroundColor: '#F1A9A9',
  },
  modalDeleteText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});