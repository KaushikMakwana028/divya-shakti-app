import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import Alert from '../services/alertService';
import depositService from '../services/depositService';
import walletService from '../services/walletService';
import { useAuth } from '../contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRESET_AMOUNTS = [100, 500, 1000, 2000, 5000];

export default function DepositScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);

  // Screen & Settings State
  const [activeTab, setActiveTab] = useState('deposit'); // 'deposit' | 'history'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);

  // Payment settings from API
  const [settings, setSettings] = useState({
    qrCodeUrl: null,
    upiId: '',
    upiName: '',
    hasUpi: false,
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    accountType: 'Current',
    branchName: '',
    hasBank: false,
    instructions: '',
    minDepositAmount: 10,
    formattedMinDeposit: '₹10.00',
    walletBalance: 0,
  });

  const [walletBalance, setWalletBalance] = useState(0);

  // Form State
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [proofImage, setProofImage] = useState(null);

  // Copy feedback state
  const [copiedField, setCopiedField] = useState(null);

  // History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [qrZoomVisible, setQrZoomVisible] = useState(false);

  // ─────────────────────────────────────────
  // Fetch All Deposit Data
  // ─────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, balRes, histRes] = await Promise.all([
        depositService.getPaymentSettings(),
        walletService.getWalletBalance(),
        depositService.getDepositHistory(1, 30),
      ]);

      if (settingsRes.success) {
        setSettings(settingsRes);
      }

      if (balRes.success) {
        setWalletBalance(balRes.balance);
      } else if (settingsRes.success) {
        setWalletBalance(settingsRes.walletBalance || 0);
      }

      if (histRes.success) {
        setHistory(histRes.requests || []);
      }
    } catch (err) {
      console.error('DepositScreen fetchData error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setHistoryLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ─────────────────────────────────────────
  // Copy Helpers with visual feedback
  // ─────────────────────────────────────────
  const copyToClipboard = async (text, fieldName) => {
    if (!text) return;
    try {
      await Clipboard.setStringAsync(String(text));
      setCopiedField(fieldName);
      Alert.alert('Copied!', `${fieldName} copied to clipboard.`);
      setTimeout(() => setCopiedField(null), 2500);
    } catch (err) {
      Alert.alert('Copy Failed', 'Unable to copy text to clipboard.');
    }
  };

  const copyAllBankDetails = async () => {
    const text = [
      `Bank: ${settings.bankName || 'N/A'}`,
      `Account Holder: ${settings.accountHolderName || 'N/A'}`,
      `Account Number: ${settings.accountNumber || 'N/A'}`,
      `IFSC Code: ${settings.ifscCode || 'N/A'}`,
      `Account Type: ${settings.accountType || 'N/A'}`,
      settings.branchName ? `Branch: ${settings.branchName}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await copyToClipboard(text, 'All Bank Details');
  };

  // ─────────────────────────────────────────
  // Download / Save QR Code Image
  // ─────────────────────────────────────────
  const handleDownloadQr = async () => {
    const qrUrl = settings.qrCodeUrl;
    if (!qrUrl) {
      Alert.alert('Notice', 'Admin has not uploaded a payment QR code yet.');
      return;
    }

    try {
      setDownloadingQr(true);

      const filename = `divy_shakti_qr_${Date.now()}.png`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      // Download file to local cache
      const downloadResult = await FileSystem.downloadAsync(qrUrl, fileUri);

      // Check Media Library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        await MediaLibrary.createAlbumAsync('Divy Shakti', asset, false);
        Alert.alert(
          'QR Code Saved',
          'Payment QR Code has been saved to your Photo Gallery successfully!'
        );
      } else {
        // Fallback: share the file so user can save or open in payment apps
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'image/png',
            dialogTitle: 'Save or Share Payment QR Code',
          });
        } else {
          Alert.alert(
            'Saved to Device',
            'QR code saved to device cache. Please grant Photos permission to save directly to Gallery.'
          );
        }
      }
    } catch (err) {
      console.error('QR download error:', err);
      // Attempt sharing as fallback
      try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare && settings.qrCodeUrl) {
          await Sharing.shareAsync(settings.qrCodeUrl);
        } else {
          Alert.alert('Download Error', 'Could not save QR code. Please take a screenshot instead.');
        }
      } catch (_) {
        Alert.alert('Download Error', 'Failed to save QR Code image.');
      }
    } finally {
      setDownloadingQr(false);
    }
  };

  // ─────────────────────────────────────────
  // Image Picker for Payment Screenshot
  // ─────────────────────────────────────────
  const handlePickProof = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photos to upload payment receipt screenshot.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setProofImage({
          uri: asset.uri,
          name: asset.fileName || `proof_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
          fileSize: asset.fileSize,
        });
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Failed to pick image from gallery.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Camera Permission',
          'Please allow camera access to capture payment receipt photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setProofImage({
          uri: asset.uri,
          name: asset.fileName || `camera_proof_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
          fileSize: asset.fileSize,
        });
      }
    } catch (err) {
      console.error('Camera capture error:', err);
      Alert.alert('Error', 'Failed to capture photo.');
    }
  };

  // ─────────────────────────────────────────
  // Submit Deposit Request
  // ─────────────────────────────────────────
  const handleSubmitDeposit = async () => {
    Keyboard.dismiss();
    const numAmount = parseFloat(amount);
    const minAmount = settings.minDepositAmount || 10;

    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid deposit amount.');
      return;
    }

    if (numAmount < minAmount) {
      Alert.alert(
        'Minimum Deposit Limit',
        `The minimum deposit amount is ₹${minAmount.toLocaleString('en-IN')}. Please enter an amount equal to or greater than ₹${minAmount}.`
      );
      return;
    }

    if (!proofImage || !proofImage.uri) {
      Alert.alert(
        'Proof Required',
        'Please upload a screenshot or photo of your payment transaction receipt to verify your deposit.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const res = await depositService.requestDeposit({
        amount: numAmount,
        payment_method: 'online',
        remark: remark.trim(),
        proof_file: proofImage,
      });

      if (res.success) {
        Alert.alert(
          'Request Submitted!',
          `Your deposit request of ₹${numAmount.toLocaleString('en-IN')} has been submitted successfully.\n\nOur administrator will verify the receipt and credit your wallet shortly.`
        );
        // Reset form
        setAmount('');
        setRemark('');
        setProofImage(null);
        // Refresh and switch to history
        fetchData();
        setActiveTab('history');
      } else {
        Alert.alert('Submission Failed', res.message || 'Unable to submit deposit request.');
      }
    } catch (err) {
      console.error('Deposit submission error:', err);
      Alert.alert('Error', 'Something went wrong while submitting deposit request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Accent colour per status (used for history card accent bar)
  const getStatusColor = (status) => {
    const s = String(status).toLowerCase();
    if (s === 'approved') return '#0E9F6E';
    if (s === 'rejected') return '#EF4444';
    return '#D97706';
  };

  // Helper for status badge
  const renderStatusBadge = (status) => {
    const s = String(status).toLowerCase();
    if (s === 'approved') {
      return (
        <View style={[styles.badge, styles.badgeApproved]}>
          <Ionicons name="checkmark-circle" size={13} color="#0E9F6E" />
          <Text style={[styles.badgeText, styles.badgeTextApproved]}>Approved</Text>
        </View>
      );
    }
    if (s === 'rejected') {
      return (
        <View style={[styles.badge, styles.badgeRejected]}>
          <Ionicons name="close-circle" size={13} color="#EF4444" />
          <Text style={[styles.badgeText, styles.badgeTextRejected]}>Rejected</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgePending]}>
        <Ionicons name="time" size={13} color="#D97706" />
        <Text style={[styles.badgeText, styles.badgeTextPending]}>Pending</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#2A1E24" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deposit Money</Text>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={19} color="#E64A78" />
        </TouchableOpacity>
      </View>

      {/* Segmented Tabs */}
      <View style={styles.tabWrap}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'deposit' && styles.tabItemActive]}
            onPress={() => setActiveTab('deposit')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'deposit' ? 'wallet' : 'wallet-outline'}
              size={16}
              color={activeTab === 'deposit' ? '#E64A78' : '#9E8E93'}
            />
            <Text style={[styles.tabText, activeTab === 'deposit' && styles.tabTextActive]}>
              Make Deposit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'history' ? 'time' : 'time-outline'}
              size={16}
              color={activeTab === 'history' ? '#E64A78' : '#9E8E93'}
            />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              History
            </Text>
            {history.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{history.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E64A78" />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: activeTab === 'deposit' ? 220 : 40 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E64A78']} />
            }
          >
            {activeTab === 'deposit' ? (
              <>
                {/* Wallet Balance Hero Card */}
                <View style={styles.balanceHeroCard}>
                  <View style={styles.heroCircleA} />
                  <View style={styles.heroCircleB} />
                  <View style={styles.balanceHeroLeft}>
                    <Text style={styles.balanceHeroLabel}>AVAILABLE BALANCE</Text>
                    <Text
                      style={styles.balanceHeroValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                    >
                      ₹{Number(walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                    <View style={styles.heroMinPill}>
                      <Ionicons name="shield-checkmark-outline" size={12} color="#FFD7E3" />
                      <Text style={styles.heroMinPillText}>
                        Min. deposit {settings.formattedMinDeposit}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.balanceHeroIconBox}>
                    <Ionicons name="wallet" size={26} color="#FFFFFF" />
                  </View>
                </View>

                {/* ──────── STEP 1: PAYMENT INFORMATION CARD ──────── */}
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepNumber}>1</Text>
                  </View>
                  <View style={styles.sectionHeaderContent}>
                    <Text style={styles.sectionTitle}>Admin Payment Details</Text>
                    <Text style={styles.sectionSubtitle}>
                      Pay using QR Code, UPI ID, or Bank Account
                    </Text>
                  </View>
                </View>

                {/* No Payment Details Notice if unconfigured */}
                {!settings.qrCodeUrl && !settings.upiId && !settings.accountNumber && !settings.bankName ? (
                  <View style={styles.noPaymentCard}>
                    <View style={styles.noPaymentIconBox}>
                      <Ionicons name="information-circle-outline" size={24} color="#C89738" />
                    </View>
                    <View style={styles.noPaymentContent}>
                      <Text style={styles.noPaymentTitle}>Admin Details Being Configured</Text>
                      <Text style={styles.noPaymentText}>
                        Payment QR, UPI, and Bank details are being updated by the administrator. If you already have official transfer details, please complete your payment and upload the transaction screenshot below.
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* QR Code Section */}
                {settings.qrCodeUrl ? (
                  <View style={styles.qrCard}>
                    <View style={styles.qrHeaderRow}>
                      <View style={styles.qrHeaderBadge}>
                        <Ionicons name="qr-code" size={14} color="#C89738" />
                        <Text style={styles.qrHeaderBadgeText}>Scan & Pay</Text>
                      </View>
                      <View style={styles.qrTapHint}>
                        <Ionicons name="scan-outline" size={13} color="#9E8E93" />
                        <Text style={styles.qrTapHintText}>Tap QR to zoom</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.qrImageContainer}
                      onPress={() => setQrZoomVisible(true)}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={{ uri: settings.qrCodeUrl }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>

                    <Text style={styles.qrAppHint}>Works with GPay, PhonePe, Paytm & BHIM</Text>

                    {/* Download QR Button */}
                    <TouchableOpacity
                      style={styles.downloadQrBtn}
                      onPress={handleDownloadQr}
                      disabled={downloadingQr}
                      activeOpacity={0.8}
                    >
                      {downloadingQr ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.downloadQrBtnText}>Save QR to Gallery</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* UPI ID Section */}
                {settings.upiId ? (
                  <View style={styles.infoCard}>
                    <View style={styles.infoCardHeader}>
                      <View style={styles.infoIconBoxUpi}>
                        <Ionicons name="flash" size={18} color="#8B5CF6" />
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.infoCardTitle}>UPI ID (VPA)</Text>
                        {settings.upiName ? (
                          <Text style={styles.infoCardSub}>{settings.upiName}</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.copyBox}>
                      <View style={styles.copyBoxTextWrap}>
                        <Text style={styles.copyBoxLabel}>UPI ADDRESS</Text>
                        <Text style={styles.copyBoxValue} numberOfLines={1} selectable>
                          {settings.upiId}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.copyBtn,
                          copiedField === 'UPI ID' && styles.copyBtnSuccess,
                        ]}
                        onPress={() => copyToClipboard(settings.upiId, 'UPI ID')}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={copiedField === 'UPI ID' ? 'checkmark' : 'copy-outline'}
                          size={15}
                          color={copiedField === 'UPI ID' ? '#FFFFFF' : '#8B5CF6'}
                        />
                        <Text
                          style={[
                            styles.copyBtnText,
                            copiedField === 'UPI ID' && styles.copyBtnTextSuccess,
                          ]}
                        >
                          {copiedField === 'UPI ID' ? 'Copied' : 'Copy'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {/* Bank Account Section */}
                {settings.accountNumber || settings.bankName ? (
                  <View style={styles.infoCard}>
                    <View style={styles.infoCardHeader}>
                      <View style={styles.infoIconBoxBank}>
                        <Ionicons name="business" size={18} color="#C89738" />
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.infoCardTitle}>Bank Transfer Details</Text>
                        <Text style={styles.infoCardSub} numberOfLines={1}>
                          {settings.bankName || 'Direct NEFT / IMPS / RTGS'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.copyAllBtn}
                        onPress={copyAllBankDetails}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="copy-outline" size={13} color="#C89738" />
                        <Text style={styles.copyAllBtnText}>Copy All</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.bankFieldsList}>
                      {settings.bankName ? (
                        <View style={styles.bankFieldRow}>
                          <Text style={styles.bankFieldLabel}>Bank Name</Text>
                          <Text style={styles.bankFieldValue}>{settings.bankName}</Text>
                        </View>
                      ) : null}

                      {settings.accountHolderName ? (
                        <View style={styles.bankFieldRow}>
                          <Text style={styles.bankFieldLabel}>A/C Holder</Text>
                          <Text style={styles.bankFieldValue}>{settings.accountHolderName}</Text>
                        </View>
                      ) : null}

                      {settings.accountNumber ? (
                        <View style={styles.bankFieldRowHighlight}>
                          <View style={styles.flex}>
                            <Text style={styles.bankFieldLabel}>Account Number</Text>
                            <Text style={styles.bankFieldValueBold} selectable>
                              {settings.accountNumber}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.fieldCopyIconBtn}
                            onPress={() => copyToClipboard(settings.accountNumber, 'Account Number')}
                          >
                            <Ionicons
                              name={copiedField === 'Account Number' ? 'checkmark' : 'copy-outline'}
                              size={16}
                              color={copiedField === 'Account Number' ? '#0E9F6E' : '#C89738'}
                            />
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      {settings.ifscCode ? (
                        <View style={styles.bankFieldRowHighlight}>
                          <View style={styles.flex}>
                            <Text style={styles.bankFieldLabel}>IFSC Code</Text>
                            <Text style={styles.bankFieldValueBold} selectable>
                              {settings.ifscCode}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.fieldCopyIconBtn}
                            onPress={() => copyToClipboard(settings.ifscCode, 'IFSC Code')}
                          >
                            <Ionicons
                              name={copiedField === 'IFSC Code' ? 'checkmark' : 'copy-outline'}
                              size={16}
                              color={copiedField === 'IFSC Code' ? '#0E9F6E' : '#C89738'}
                            />
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      {settings.accountType ? (
                        <View style={styles.bankFieldRow}>
                          <Text style={styles.bankFieldLabel}>Account Type</Text>
                          <Text style={styles.bankFieldValue}>{settings.accountType}</Text>
                        </View>
                      ) : null}

                      {settings.branchName ? (
                        <View style={styles.bankFieldRow}>
                          <Text style={styles.bankFieldLabel}>Branch</Text>
                          <Text style={styles.bankFieldValue}>{settings.branchName}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {/* Instructions Card */}
                {settings.instructions ? (
                  <View style={styles.instructionCard}>
                    <View style={styles.instructionHeader}>
                      <Ionicons name="information-circle" size={18} color="#C89738" />
                      <Text style={styles.instructionTitle}>Payment Instructions</Text>
                    </View>
                    <Text style={styles.instructionBody}>{settings.instructions}</Text>
                  </View>
                ) : null}

                {/* ──────── STEP 2: SUBMIT DEPOSIT FORM ──────── */}
                <View style={[styles.sectionHeaderRow, styles.sectionHeaderRowSpaced]}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepNumber}>2</Text>
                  </View>
                  <View style={styles.sectionHeaderContent}>
                    <Text style={styles.sectionTitle}>Submit Proof of Payment</Text>
                    <Text style={styles.sectionSubtitle}>
                      Enter amount and attach payment screenshot
                    </Text>
                  </View>
                </View>

                <View style={styles.formCard}>
                  {/* Amount Input */}
                  <Text style={styles.inputLabel}>Deposit Amount</Text>
                  <View style={styles.amountInputWrap}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0"
                      placeholderTextColor="#D5C9CE"
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={setAmount}
                      maxLength={9}
                      returnKeyType="done"
                    />
                    {amount ? (
                      <TouchableOpacity
                        onPress={() => setAmount('')}
                        style={styles.amountClearBtn}
                      >
                        <Ionicons name="close-circle" size={20} color="#C5B8BD" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Quick Preset Buttons */}
                  <View style={styles.presetRow}>
                    {PRESET_AMOUNTS.map((pVal) => (
                      <TouchableOpacity
                        key={pVal}
                        style={[
                          styles.presetChip,
                          amount === String(pVal) && styles.presetChipActive,
                        ]}
                        onPress={() => setAmount(String(pVal))}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            amount === String(pVal) && styles.presetChipTextActive,
                          ]}
                        >
                          ₹{pVal.toLocaleString('en-IN')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.minLimitBadge}>
                    <Ionicons name="information-circle-outline" size={14} color="#9E8E93" />
                    <Text style={styles.minLimitText}>
                      Minimum deposit: {settings.formattedMinDeposit}
                    </Text>
                  </View>

                  <View style={styles.formDivider} />

                  {/* Proof Screenshot Upload */}
                  <Text style={styles.inputLabel}>Payment Screenshot (Receipt)</Text>
                  {proofImage ? (
                    <View style={styles.proofPreviewCard}>
                      <Image
                        source={{ uri: proofImage.uri }}
                        style={styles.proofThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.proofInfo}>
                        <View style={styles.proofSuccessRow}>
                          <Ionicons name="checkmark-circle" size={16} color="#0E9F6E" />
                          <Text style={styles.proofSuccessText}>Screenshot Attached</Text>
                        </View>
                        <Text style={styles.proofFilename} numberOfLines={1}>
                          {proofImage.name}
                        </Text>
                        <View style={styles.proofBtnRow}>
                          <TouchableOpacity
                            style={styles.proofChangeBtn}
                            onPress={handlePickProof}
                          >
                            <Ionicons name="swap-horizontal" size={13} color="#E64A78" />
                            <Text style={styles.proofChangeBtnText}>Change</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.proofRemoveBtn}
                            onPress={() => setProofImage(null)}
                          >
                            <Ionicons name="trash-outline" size={13} color="#EF4444" />
                            <Text style={styles.proofRemoveBtnText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.uploadOptionsRow}>
                      <TouchableOpacity
                        style={styles.uploadDropzone}
                        onPress={handlePickProof}
                        activeOpacity={0.8}
                      >
                        <View style={styles.uploadIconBox}>
                          <Ionicons name="images-outline" size={24} color="#E64A78" />
                        </View>
                        <Text style={styles.uploadTitle}>From Gallery</Text>
                        <Text style={styles.uploadSub}>PNG, JPG or JPEG</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.uploadDropzone}
                        onPress={handleTakePhoto}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.uploadIconBox, styles.uploadIconBoxAlt]}>
                          <Ionicons name="camera-outline" size={24} color="#374151" />
                        </View>
                        <Text style={styles.uploadTitle}>Take Photo</Text>
                        <Text style={styles.uploadSub}>Capture receipt</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* UTR / Note Input */}
                  <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>
                    UTR / Reference ID <Text style={styles.optionalText}>(Optional)</Text>
                  </Text>
                  <TextInput
                    style={styles.textInputRemark}
                    placeholder="e.g. UTR / UPI Ref No. 423985472190"
                    placeholderTextColor="#C5B8BD"
                    value={remark}
                    onChangeText={setRemark}
                    returnKeyType="done"
                  />

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      (!amount || !proofImage || submitting) && styles.submitBtnDisabled,
                    ]}
                    onPress={handleSubmitDeposit}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>Submit Deposit Request</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={styles.secureNote}>
                    <Ionicons name="lock-closed-outline" size={12} color="#9E8E93" />
                    <Text style={styles.secureNoteText}>
                      Your wallet is credited after admin verifies the receipt
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              /* ──────── DEPOSIT HISTORY TAB ──────── */
              <View>
                {history.length === 0 ? (
                  <View style={styles.emptyHistoryBox}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name="receipt-outline" size={36} color="#E64A78" />
                    </View>
                    <Text style={styles.emptyHistoryTitle}>No Deposit Requests</Text>
                    <Text style={styles.emptyHistorySub}>
                      You haven't submitted any deposit requests yet. Switch to "Make Deposit" to add funds to your wallet.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyDepositBtn}
                      onPress={() => setActiveTab('deposit')}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.emptyDepositBtnText}>Make a Deposit</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.historyList}>
                    {history.map((req) => (
                      <TouchableOpacity
                        key={req.id}
                        style={styles.historyCard}
                        onPress={() => {
                          setSelectedRequest(req);
                          setDetailsModalVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.historyAccent,
                            { backgroundColor: getStatusColor(req.status) },
                          ]}
                        />

                        <View style={styles.historyBody}>
                          <View style={styles.historyTopRow}>
                            <View style={styles.historyIdBox}>
                              <Ionicons name="arrow-down-circle" size={14} color="#9E8E93" />
                              <Text style={styles.historyIdText}>Deposit Request</Text>
                            </View>
                            {renderStatusBadge(req.status)}
                          </View>

                          <Text
                            style={styles.historyAmountValue}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}
                          >
                            {req.formatted_amount || `₹${Number(req.amount).toFixed(2)}`}
                          </Text>

                          {req.remark ? (
                            <Text style={styles.historyRemark} numberOfLines={1}>
                              Note: {req.remark}
                            </Text>
                          ) : null}

                          <View style={styles.historyFooter}>
                            <View style={styles.historyDateRow}>
                              <Ionicons name="calendar-outline" size={13} color="#9E8E93" />
                              <Text style={styles.historyDateText} numberOfLines={1}>
                                {req.created_at ? new Date(req.created_at).toLocaleString() : 'N/A'}
                              </Text>
                            </View>
                            <View style={styles.historyActionLink}>
                              <Text style={styles.historyActionLinkText}>Details</Text>
                              <Ionicons name="chevron-forward" size={14} color="#E64A78" />
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* QR Code Zoom Modal */}
      <Modal
        visible={qrZoomVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQrZoomVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setQrZoomVisible(false)}>
          <Pressable style={styles.zoomModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.zoomModalHeader}>
              <Text style={styles.zoomModalTitle}>Payment QR Code</Text>
              <TouchableOpacity onPress={() => setQrZoomVisible(false)}>
                <Ionicons name="close-circle" size={26} color="#9E8E93" />
              </TouchableOpacity>
            </View>
            {settings.qrCodeUrl && (
              <Image
                source={{ uri: settings.qrCodeUrl }}
                style={styles.zoomQrImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.modalDownloadBtn}
              onPress={handleDownloadQr}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={18} color="#FFFFFF" />
              <Text style={styles.modalDownloadBtnText}>Save QR Code</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Deposit Request Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDetailsModalVisible(false)}>
          <Pressable
            style={[
              styles.detailsModalSheet,
              { paddingBottom: 24 + insets.bottom },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Deposit Request Details</Text>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#2A1E24" />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
                <View style={styles.sheetStatusBox}>
                  {renderStatusBadge(selectedRequest.status)}
                  <Text style={styles.sheetAmountText}>
                    {selectedRequest.formatted_amount || `₹${Number(selectedRequest.amount).toFixed(2)}`}
                  </Text>
                </View>

                <View style={styles.sheetDetailRow}>
                  <Text style={styles.sheetDetailLabel}>Payment Method</Text>
                  <Text style={styles.sheetDetailValue}>
                    {selectedRequest.payment_method_label || selectedRequest.payment_method || 'Online'}
                  </Text>
                </View>

                <View style={styles.sheetDetailRow}>
                  <Text style={styles.sheetDetailLabel}>Submitted At</Text>
                  <Text style={styles.sheetDetailValue}>
                    {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleString() : 'N/A'}
                  </Text>
                </View>

                {selectedRequest.remark ? (
                  <View style={styles.sheetDetailRow}>
                    <Text style={styles.sheetDetailLabel}>UTR / Note</Text>
                    <Text style={[styles.sheetDetailValue, styles.sheetDetailValueWrap]}>
                      {selectedRequest.remark}
                    </Text>
                  </View>
                ) : null}

                {/* Proof Receipt Viewer */}
                {selectedRequest.proof_file_url || selectedRequest.proof_file ? (
                  <View style={styles.sheetProofWrap}>
                    <Text style={styles.sheetProofTitle}>Attached Payment Receipt</Text>
                    <Image
                      source={{ uri: selectedRequest.proof_file_url || selectedRequest.proof_file }}
                      style={styles.sheetProofImage}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F8',
  },

  /* ── Header ── */
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAED',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FAF7F8',
    borderWidth: 1,
    borderColor: '#F0EAED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#2A1E24',
  },

  /* ── Segmented Tabs ── */
  tabWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F3ECEF',
    borderRadius: 14,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 11,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#9E8E93',
  },
  tabTextActive: {
    fontFamily: 'Poppins_700Bold',
    color: '#E64A78',
  },
  tabBadge: {
    backgroundColor: '#E64A78',
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#9E8E93',
    marginTop: 10,
  },

  /* ── Balance Hero Card ── */
  balanceHeroCard: {
    backgroundColor: '#2A1E24',
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  heroCircleA: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(230, 74, 120, 0.25)',
    top: -60,
    right: -40,
  },
  heroCircleB: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(230, 74, 120, 0.15)',
    bottom: -50,
    right: 70,
  },
  balanceHeroLeft: {
    flex: 1,
    marginRight: 12,
  },
  balanceHeroLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
    marginBottom: 2,
  },
  balanceHeroValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  heroMinPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroMinPillText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#FFD7E3',
  },
  balanceHeroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E64A78',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Section Headers with Steps ── */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    width: '100%',
  },
  sectionHeaderRowSpaced: {
    marginTop: 14,
  },
  sectionHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E64A78',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  stepNumber: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15.5,
    color: '#2A1E24',
  },
  sectionSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#9E8E93',
    flexWrap: 'wrap',
  },

  /* ── Fallback Notice ── */
  noPaymentCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFDF0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  noPaymentIconBox: {
    marginRight: 10,
    marginTop: 2,
    flexShrink: 0,
  },
  noPaymentContent: {
    flex: 1,
  },
  noPaymentTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#92400E',
    marginBottom: 3,
  },
  noPaymentText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#78350F',
    lineHeight: 18,
  },

  /* ── QR Card ── */
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  qrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
  },
  qrHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(200, 151, 56, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  qrHeaderBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11.5,
    color: '#C89738',
  },
  qrAppHint: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#9E8E93',
    textAlign: 'center',
    marginBottom: 14,
  },
  qrImageContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F0E3C8',
    marginBottom: 10,
  },
  qrImage: {
    width: SCREEN_WIDTH * 0.56,
    height: SCREEN_WIDTH * 0.56,
    maxWidth: 230,
    maxHeight: 230,
  },
  qrTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qrTapHintText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#9E8E93',
  },
  downloadQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C89738',
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
    shadowColor: '#C89738',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  downloadQrBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },

  /* ── Info Cards (UPI & Bank) ── */
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  infoIconBoxUpi: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconBoxBank: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(200, 151, 56, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#2A1E24',
  },
  infoCardSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#9E8E93',
  },
  copyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF7F8',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    width: '100%',
  },
  copyBoxTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  copyBoxLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 9.5,
    color: '#9E8E93',
    letterSpacing: 0.6,
  },
  copyBoxValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#2A1E24',
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 10,
  },
  copyBtnSuccess: {
    backgroundColor: '#0E9F6E',
  },
  copyBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11.5,
    color: '#8B5CF6',
  },
  copyBtnTextSuccess: {
    color: '#FFFFFF',
  },
  copyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(200, 151, 56, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  copyAllBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#C89738',
  },
  bankFieldsList: {
    gap: 8,
    width: '100%',
  },
  bankFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
    paddingHorizontal: 2,
    width: '100%',
  },
  bankFieldLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#9E8E93',
  },
  bankFieldValue: {
    flexShrink: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    color: '#2A1E24',
    textAlign: 'right',
  },
  bankFieldRowHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF7F8',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    width: '100%',
  },
  bankFieldValueBold: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#2A1E24',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  fieldCopyIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },

  /* ── Instructions Card ── */
  instructionCard: {
    backgroundColor: '#FEFDF8',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    width: '100%',
    overflow: 'hidden',
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  instructionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    color: '#92400E',
  },
  instructionBody: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#78350F',
    lineHeight: 18,
  },

  /* ── Form Card ── */
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0EAED',
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    color: '#2A1E24',
    marginBottom: 8,
  },
  inputLabelSpaced: {
    marginTop: 18,
  },
  optionalText: {
    fontFamily: 'Poppins_400Regular',
    color: '#9E8E93',
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F8',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F0EAED',
    paddingHorizontal: 16,
    height: 62,
  },
  currencySymbol: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: '#E64A78',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: '#2A1E24',
    paddingVertical: 0,
  },
  amountClearBtn: {
    padding: 6,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FAF7F8',
    borderWidth: 1.5,
    borderColor: '#F0EAED',
  },
  presetChipActive: {
    backgroundColor: '#E64A78',
    borderColor: '#E64A78',
  },
  presetChipText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#6B7280',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  minLimitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  minLimitText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#9E8E93',
  },
  formDivider: {
    height: 1,
    backgroundColor: '#F5EFF2',
    marginVertical: 18,
  },

  /* ── Screenshot Upload Zone ── */
  uploadOptionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadDropzone: {
    flex: 1,
    backgroundColor: '#FFFAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#F3C4D3',
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFF0F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadIconBoxAlt: {
    backgroundColor: '#F3F4F6',
  },
  uploadTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#2A1E24',
    textAlign: 'center',
  },
  uploadSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: '#9E8E93',
    textAlign: 'center',
    marginTop: 2,
  },
  proofPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F4FBF8',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CDEFE2',
  },
  proofThumbnail: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  proofInfo: {
    flex: 1,
  },
  proofSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  proofSuccessText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    color: '#0E9F6E',
  },
  proofFilename: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  proofBtnRow: {
    flexDirection: 'row',
    gap: 16,
  },
  proofChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  proofChangeBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11.5,
    color: '#E64A78',
  },
  proofRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  proofRemoveBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11.5,
    color: '#EF4444',
  },

  textInputRemark: {
    backgroundColor: '#FAF7F8',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F0EAED',
    paddingHorizontal: 14,
    height: 50,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#2A1E24',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E64A78',
    borderRadius: 16,
    height: 54,
    marginTop: 24,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 9,
    elevation: 5,
  },
  submitBtnDisabled: {
    backgroundColor: '#F5A3BE',
    shadowOpacity: 0.1,
  },
  submitBtnText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
  },
  secureNoteText: {
    flexShrink: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 10.5,
    color: '#9E8E93',
    textAlign: 'center',
  },

  /* ── History Tab ── */
  emptyHistoryBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFF0F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#2A1E24',
    marginTop: 16,
  },
  emptyHistorySub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: '#9E8E93',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  emptyDepositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E64A78',
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 14,
    marginTop: 20,
  },
  emptyDepositBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0EAED',
    overflow: 'hidden',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  historyAccent: {
    width: 5,
  },
  historyBody: {
    flex: 1,
    padding: 14,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  historyIdBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  historyIdText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11.5,
    color: '#9E8E93',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeApproved: {
    backgroundColor: 'rgba(14, 159, 110, 0.12)',
  },
  badgeTextApproved: {
    color: '#0E9F6E',
  },
  badgeRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  badgeTextRejected: {
    color: '#EF4444',
  },
  badgePending: {
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
  },
  badgeTextPending: {
    color: '#D97706',
  },
  badgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  historyAmountValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#2A1E24',
    marginVertical: 2,
  },
  historyRemark: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#6B7280',
    backgroundColor: '#FAF7F8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 2,
  },
  historyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F7F2F4',
    paddingTop: 10,
    marginTop: 10,
  },
  historyDateRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyDateText: {
    flexShrink: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#9E8E93',
  },
  historyActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  historyActionLinkText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11.5,
    color: '#E64A78',
  },

  /* ── Modals ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(42, 30, 36, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: SCREEN_WIDTH * 0.88,
    alignItems: 'center',
  },
  zoomModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  zoomModalTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#2A1E24',
  },
  zoomQrImage: {
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.72,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C89738',
    height: 48,
    borderRadius: 14,
    width: '100%',
  },
  modalDownloadBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },

  /* ── Details Bottom Sheet ── */
  detailsModalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: '#2A1E24',
  },
  sheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FAF7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    maxHeight: 450,
  },
  sheetStatusBox: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#FAF7F8',
    borderRadius: 16,
    marginBottom: 8,
  },
  sheetAmountText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: '#2A1E24',
    marginTop: 8,
  },
  sheetDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFF2',
  },
  sheetDetailLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: '#9E8E93',
  },
  sheetDetailValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#2A1E24',
  },
  sheetDetailValueWrap: {
    flex: 1,
    textAlign: 'right',
  },
  sheetProofWrap: {
    marginTop: 16,
  },
  sheetProofTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#2A1E24',
    marginBottom: 8,
  },
  sheetProofImage: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    backgroundColor: '#FAF7F8',
  },
});