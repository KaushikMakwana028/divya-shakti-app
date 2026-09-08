import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import cmsService from '../services/cmsService';
import { useAuth } from '../contexts/AuthContext';

export default function DeleteAccountScreen({ navigation }) {
  const { deleteAccount, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [info, setInfo] = useState(null);

  const fetchInfo = useCallback(async () => {
    try {
      const res = await cmsService.getDeleteAccountInfo();
      if (res.success && res.data) {
        setInfo(res.data);
      }
    } catch (err) {
      console.error('DeleteAccount fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInfo();
  };

  const handlePerformDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteAccount();
      if (res.success) {
        Alert.alert(
          'Account Deleted',
          res.message || 'Your account has been deleted permanently.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              },
            },
          ]
        );
      } else {
        Alert.alert('Unable to Delete', res.message || 'Failed to delete account. Please try again or contact support.');
      }
    } catch (err) {
      console.error('Delete execution error:', err);
      Alert.alert('Error', 'An unexpected error occurred while deleting your account.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePress = () => {
    if (!confirmed) {
      Alert.alert('Confirmation Required', 'Please check the box to confirm you understand this action is permanent.');
      return;
    }

    Alert.alert(
      'Permanent Account Deletion',
      'Are you completely sure? Once confirmed, all your personal data, wallet balance, and network position will be permanently deleted and cannot be recovered.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete Permanently',
          style: 'destructive',
          onPress: handlePerformDelete,
        },
      ]
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
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loaderText}>Loading deletion information...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#EF4444']}
              tintColor="#EF4444"
            />
          }
        >
          {/* Warning Banner */}
          <View style={styles.warningBanner}>
            <View style={styles.warningIconWrapper}>
              <Ionicons name="warning" size={26} color="#DC2626" />
            </View>
            <View style={styles.warningContent}>
              <Text style={styles.warningHeading}>Irreversible Action</Text>
              <Text style={styles.warningText}>
                {info?.warning ||
                  'WARNING: This action is permanent and irreversible. Your wallet balance and referral position will be permanently lost and cannot be recovered.'}
              </Text>
            </View>
          </View>

          {/* User Account Info */}
          {user && (
            <View style={styles.userInfoCard}>
              <View style={styles.userAvatarWrapper}>
                <Ionicons name="person" size={20} color="#8C7A82" />
              </View>
              <View style={styles.userTextWrapper}>
                <Text style={styles.userName}>{user.name || 'Current User'}</Text>
                <Text style={styles.userPhone}>{user.phone || user.mobile || ''}</Text>
              </View>
            </View>
          )}

          {/* What Gets Deleted */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>
                What Gets Deleted Permanently
              </Text>
            </View>
            <View style={styles.itemList}>
              {(info?.what_gets_deleted || [
                'Profile information (name, email, phone, address)',
                'Profile image / avatar',
                'Wallet balance and full transaction history',
                'Saved shipping addresses',
                'Active and past cart data',
                'Referral code and network position',
              ]).map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={styles.dangerDot}>
                    <Ionicons name="close" size={14} color="#DC2626" />
                  </View>
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* What Is Retained */}
          {info?.what_is_retained && info.what_is_retained.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#4A7CE6" />
                <Text style={[styles.sectionTitle, { color: '#4A7CE6' }]}>
                  What Is Retained By Law
                </Text>
              </View>
              <View style={styles.itemList}>
                {info.what_is_retained.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.infoDot}>
                      <Ionicons name="checkmark" size={14} color="#2563EB" />
                    </View>
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Steps */}
          {info?.steps && info.steps.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list-outline" size={20} color="#C89738" />
                <Text style={[styles.sectionTitle, { color: '#C89738' }]}>
                  Deletion Process & Policy
                </Text>
              </View>
              <View style={styles.itemList}>
                {info.steps.map((step, idx) => (
                  <View key={idx} style={styles.stepRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>
                      {step.replace(/^Step\s*\d+:\s*/i, '')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Confirmation Checkbox */}
          <TouchableOpacity
            style={styles.confirmBox}
            activeOpacity={0.8}
            onPress={() => setConfirmed(!confirmed)}
          >
            <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
              {confirmed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={styles.confirmText}>
              I have read and understand the consequences. I acknowledge that my account and all associated data will be deleted permanently.
            </Text>
          </TouchableOpacity>

          {/* Delete Action Button */}
          <TouchableOpacity
            style={[
              styles.deleteBtn,
              (!confirmed || deleting) && styles.deleteBtnDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleDeletePress}
            disabled={!confirmed || deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                <Text style={styles.deleteBtnText}>Delete Account Permanently</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            disabled={deleting}
          >
            <Text style={styles.cancelBtnText}>Keep My Account</Text>
          </TouchableOpacity>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  warningIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningContent: {
    flex: 1,
  },
  warningHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#991B1B',
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  userAvatarWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userTextWrapper: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2A1E24',
  },
  userPhone: {
    fontSize: 13,
    color: '#8C7A82',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0EAED',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFF1',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dangerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  infoDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  itemText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#374151',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  stepText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#374151',
  },
  confirmBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0EAED',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  confirmText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#4B3F45',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteBtnDisabled: {
    backgroundColor: '#FCA5A5',
    shadowOpacity: 0,
    elevation: 0,
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8C7A82',
  },
});
