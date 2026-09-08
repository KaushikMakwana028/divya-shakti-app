import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import walletService from '../services/walletService';
import { useAuth } from '../contexts/AuthContext';

const PRESET_AMOUNTS = [500, 1000, 2000, 5000];

export default function WalletScreen({ navigation }) {
  const { user } = useAuth();

  // Screen State
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [depositRequests, setDepositRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'deposits'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Deposit Request Modal State
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('1000');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'online'
  const [depositRemark, setDepositRemark] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  // Image Picker Modal
  const [pickerModalVisible, setPickerModalVisible] = useState(false);

  // ─────────────────────────────────────────
  // Fetch All Wallet Data
  // ─────────────────────────────────────────
  const fetchWalletData = useCallback(async () => {
    try {
      const [balRes, txnsRes, depRes] = await Promise.all([
        walletService.getWalletBalance(),
        walletService.getWalletTransactions(1, 30),
        walletService.getDepositRequests(1, 30),
      ]);

      if (balRes.success) {
        setBalance(balRes.balance);
      }
      if (txnsRes.success) {
        setTransactions(txnsRes.transactions);
      }
      if (depRes.success) {
        setDepositRequests(depRes.requests);
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWalletData();
  }, [fetchWalletData]);

  // ─────────────────────────────────────────
  // Proof Image Picking
  // ─────────────────────────────────────────
  const handlePickCamera = async () => {
    setPickerModalVisible(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to capture payment receipt.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofFile(result.assets[0]);
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const handlePickGallery = async () => {
    setPickerModalVisible(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required to select payment receipt.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofFile(result.assets[0]);
      }
    } catch (err) {
      console.error('Gallery error:', err);
    }
  };

  // ─────────────────────────────────────────
  // Submit Deposit Request
  // ─────────────────────────────────────────
  const handleSubmitDeposit = async () => {
    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid deposit amount.');
      return;
    }

    if (paymentMethod === 'online' && !proofFile) {
      Alert.alert('Proof Required', 'Please attach a payment receipt screenshot for online deposits.');
      return;
    }

    setSubmittingDeposit(true);
    try {
      const res = await walletService.requestWalletDeposit({
        amount: amountNum,
        payment_method: paymentMethod,
        remark: depositRemark.trim(),
        proof_file: proofFile,
      });

      if (res.success) {
        Alert.alert(
          'Request Submitted',
          'Your wallet deposit request has been submitted successfully and is pending admin approval.'
        );
        setDepositModalVisible(false);
        setProofFile(null);
        setDepositRemark('');
        setActiveTab('deposits');
        fetchWalletData();
      } else {
        Alert.alert('Submission Failed', res.message || 'Unable to submit deposit request.');
      }
    } catch (err) {
      console.error('Deposit submit error:', err);
      Alert.alert('Error', 'An unexpected error occurred while submitting.');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  // Format Helper for Source
  const formatSource = (source) => {
    if (!source) return 'Transaction';
    return source
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Format Date Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr.replace(' ', 'T'));
      return date.toLocaleDateString('en-IN', {
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
          <Text style={styles.headerTitle}>My Wallet</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#E64A78" />
          <Text style={styles.loaderText}>Loading Wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#2A1E24" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={20} color="#2A1E24" />
        </TouchableOpacity>
      </View>

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
        {/* ── Balance Hero Card ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.goldBadge}>
              <Ionicons name="star" size={11} color="#C89738" />
              <Text style={styles.goldBadgeText}>Member Wallet</Text>
            </View>
            <Ionicons name="wallet-outline" size={26} color="rgba(255,255,255,0.7)" />
          </View>

          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceValue}>
            ₹ {balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>

          {/* Action Buttons */}
          <View style={styles.heroActionRow}>
            <TouchableOpacity
              style={styles.depositBtn}
              onPress={() => setDepositModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.depositBtnText}>Deposit Money</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => setActiveTab('transactions')}
              activeOpacity={0.8}
            >
              <Ionicons name="time-outline" size={16} color="#FFFFFF" />
              <Text style={styles.historyBtnText}>History</Text>
            </TouchableOpacity>
          </View>

          {/* Decorative Circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
        </View>

        {/* ── Segmented Tab Selector ── */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'transactions' && styles.tabBtnActive]}
            onPress={() => setActiveTab('transactions')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="swap-horizontal-outline"
              size={16}
              color={activeTab === 'transactions' ? '#FFFFFF' : '#9E8E93'}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'transactions' && styles.tabBtnTextActive,
              ]}
            >
              Transactions ({transactions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'deposits' && styles.tabBtnActive]}
            onPress={() => setActiveTab('deposits')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cash-outline"
              size={16}
              color={activeTab === 'deposits' ? '#FFFFFF' : '#9E8E93'}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'deposits' && styles.tabBtnTextActive,
              ]}
            >
              Deposit Requests ({depositRequests.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Tab 1: Transactions List ── */}
        {activeTab === 'transactions' && (
          <View style={styles.listSection}>
            {transactions.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="receipt-outline" size={40} color="#E64A78" />
                </View>
                <Text style={styles.emptyTitle}>No Transactions Yet</Text>
                <Text style={styles.emptyDesc}>
                  Your wallet transaction activity will be displayed here.
                </Text>
              </View>
            ) : (
              transactions.map((txn) => {
                const isCredit = txn.type === 'credit';
                return (
                  <View key={txn.id} style={styles.txnCard}>
                    <View
                      style={[
                        styles.txnIconBox,
                        isCredit ? styles.txnCreditIcon : styles.txnDebitIcon,
                      ]}
                    >
                      <Ionicons
                        name={isCredit ? 'arrow-down' : 'arrow-up'}
                        size={18}
                        color={isCredit ? '#27A462' : '#EF4444'}
                      />
                    </View>

                    <View style={styles.txnInfoCol}>
                      <Text style={styles.txnSource}>{formatSource(txn.source)}</Text>
                      {txn.remark ? (
                        <Text style={styles.txnRemark} numberOfLines={2}>
                          {txn.remark}
                        </Text>
                      ) : null}
                      <Text style={styles.txnDate}>{formatDate(txn.created_at)}</Text>
                    </View>

                    <View style={styles.txnAmountCol}>
                      <Text
                        style={[
                          styles.txnAmount,
                          isCredit ? styles.txnCreditText : styles.txnDebitText,
                        ]}
                      >
                        {isCredit ? '+' : '-'} ₹{txn.amount.toLocaleString('en-IN')}
                      </Text>
                      <View
                        style={[
                          styles.txnTypeBadge,
                          isCredit ? styles.txnTypeCredit : styles.txnTypeDebit,
                        ]}
                      >
                        <Text
                          style={[
                            styles.txnTypeBadgeText,
                            isCredit ? styles.txnTypeCreditText : styles.txnTypeDebitText,
                          ]}
                        >
                          {isCredit ? 'CREDIT' : 'DEBIT'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── Tab 2: Deposit Requests List ── */}
        {activeTab === 'deposits' && (
          <View style={styles.listSection}>
            {depositRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="card-outline" size={40} color="#E64A78" />
                </View>
                <Text style={styles.emptyTitle}>No Deposit Requests</Text>
                <Text style={styles.emptyDesc}>
                  You have not submitted any wallet deposit requests yet.
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setDepositModalVisible(true)}
                >
                  <Text style={styles.emptyActionBtnText}>+ Deposit Money</Text>
                </TouchableOpacity>
              </View>
            ) : (
              depositRequests.map((req) => {
                const isApproved = req.status === 'approved';
                const isPending = req.status === 'pending';
                const isRejected = req.status === 'rejected';

                return (
                  <View key={req.id} style={styles.depositCard}>
                    <View style={styles.depositTopRow}>
                      <View style={styles.depositMethodWrap}>
                        <Ionicons
                          name={req.payment_method === 'online' ? 'card-outline' : 'cash-outline'}
                          size={18}
                          color="#E64A78"
                        />
                        <Text style={styles.depositMethodText}>
                          {req.payment_method === 'online' ? 'Online Payment' : 'Cash Deposit'}
                        </Text>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          isApproved && styles.statusApproved,
                          isPending && styles.statusPending,
                          isRejected && styles.statusRejected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isApproved && styles.statusApprovedText,
                            isPending && styles.statusPendingText,
                            isRejected && styles.statusRejectedText,
                          ]}
                        >
                          {isApproved
                            ? '✓ Approved'
                            : isPending
                            ? '⏳ Pending Approval'
                            : '✕ Rejected'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.depositMiddleRow}>
                      <View>
                        <Text style={styles.depositAmountLabel}>Requested Amount</Text>
                        <Text style={styles.depositAmountValue}>
                          ₹ {req.amount.toLocaleString('en-IN')}
                        </Text>
                      </View>

                      {req.proof_file ? (
                        <View style={styles.proofThumbWrap}>
                          <Image
                            source={{ uri: req.proof_file }}
                            style={styles.proofThumb}
                            resizeMode="cover"
                          />
                        </View>
                      ) : null}
                    </View>

                    {req.remark ? (
                      <Text style={styles.depositRemark}>
                        <Text style={{ fontFamily: 'Poppins_600SemiBold' }}>Note: </Text>
                        {req.remark}
                      </Text>
                    ) : null}

                    <Text style={styles.depositDate}>{formatDate(req.created_at)}</Text>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Modal: Request Wallet Deposit ── */}
      <Modal
        visible={depositModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDepositModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalIndicator} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Deposit Money</Text>
              <TouchableOpacity onPress={() => setDepositModalVisible(false)}>
                <Ionicons name="close" size={22} color="#2A1E24" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Amount Input */}
              <Text style={styles.fieldLabel}>Enter Deposit Amount (₹) *</Text>
              <View style={styles.amountInputWrap}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#9E8E93"
                  keyboardType="numeric"
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                />
              </View>

              {/* Quick Preset Amount Chips */}
              <View style={styles.presetsRow}>
                {PRESET_AMOUNTS.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.presetChip,
                      depositAmount === String(amt) && styles.presetChipActive,
                    ]}
                    onPress={() => setDepositAmount(String(amt))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        depositAmount === String(amt) && styles.presetChipTextActive,
                      ]}
                    >
                      +₹{amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Payment Method Selector */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Select Payment Mode *</Text>
              <View style={styles.methodSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    paymentMethod === 'cash' && styles.methodCardActive,
                  ]}
                  onPress={() => setPaymentMethod('cash')}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="cash-outline"
                    size={22}
                    color={paymentMethod === 'cash' ? '#E64A78' : '#9E8E93'}
                  />
                  <Text
                    style={[
                      styles.methodCardTitle,
                      paymentMethod === 'cash' && styles.methodCardTitleActive,
                    ]}
                  >
                    Cash
                  </Text>
                  <Text style={styles.methodCardDesc}>Pay in cash directly</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    paymentMethod === 'online' && styles.methodCardActive,
                  ]}
                  onPress={() => setPaymentMethod('online')}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="card-outline"
                    size={22}
                    color={paymentMethod === 'online' ? '#E64A78' : '#9E8E93'}
                  />
                  <Text
                    style={[
                      styles.methodCardTitle,
                      paymentMethod === 'online' && styles.methodCardTitleActive,
                    ]}
                  >
                    Online / UPI
                  </Text>
                  <Text style={styles.methodCardDesc}>Bank / UPI receipt</Text>
                </TouchableOpacity>
              </View>

              {/* Online Proof Upload Box */}
              {paymentMethod === 'online' && (
                <View style={styles.proofUploadSection}>
                  <Text style={styles.fieldLabel}>Payment Screenshot / Receipt *</Text>
                  <TouchableOpacity
                    style={styles.proofUploadBox}
                    onPress={() => setPickerModalVisible(true)}
                    activeOpacity={0.75}
                  >
                    {proofFile ? (
                      <View style={styles.proofPreviewRow}>
                        <Image source={{ uri: proofFile.uri }} style={styles.proofPreviewImg} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.proofSuccessText}>✓ Receipt Attached</Text>
                          <Text style={styles.proofChangeText}>Tap to change receipt</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={22} color="#27A462" />
                      </View>
                    ) : (
                      <View style={styles.proofPlaceholderRow}>
                        <View style={styles.proofIconBox}>
                          <Ionicons name="cloud-upload-outline" size={22} color="#E64A78" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.proofUploadTitle}>Upload Payment Receipt</Text>
                          <Text style={styles.proofUploadSubtitle}>
                            Screenshots of UPI, GPay, PhonePe, or Bank Transfer
                          </Text>
                        </View>
                        <Ionicons name="add-circle-outline" size={20} color="#E64A78" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Remark Input */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Remark (Optional)</Text>
              <TextInput
                style={styles.remarkInput}
                placeholder="e.g. Paid via GPay UTR #12345678"
                placeholderTextColor="#9E8E93"
                value={depositRemark}
                onChangeText={setDepositRemark}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, submittingDeposit && styles.submitBtnDisabled]}
                onPress={handleSubmitDeposit}
                disabled={submittingDeposit}
                activeOpacity={0.85}
              >
                {submittingDeposit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.btnRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Submit Deposit Request</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Photo Picker Modal (Camera vs Gallery) ── */}
      <Modal
        visible={pickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerModalVisible(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.modalIndicator} />
            <Text style={styles.pickerTitle}>Attach Payment Proof</Text>
            <Text style={styles.pickerSubtitle}>Select an option to proceed</Text>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={handlePickCamera}
              activeOpacity={0.75}
            >
              <View style={[styles.pickerIconBox, { backgroundColor: 'rgba(230,74,120,0.1)' }]}>
                <Ionicons name="camera-outline" size={22} color="#E64A78" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTitle}>Take Photo</Text>
                <Text style={styles.pickerOptionDesc}>Use device camera to capture receipt</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C5B8BD" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={handlePickGallery}
              activeOpacity={0.75}
            >
              <View style={[styles.pickerIconBox, { backgroundColor: 'rgba(200,151,56,0.12)' }]}>
                <Ionicons name="images-outline" size={22} color="#C89738" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.pickerOptionDesc}>Select existing screenshot or file</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C5B8BD" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerCancelBtn}
              onPress={() => setPickerModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAED',
    backgroundColor: '#FAF7F8',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#2A1E24',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#9E8E93',
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#2A1E24',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(200,151,56,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(200,151,56,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  goldBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10.5,
    color: '#C89738',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  balanceLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#C5B8BD',
    marginBottom: 4,
  },
  balanceValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  depositBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E64A78',
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  depositBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  historyBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(230,74,120,0.15)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -40,
    right: 40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(200,151,56,0.1)',
  },

  // Segmented Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 5,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: '#E64A78',
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabBtnText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#9E8E93',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
  },

  // List Section
  listSection: {
    gap: 12,
  },

  // Transactions Card
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  txnIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txnCreditIcon: {
    backgroundColor: '#E8FBF5',
  },
  txnDebitIcon: {
    backgroundColor: '#FEF2F2',
  },
  txnInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  txnSource: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#2A1E24',
    marginBottom: 2,
  },
  txnRemark: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#9E8E93',
    marginBottom: 4,
  },
  txnDate: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10.5,
    color: '#C5B8BD',
  },
  txnAmountCol: {
    alignItems: 'flex-end',
  },
  txnAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    marginBottom: 4,
  },
  txnCreditText: {
    color: '#27A462',
  },
  txnDebitText: {
    color: '#EF4444',
  },
  txnTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txnTypeCredit: {
    backgroundColor: '#E8FBF5',
  },
  txnTypeDebit: {
    backgroundColor: '#FEF2F2',
  },
  txnTypeBadgeText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  txnTypeCreditText: {
    color: '#27A462',
  },
  txnTypeDebitText: {
    color: '#EF4444',
  },

  // Deposit Request Card
  depositCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0EAED',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  depositTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  depositMethodWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  depositMethodText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#2A1E24',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusApproved: {
    backgroundColor: '#E8FBF5',
  },
  statusPending: {
    backgroundColor: '#FBF5E6',
  },
  statusRejected: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  statusApprovedText: {
    color: '#27A462',
  },
  statusPendingText: {
    color: '#C89738',
  },
  statusRejectedText: {
    color: '#EF4444',
  },
  depositMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  depositAmountLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#9E8E93',
  },
  depositAmountValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#2A1E24',
  },
  proofThumbWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  proofThumb: {
    width: '100%',
    height: '100%',
  },
  depositRemark: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#FAF7F8',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  depositDate: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10.5,
    color: '#C5B8BD',
  },

  // Empty State
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0EAED',
    marginTop: 10,
  },
  emptyIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF0F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#2A1E24',
    marginBottom: 4,
  },
  emptyDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: '#9E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActionBtn: {
    backgroundColor: '#E64A78',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  emptyActionBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  // Modal Deposit
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42,30,36,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '85%',
  },
  modalIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F0EAED',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#2A1E24',
  },
  fieldLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    color: '#2A1E24',
    marginBottom: 6,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F8',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F0EAED',
    paddingHorizontal: 16,
    height: 56,
  },
  currencySymbol: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#E64A78',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#2A1E24',
    paddingVertical: 0,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FAF7F8',
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  presetChipActive: {
    backgroundColor: 'rgba(230,74,120,0.1)',
    borderColor: '#E64A78',
  },
  presetChipText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#9E8E93',
  },
  presetChipTextActive: {
    color: '#E64A78',
    fontFamily: 'Poppins_600SemiBold',
  },
  methodSelectorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  methodCard: {
    flex: 1,
    backgroundColor: '#FAF7F8',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#F0EAED',
    alignItems: 'center',
    gap: 4,
  },
  methodCardActive: {
    backgroundColor: 'rgba(230,74,120,0.08)',
    borderColor: '#E64A78',
  },
  methodCardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#2A1E24',
  },
  methodCardTitleActive: {
    color: '#E64A78',
  },
  methodCardDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10.5,
    color: '#9E8E93',
    textAlign: 'center',
  },
  proofUploadSection: {
    marginTop: 16,
  },
  proofUploadBox: {
    backgroundColor: '#FAF7F8',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F0EAED',
    borderStyle: 'dashed',
    padding: 14,
  },
  proofPlaceholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proofIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF0F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofUploadTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#2A1E24',
  },
  proofUploadSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#9E8E93',
    marginTop: 1,
  },
  proofPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proofPreviewImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  proofSuccessText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#27A462',
  },
  proofChangeText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#E64A78',
    marginTop: 2,
  },
  remarkInput: {
    backgroundColor: '#FAF7F8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    paddingHorizontal: 14,
    height: 46,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#2A1E24',
  },
  submitBtn: {
    backgroundColor: '#E64A78',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Picker Sheet
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42,30,36,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  pickerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: '#2A1E24',
    textAlign: 'center',
  },
  pickerSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: '#9E8E93',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F8',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    marginBottom: 10,
  },
  pickerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  pickerOptionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#2A1E24',
  },
  pickerOptionDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#9E8E93',
    marginTop: 1,
  },
  pickerCancelBtn: {
    borderRadius: 12,
    backgroundColor: '#FAF7F8',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  pickerCancelText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#9E8E93',
  },
});
