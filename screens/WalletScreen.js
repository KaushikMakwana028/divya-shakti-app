import React, { useState, useEffect, useCallback } from "react";
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
  Platform,
  Linking,
  Dimensions,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import walletService from "../services/walletService";
import { useAuth } from "../contexts/AuthContext";
import { showAlert } from "../contexts/AlertContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_MAX_HEIGHT = Math.min(Math.round(SCREEN_HEIGHT * 0.88), 750);

const PRESET_AMOUNTS = [500, 1000, 2000, 5000];

// ─────────────────────────────────────────
// Small reusable row for the details sheet.
// Label has a fixed width and the value is
// allowed to flex + wrap onto multiple lines,
// so long values (like admin notes) never sit
// on top of the label again.
// ─────────────────────────────────────────
function DetailRow({ icon, label, value, valueColor, bold, last }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <View style={[styles.detailRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.detailLabelWrap}>
        <Ionicons name={icon} size={15} color="#9E8E93" />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text
        style={[
          styles.detailValue,
          valueColor ? { color: valueColor } : null,
          bold && { fontFamily: "Poppins_700Bold" },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function WalletScreen({ navigation }) {
  const { user } = useAuth();

  // Screen State
  const [balance, setBalance] = useState(0);
  const [rawBalance, setRawBalance] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [depositRequests, setDepositRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("transactions"); // 'transactions' | 'deposits'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination State (10 items per page)
  const ITEMS_PER_PAGE = 10;
  const [txnPage, setTxnPage] = useState(1);
  const [depositPage, setDepositPage] = useState(1);

  // Deposit Request Modal State (Add Money)
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState("1000");
  const [paymentMethod, setPaymentMethod] = useState("cash"); // 'cash' | 'online'
  const [depositRemark, setDepositRemark] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  // Deposit Request Details Bottom Sheet (Slider) State
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedDepositRequest, setSelectedDepositRequest] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Receipt image loading / error state (for the thumb inside the sheet)
  const [receiptImgLoading, setReceiptImgLoading] = useState(true);
  const [receiptImgError, setReceiptImgError] = useState(false);

  // Fullscreen Receipt Preview State
  const [previewImageVisible, setPreviewImageVisible] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [previewImgLoading, setPreviewImgLoading] = useState(true);
  const [previewImgError, setPreviewImgError] = useState(false);

  // Image Picker Modal
  const [pickerModalVisible, setPickerModalVisible] = useState(false);

  // ─────────────────────────────────────────
  // Fetch All Wallet Data
  // ─────────────────────────────────────────
  const fetchWalletData = useCallback(async () => {
    try {
      const [balRes, txnsRes, depRes] = await Promise.all([
        walletService.getWalletBalance(),
        walletService.getWalletTransactions(1, 100),
        walletService.getDepositRequests(1, 100),
      ]);

      if (balRes.success) {
        setBalance(balRes.balance);
        setPendingAmount(balRes.pendingAmount || 0);
        setRawBalance(balRes.rawBalance || balRes.balance);
      }
      if (txnsRes.success) {
        setTransactions(txnsRes.transactions);
      }
      if (depRes.success) {
        setDepositRequests(depRes.requests);
      }
    } catch (err) {
      console.error("Wallet fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchWalletData();
    }, [fetchWalletData]),
  );

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTxnPage(1);
    setDepositPage(1);
    fetchWalletData();
  }, [fetchWalletData]);

  // ─────────────────────────────────────────
  // Proof Image Picking (No crop for receipts)
  // ─────────────────────────────────────────
  const handlePickCamera = async () => {
    setPickerModalVisible(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showAlert({
          title: "Permission Denied",
          message: "Camera permission is required to capture payment receipt.",
          type: "warning",
        });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false, // Don't crop receipt! Captures full image
        quality: 0.9,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofFile(result.assets[0]);
      }
    } catch (err) {
      console.error("Camera error:", err);
      showAlert({
        title: "Error",
        message: "Unable to capture photo.",
        type: "error",
      });
    }
  };

  const handlePickGallery = async () => {
    setPickerModalVisible(false);
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert({
          title: "Permission Denied",
          message: "Gallery permission is required to select payment receipt.",
          type: "warning",
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false, // Don't crop receipt! Takes full image
        quality: 0.9,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofFile(result.assets[0]);
      }
    } catch (err) {
      console.error("Gallery error:", err);
      showAlert({
        title: "Error",
        message: "Unable to select photo.",
        type: "error",
      });
    }
  };

  // ─────────────────────────────────────────
  // Submit Deposit Request
  // ─────────────────────────────────────────
  const handleSubmitDeposit = async () => {
    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showAlert({
        title: "Validation Error",
        message: "Please enter a valid deposit amount.",
        type: "warning",
      });
      return;
    }

    if (paymentMethod === "online" && !proofFile) {
      showAlert({
        title: "Proof Required",
        message: "Please attach a payment receipt screenshot for online deposits.",
        type: "warning",
      });
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
        showAlert({
          title: "Request Submitted",
          message: "Your wallet deposit request has been submitted successfully and is pending admin approval.",
          type: "success",
        });
        setDepositModalVisible(false);
        setProofFile(null);
        setDepositRemark("");
        setActiveTab("deposits");
        fetchWalletData();
      } else {
        showAlert({
          title: "Submission Failed",
          message: res.message || "Unable to submit deposit request.",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Deposit submit error:", err);
      showAlert({
        title: "Error",
        message: "An unexpected error occurred while submitting.",
        type: "error",
      });
    } finally {
      setSubmittingDeposit(false);
    }
  };

  // Resolve the best available proof URL from whatever shape the API gives back
  const getProofUrl = (req) => {
    if (!req) return null;
    return req.proof_image || req.proof_file_url || req.proof_file || null;
  };

  // ─────────────────────────────────────────
  // Open Deposit Request Details (Slider Modal)
  // ─────────────────────────────────────────
  const handleOpenDepositDetails = async (req) => {
    setSelectedDepositRequest(req);
    setDetailsModalVisible(true);
    setLoadingDetails(true);
    setReceiptImgLoading(true);
    setReceiptImgError(false);

    try {
      const res = await walletService.getDepositRequestDetails(req.id);
      if (res.success && res.request) {
        setSelectedDepositRequest(res.request);
      }
    } catch (err) {
      console.error("Fetch deposit details error:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openFullscreenPreview = (url) => {
    if (!url) return;
    setPreviewImageUrl(url);
    setPreviewImgLoading(true);
    setPreviewImgError(false);
    setPreviewImageVisible(true);
  };

  // Format Helper for Source
  const formatSource = (source) => {
    if (!source) return "Transaction";
    if (source === "admin_debit") return "Admin Deduction";
    if (source === "admin_credit") return "Admin Credit";
    return source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Format Date Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      let s = String(dateStr).trim().replace(" ", "T");
      if (!s.includes("+") && !s.includes("Z") && !s.includes("-", 10)) {
        s += "+05:30";
      }
      const date = new Date(s);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-IN", {
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

  // ─────────────────────────────────────────
  // Pagination Calculations (10 per page)
  // ─────────────────────────────────────────
  const totalTxnPages = Math.ceil(transactions.length / ITEMS_PER_PAGE) || 1;
  const currentTxnPage = Math.min(txnPage, totalTxnPages);
  const txnStartIndex = (currentTxnPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = transactions.slice(
    txnStartIndex,
    txnStartIndex + ITEMS_PER_PAGE,
  );

  const totalDepositPages =
    Math.ceil(depositRequests.length / ITEMS_PER_PAGE) || 1;
  const currentDepositPage = Math.min(depositPage, totalDepositPages);
  const depositStartIndex = (currentDepositPage - 1) * ITEMS_PER_PAGE;
  const paginatedDeposits = depositRequests.slice(
    depositStartIndex,
    depositStartIndex + ITEMS_PER_PAGE,
  );

  const renderPagination = (
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
  ) => {
    if (totalItems <= ITEMS_PER_PAGE) return null;

    const fromItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const toItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationInfoRow}>
          <Text style={styles.paginationInfoText}>
            Showing{" "}
            <Text style={styles.paginationInfoHighlight}>
              {fromItem}–{toItem}
            </Text>{" "}
            of <Text style={styles.paginationInfoHighlight}>{totalItems}</Text>{" "}
            entries
          </Text>
        </View>

        <View style={styles.paginationControlsRow}>
          <TouchableOpacity
            style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}
            disabled={currentPage <= 1}
            onPress={() => onPageChange(Math.max(1, currentPage - 1))}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={16}
              color={currentPage <= 1 ? "#C5B8BD" : "#2A1E24"}
            />
            <Text
              style={[
                styles.pageBtnText,
                currentPage <= 1 && styles.pageBtnTextDisabled,
              ]}
            >
              Previous
            </Text>
          </TouchableOpacity>

          <View style={styles.pageNumberBadge}>
            <Text style={styles.pageNumberText}>
              <Text style={styles.pageNumberCurrent}>{currentPage}</Text>
              {" / "}
              <Text style={styles.pageNumberTotal}>{totalPages}</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.pageBtn,
              currentPage >= totalPages && styles.pageBtnDisabled,
            ]}
            disabled={currentPage >= totalPages}
            onPress={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pageBtnText,
                currentPage >= totalPages && styles.pageBtnTextDisabled,
              ]}
            >
              Next
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={currentPage >= totalPages ? "#C5B8BD" : "#2A1E24"}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const proofUrl = getProofUrl(selectedDepositRequest);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
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
            colors={["#E64A78"]}
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
            <View style={styles.walletIconCircle}>
              <Ionicons
                name="wallet-outline"
                size={20}
                color="rgba(255,255,255,0.85)"
              />
            </View>
          </View>

          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceValue}>
            ₹ {balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Text>

          {pendingAmount > 0 && (
            <View style={styles.pendingHoldPill}>
              <Ionicons name="time-outline" size={12} color="#F59E0B" />
              <Text style={styles.pendingHoldText}>
                ₹
                {pendingAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}{" "}
                held for withdrawal review
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.heroActionRow}>
            <TouchableOpacity
              style={styles.depositBtn}
              onPress={() => setDepositModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={16} color="#FFFFFF" />
              <Text style={styles.depositBtnText}>Deposit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => navigation.navigate("Withdraw")}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-up-circle" size={16} color="#FFFFFF" />
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => setActiveTab("transactions")}
              activeOpacity={0.85}
            >
              <Ionicons name="time-outline" size={15} color="#FFFFFF" />
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
            style={[
              styles.tabBtn,
              activeTab === "transactions" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("transactions")}
            activeOpacity={0.85}
          >
            <Ionicons
              name="swap-horizontal"
              size={15}
              color={activeTab === "transactions" ? "#FFFFFF" : "#8A7980"}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "transactions" && styles.tabBtnTextActive,
              ]}
              numberOfLines={1}
            >
              Transactions
            </Text>
            <View
              style={[
                styles.tabCountBadge,
                activeTab === "transactions" && styles.tabCountBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.tabCountText,
                  activeTab === "transactions" && styles.tabCountTextActive,
                ]}
              >
                {transactions.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "deposits" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("deposits")}
            activeOpacity={0.85}
          >
            <Ionicons
              name="cash"
              size={15}
              color={activeTab === "deposits" ? "#FFFFFF" : "#8A7980"}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "deposits" && styles.tabBtnTextActive,
              ]}
              numberOfLines={1}
            >
              Deposits
            </Text>
            <View
              style={[
                styles.tabCountBadge,
                activeTab === "deposits" && styles.tabCountBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.tabCountText,
                  activeTab === "deposits" && styles.tabCountTextActive,
                ]}
              >
                {depositRequests.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Tab 1: Transactions List ── */}
        {activeTab === "transactions" && (
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
              <>
                {paginatedTransactions.map((txn) => {
                  const isCredit = txn.type === "credit";
                  return (
                    <View key={txn.id} style={styles.txnCard}>
                      <View
                        style={[
                          styles.txnAccentBar,
                          isCredit
                            ? styles.txnAccentCredit
                            : styles.txnAccentDebit,
                        ]}
                      />
                      <View
                        style={[
                          styles.txnIconBox,
                          isCredit ? styles.txnCreditIcon : styles.txnDebitIcon,
                        ]}
                      >
                        <Ionicons
                          name={isCredit ? "arrow-down" : "arrow-up"}
                          size={19}
                          color={isCredit ? "#27A462" : "#EF4444"}
                        />
                      </View>

                      <View style={styles.txnInfoCol}>
                        <Text style={styles.txnSource} numberOfLines={1}>
                          {formatSource(txn.source)}
                        </Text>
                        {txn.remark ? (
                          <View style={txn.source === "admin_debit" ? styles.txnReasonBox : null}>
                            {txn.source === "admin_debit" ? (
                              <View style={styles.txnReasonHeader}>
                                <Ionicons name="alert-circle-outline" size={11} color="#DC2626" />
                                <Text style={styles.txnReasonLabel}>Reason / Note</Text>
                              </View>
                            ) : null}
                            <Text
                              style={txn.source === "admin_debit" ? styles.txnReasonText : styles.txnRemark}
                              numberOfLines={txn.source === "admin_debit" ? 4 : 2}
                            >
                              {txn.remark}
                            </Text>
                          </View>
                        ) : null}
                        <View style={styles.txnDateRow}>
                          <Ionicons
                            name="time-outline"
                            size={10}
                            color="#C5B8BD"
                          />
                          <Text style={styles.txnDate}>
                            {formatDate(txn.created_at)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.txnAmountCol}>
                        <Text
                          style={[
                            styles.txnAmount,
                            isCredit
                              ? styles.txnCreditText
                              : styles.txnDebitText,
                          ]}
                        >
                          {isCredit ? "+" : "-"} ₹
                          {txn.amount.toLocaleString("en-IN")}
                        </Text>
                        <View
                          style={[
                            styles.txnTypeBadge,
                            isCredit
                              ? styles.txnTypeCredit
                              : styles.txnTypeDebit,
                          ]}
                        >
                          <Text
                            style={[
                              styles.txnTypeBadgeText,
                              isCredit
                                ? styles.txnTypeCreditText
                                : styles.txnTypeDebitText,
                            ]}
                          >
                            {isCredit ? "CREDIT" : "DEBIT"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
                {renderPagination(
                  currentTxnPage,
                  totalTxnPages,
                  transactions.length,
                  setTxnPage,
                )}
              </>
            )}
          </View>
        )}

        {/* ── Tab 2: Deposit Requests List ── */}
        {activeTab === "deposits" && (
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
              <>
                {paginatedDeposits.map((req) => {
                  const isApproved = req.status === "approved";
                  const isPending = req.status === "pending";
                  const isRejected = req.status === "rejected";
                  const thumbUrl = getProofUrl(req);

                  return (
                    <TouchableOpacity
                      key={req.id}
                      style={styles.depositCard}
                      activeOpacity={0.75}
                      onPress={() => handleOpenDepositDetails(req)}
                    >
                      <View
                        style={[
                          styles.depositAccentBar,
                          isApproved && styles.depositAccentApproved,
                          isPending && styles.depositAccentPending,
                          isRejected && styles.depositAccentRejected,
                        ]}
                      />
                      <View style={styles.depositTopRow}>
                        <View style={styles.depositMethodWrap}>
                          <View style={styles.depositMethodIconBox}>
                            <Ionicons
                              name={
                                req.payment_method === "online"
                                  ? "card-outline"
                                  : "cash-outline"
                              }
                              size={16}
                              color="#E64A78"
                            />
                          </View>
                          <Text style={styles.depositMethodText}>
                            {req.payment_method_label ||
                              (req.payment_method === "online"
                                ? "Online Transfer"
                                : "Cash Deposit")}
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
                          <Ionicons
                            name={
                              isApproved
                                ? "checkmark-circle"
                                : isPending
                                  ? "time-outline"
                                  : "close-circle"
                            }
                            size={12}
                            color={
                              isApproved
                                ? "#27A462"
                                : isPending
                                  ? "#C89738"
                                  : "#EF4444"
                            }
                          />
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isApproved && styles.statusApprovedText,
                              isPending && styles.statusPendingText,
                              isRejected && styles.statusRejectedText,
                            ]}
                          >
                            {req.status_label ||
                              (isApproved
                                ? "Approved"
                                : isPending
                                  ? "Pending"
                                  : "Rejected")}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.depositDivider} />

                      <View style={styles.depositMiddleRow}>
                        <View>
                          <Text style={styles.depositAmountLabel}>
                            Requested Amount
                          </Text>
                          <Text style={styles.depositAmountValue}>
                            {req.formatted_amount ||
                              `₹ ${Number(req.amount).toLocaleString("en-IN")}`}
                          </Text>
                        </View>

                        {thumbUrl ? (
                          <View style={styles.proofThumbWrap}>
                            <Image
                              source={{ uri: thumbUrl }}
                              style={styles.proofThumb}
                              resizeMode="cover"
                            />
                            <View style={styles.proofThumbBadge}>
                              <Ionicons
                                name="receipt-outline"
                                size={10}
                                color="#FFFFFF"
                              />
                            </View>
                          </View>
                        ) : null}
                      </View>

                      {req.remark ? (
                        <Text style={styles.depositRemark} numberOfLines={3}>
                          <Text style={{ fontFamily: "Poppins_600SemiBold" }}>
                            Note:{" "}
                          </Text>
                          {req.remark}
                        </Text>
                      ) : null}

                      <View style={styles.depositCardFooter}>
                        <View style={styles.depositDateRow}>
                          <Ionicons
                            name="calendar-outline"
                            size={11}
                            color="#C5B8BD"
                          />
                          <Text style={styles.depositDate}>
                            {req.formatted_created_at ||
                              formatDate(req.created_at)}
                          </Text>
                        </View>
                        <View style={styles.viewDetailsRow}>
                          <Text style={styles.viewDetailsText}>
                            View Details
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={13}
                            color="#E64A78"
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {renderPagination(
                  currentDepositPage,
                  totalDepositPages,
                  depositRequests.length,
                  setDepositPage,
                )}
              </>
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
          behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                        depositAmount === String(amt) &&
                          styles.presetChipTextActive,
                      ]}
                    >
                      +₹{amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Payment Method Selector */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                Select Payment Mode *
              </Text>
              <View style={styles.methodSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    paymentMethod === "cash" && styles.methodCardActive,
                  ]}
                  onPress={() => setPaymentMethod("cash")}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="cash-outline"
                    size={22}
                    color={paymentMethod === "cash" ? "#E64A78" : "#9E8E93"}
                  />
                  <Text
                    style={[
                      styles.methodCardTitle,
                      paymentMethod === "cash" && styles.methodCardTitleActive,
                    ]}
                  >
                    Cash
                  </Text>
                  <Text style={styles.methodCardDesc}>
                    Pay in cash directly
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    paymentMethod === "online" && styles.methodCardActive,
                  ]}
                  onPress={() => setPaymentMethod("online")}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="card-outline"
                    size={22}
                    color={paymentMethod === "online" ? "#E64A78" : "#9E8E93"}
                  />
                  <Text
                    style={[
                      styles.methodCardTitle,
                      paymentMethod === "online" &&
                        styles.methodCardTitleActive,
                    ]}
                  >
                    Online / UPI
                  </Text>
                  <Text style={styles.methodCardDesc}>Bank / UPI receipt</Text>
                </TouchableOpacity>
              </View>

              {/* Online Proof Upload Box */}
              {paymentMethod === "online" && (
                <View style={styles.proofUploadSection}>
                  <Text style={styles.fieldLabel}>
                    Payment Screenshot / Receipt *
                  </Text>
                  <TouchableOpacity
                    style={styles.proofUploadBox}
                    onPress={() => setPickerModalVisible(true)}
                    activeOpacity={0.75}
                  >
                    {proofFile ? (
                      <View style={styles.proofCardAttached}>
                        <View style={styles.proofCardHeader}>
                          <View style={styles.proofBadgeAttached}>
                            <Ionicons
                              name="checkmark-circle"
                              size={15}
                              color="#27A462"
                            />
                            <Text style={styles.proofSuccessText}>
                              Receipt Attached
                            </Text>
                          </View>
                          <View style={styles.proofActionsRow}>
                            <TouchableOpacity
                              style={styles.proofChangeBtn}
                              onPress={() => setPickerModalVisible(true)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="camera-outline"
                                size={14}
                                color="#E64A78"
                              />
                              <Text style={styles.proofChangeText}>Change</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.proofChangeBtn, styles.proofRemoveBtn]}
                              onPress={() => setProofFile(null)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={14}
                                color="#EF4444"
                              />
                              <Text
                                style={[
                                  styles.proofChangeText,
                                  { color: "#EF4444" },
                                ]}
                              >
                                Remove
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.proofFullPreviewWrap}>
                          <Image
                            source={{ uri: proofFile.uri }}
                            style={styles.proofFullImage}
                            resizeMode="contain"
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.proofPlaceholderRow}>
                        <View style={styles.proofIconBox}>
                          <Ionicons
                            name="cloud-upload-outline"
                            size={22}
                            color="#E64A78"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.proofUploadTitle}>
                            Upload Payment Receipt
                          </Text>
                          <Text style={styles.proofUploadSubtitle}>
                            Screenshots of UPI, GPay, PhonePe, or Bank Transfer
                          </Text>
                        </View>
                        <Ionicons
                          name="add-circle-outline"
                          size={20}
                          color="#E64A78"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Remark Input */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                Remark (Optional)
              </Text>
              <TextInput
                style={styles.remarkInput}
                placeholder="e.g. Paid via GPay UTR #12345678"
                placeholderTextColor="#9E8E93"
                value={depositRemark}
                onChangeText={setDepositRemark}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  submittingDeposit && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmitDeposit}
                disabled={submittingDeposit}
                activeOpacity={0.85}
              >
                {submittingDeposit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.btnRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.submitBtnText}>
                      Submit Deposit Request
                    </Text>
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
        <View style={styles.pickerOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setPickerModalVisible(false)}
          />
          <View style={styles.pickerSheet}>
            <View style={styles.modalIndicator} />
            <Text style={styles.pickerTitle}>Attach Payment Proof</Text>
            <Text style={styles.pickerSubtitle}>
              Select an option to proceed
            </Text>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={handlePickCamera}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.pickerIconBox,
                  { backgroundColor: "rgba(230,74,120,0.1)" },
                ]}
              >
                <Ionicons name="camera-outline" size={22} color="#E64A78" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTitle}>Take Photo</Text>
                <Text style={styles.pickerOptionDesc}>
                  Use device camera to capture receipt
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C5B8BD" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={handlePickGallery}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.pickerIconBox,
                  { backgroundColor: "rgba(200,151,56,0.12)" },
                ]}
              >
                <Ionicons name="images-outline" size={22} color="#C89738" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionTitle}>
                  Choose from Gallery
                </Text>
                <Text style={styles.pickerOptionDesc}>
                  Select existing screenshot or file
                </Text>
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
        </View>
      </Modal>

      {/* ── Modal: Deposit Request Details Slider (Bottom Sheet) ── */}
      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Top backdrop Pressable sits above the sheet and handles backdrop dismiss without any touch overlap */}
          <Pressable
            style={styles.modalBackdropTop}
            onPress={() => setDetailsModalVisible(false)}
          />

          <View style={styles.detailsModalSheet}>
            {/* Pinned Header at top of the sheet */}
            <View style={styles.detailsHeaderWrap}>
              <View style={styles.modalIndicator} />
              <View style={styles.modalHeaderRow}>
                <View style={styles.detailsHeaderLeft}>
                  <Text style={styles.modalTitle}>Deposit Details</Text>
                  {selectedDepositRequest?.id ? (
                    <View style={styles.detailsIdBadge}>
                      <Text style={styles.detailsIdBadgeText}>
                        #REQ-{selectedDepositRequest.id}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.detailsCloseBtn}
                  onPress={() => setDetailsModalVisible(false)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={20} color="#2A1E24" />
                </TouchableOpacity>
              </View>
            </View>

            {loadingDetails && !selectedDepositRequest ? (
              <View style={styles.detailsLoaderBox}>
                <ActivityIndicator size="large" color="#E64A78" />
                <Text style={styles.detailsLoaderText}>
                  Loading deposit details...
                </Text>
              </View>
            ) : selectedDepositRequest ? (
              <ScrollView
                style={styles.detailsScroll}
                contentContainerStyle={styles.detailsScrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                bounces={true}
                overScrollMode="always"
                scrollEventThrottle={16}
              >
                {/* 1. Hero Summary Card (Amount + Status) */}
                <View style={styles.detailsHeroCard}>
                  <View style={styles.detailsHeroTop}>
                    <Text style={styles.detailsHeroLabel}>
                      Requested Amount
                    </Text>
                    {/* Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        selectedDepositRequest.status === "approved" &&
                          styles.statusApproved,
                        selectedDepositRequest.status === "pending" &&
                          styles.statusPending,
                        selectedDepositRequest.status === "rejected" &&
                          styles.statusRejected,
                      ]}
                    >
                      <Ionicons
                        name={
                          selectedDepositRequest.status === "approved"
                            ? "checkmark-circle"
                            : selectedDepositRequest.status === "pending"
                              ? "time-outline"
                              : "close-circle"
                        }
                        size={13}
                        color={
                          selectedDepositRequest.status === "approved"
                            ? "#27A462"
                            : selectedDepositRequest.status === "pending"
                              ? "#C89738"
                              : "#EF4444"
                        }
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          selectedDepositRequest.status === "approved" &&
                            styles.statusApprovedText,
                          selectedDepositRequest.status === "pending" &&
                            styles.statusPendingText,
                          selectedDepositRequest.status === "rejected" &&
                            styles.statusRejectedText,
                        ]}
                      >
                        {selectedDepositRequest.status_label ||
                          (selectedDepositRequest.status === "approved"
                            ? "Approved"
                            : selectedDepositRequest.status === "pending"
                              ? "Pending"
                              : "Rejected")}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.detailsHeroAmount}>
                    {selectedDepositRequest.formatted_amount ||
                      `₹ ${Number(selectedDepositRequest.amount).toLocaleString("en-IN")}`}
                  </Text>

                  {/* Status Notice Banner */}
                  {selectedDepositRequest.status === "approved" && (
                    <View style={styles.approvedBanner}>
                      <Ionicons
                        name="checkmark-done-circle"
                        size={18}
                        color="#27A462"
                      />
                      <Text style={styles.approvedBannerText}>
                        This request has been approved and the amount is
                        credited to your wallet balance.
                      </Text>
                    </View>
                  )}

                  {selectedDepositRequest.status === "pending" && (
                    <View style={styles.pendingBanner}>
                      <Ionicons
                        name="hourglass-outline"
                        size={18}
                        color="#C89738"
                      />
                      <Text style={styles.pendingBannerText}>
                        Your deposit is under verification by the accounts team.
                        Once approved, the amount will reflect in your wallet.
                      </Text>
                    </View>
                  )}

                  {selectedDepositRequest.status === "rejected" && (
                    <View style={styles.rejectedBanner}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={18}
                        color="#EF4444"
                      />
                      <Text style={styles.rejectedBannerText}>
                        This deposit request was rejected. Please review the
                        payment proof or submit a fresh request.
                      </Text>
                    </View>
                  )}
                </View>

                {/* 2. Wallet Transaction Details (if approved) */}
                {selectedDepositRequest.transaction && (
                  <View style={styles.detailsSectionCard}>
                    <View style={styles.detailsSectionHeader}>
                      <View style={styles.sectionIconBadgeGreen}>
                        <Ionicons
                          name="swap-horizontal"
                          size={15}
                          color="#27A462"
                        />
                      </View>
                      <Text style={styles.detailsSectionTitle}>
                        Wallet Credit Transaction
                      </Text>
                    </View>

                    <DetailRow
                      icon="receipt-outline"
                      label="Transaction ID"
                      value={`#TXN-${selectedDepositRequest.transaction.id}`}
                    />
                    <DetailRow
                      icon="add-circle-outline"
                      label="Amount Added"
                      value={`+ ₹${Number(
                        selectedDepositRequest.transaction.amount,
                      ).toLocaleString("en-IN")}`}
                      valueColor="#27A462"
                      bold
                    />
                    {selectedDepositRequest.transaction.remark ? (
                      <DetailRow
                        icon="chatbox-outline"
                        label="Admin Note"
                        value={selectedDepositRequest.transaction.remark}
                      />
                    ) : null}
                    <DetailRow
                      icon="time-outline"
                      label="Credited At"
                      value={formatDate(
                        selectedDepositRequest.transaction.created_at,
                      )}
                      last
                    />
                  </View>
                )}

                {/* 3. Detailed Request Info */}
                <View style={styles.detailsSectionCard}>
                  <View style={styles.detailsSectionHeader}>
                    <View style={styles.sectionIconBadgePink}>
                      <Ionicons
                        name="document-text-outline"
                        size={15}
                        color="#E64A78"
                      />
                    </View>
                    <Text style={styles.detailsSectionTitle}>
                      Deposit Information
                    </Text>
                  </View>

                  <DetailRow
                    icon={
                      selectedDepositRequest.payment_method === "online"
                        ? "card-outline"
                        : "cash-outline"
                    }
                    label="Payment Mode"
                    value={
                      selectedDepositRequest.payment_method_label ||
                      (selectedDepositRequest.payment_method === "online"
                        ? "Online Transfer"
                        : "Cash Deposit")
                    }
                  />
                  <DetailRow
                    icon="finger-print-outline"
                    label="Reference ID"
                    value={`#${selectedDepositRequest.id}`}
                  />
                  <DetailRow
                    icon="calendar-outline"
                    label="Requested On"
                    value={
                      selectedDepositRequest.formatted_created_at ||
                      formatDate(selectedDepositRequest.created_at)
                    }
                  />
                  <DetailRow
                    icon="time-outline"
                    label="Processed On"
                    value={
                      selectedDepositRequest.formatted_updated_at ||
                      (selectedDepositRequest.updated_at
                        ? formatDate(selectedDepositRequest.updated_at)
                        : null)
                    }
                  />
                  <DetailRow
                    icon="shield-checkmark-outline"
                    label="Reviewed By"
                    value={selectedDepositRequest.action_by_name}
                  />
                  <DetailRow
                    icon="chatbox-ellipses-outline"
                    label="Note"
                    value={selectedDepositRequest.remark}
                    last
                  />
                </View>

                {/* 4. Payment Proof / Receipt */}
                {(proofUrl || selectedDepositRequest.is_pdf) && (
                  <View style={styles.detailsSectionCard}>
                    <View style={styles.detailsSectionHeader}>
                      <View style={styles.sectionIconBadgePink}>
                        <Ionicons
                          name="receipt-outline"
                          size={15}
                          color="#E64A78"
                        />
                      </View>
                      <Text style={styles.detailsSectionTitle}>
                        Payment Receipt
                      </Text>
                    </View>

                    {selectedDepositRequest.is_pdf ? (
                      <TouchableOpacity
                        style={styles.pdfCard}
                        onPress={() => {
                          const url =
                            selectedDepositRequest.proof_file_url ||
                            selectedDepositRequest.proof_file;
                          if (url) Linking.openURL(url);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.pdfIconWrap}>
                          <Ionicons
                            name="document-text"
                            size={24}
                            color="#EF4444"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pdfFileName} numberOfLines={1}>
                            {selectedDepositRequest.file_name ||
                              "Payment_Receipt.pdf"}
                          </Text>
                          <Text style={styles.pdfTapText}>Tap to open PDF</Text>
                        </View>
                        <Ionicons
                          name="open-outline"
                          size={18}
                          color="#E64A78"
                        />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.imageProofBox}>
                        {proofUrl ? (
                          <>
                            <TouchableOpacity
                              style={styles.imageProofTapWrap}
                              activeOpacity={0.85}
                              disabled={receiptImgError}
                              onPress={() => openFullscreenPreview(proofUrl)}
                            >
                              <Image
                                source={{ uri: proofUrl }}
                                style={styles.imageProofImg}
                                resizeMode="cover"
                                onLoadStart={() => setReceiptImgLoading(true)}
                                onLoadEnd={() => setReceiptImgLoading(false)}
                                onError={() => {
                                  setReceiptImgLoading(false);
                                  setReceiptImgError(true);
                                }}
                              />

                              {!receiptImgLoading && !receiptImgError && (
                                <View style={styles.imageZoomPill}>
                                  <Ionicons
                                    name="expand"
                                    size={13}
                                    color="#FFFFFF"
                                  />
                                  <Text style={styles.imageZoomText}>
                                    Tap to view full receipt
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>

                            {receiptImgLoading && !receiptImgError && (
                              <View style={styles.imageProofOverlay}>
                                <ActivityIndicator
                                  size="small"
                                  color="#E64A78"
                                />
                                <Text style={styles.imageProofOverlayText}>
                                  Loading receipt...
                                </Text>
                              </View>
                            )}

                            {receiptImgError && (
                              <View style={styles.imageProofErrorOverlay}>
                                <Ionicons
                                  name="image-outline"
                                  size={26}
                                  color="#9E8E93"
                                />
                                <Text style={styles.imageProofErrorText}>
                                  Couldn't load receipt image
                                </Text>
                                <TouchableOpacity
                                  style={styles.imageProofRetryBtn}
                                  onPress={() => {
                                    setReceiptImgError(false);
                                    setReceiptImgLoading(true);
                                  }}
                                >
                                  <Ionicons
                                    name="refresh"
                                    size={13}
                                    color="#E64A78"
                                  />
                                  <Text style={styles.imageProofRetryText}>
                                    Retry
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => Linking.openURL(proofUrl)}
                                >
                                  <Text style={styles.imageProofOpenLink}>
                                    Open in browser instead
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </>
                        ) : null}
                      </View>
                    )}
                  </View>
                )}

                {/* Subtle loading indicator if refreshing details in background */}
                {loadingDetails && (
                  <View style={styles.detailsRefreshingRow}>
                    <ActivityIndicator size="small" color="#E64A78" />
                    <Text style={styles.detailsRefreshingText}>
                      Syncing latest details...
                    </Text>
                  </View>
                )}

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.detailsDismissBtn}
                  onPress={() => setDetailsModalVisible(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.detailsDismissBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ── Fullscreen Receipt Viewer Modal ── */}
      <Modal
        visible={previewImageVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageVisible(false)}
      >
        <SafeAreaView style={styles.fullscreenSafe} edges={["top", "bottom"]}>
          <View style={styles.fullscreenHeader}>
            <Text style={styles.fullscreenTitle}>Receipt Preview</Text>
            <View style={styles.fullscreenHeaderActions}>
              {previewImageUrl ? (
                <TouchableOpacity
                  style={styles.fullscreenOpenBtn}
                  onPress={() => Linking.openURL(previewImageUrl)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.fullscreenClose}
                onPress={() => setPreviewImageVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.fullscreenBody}>
            {previewImageUrl ? (
              <>
                <Image
                  source={{ uri: previewImageUrl }}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                  onLoadStart={() => setPreviewImgLoading(true)}
                  onLoadEnd={() => setPreviewImgLoading(false)}
                  onError={() => {
                    setPreviewImgLoading(false);
                    setPreviewImgError(true);
                  }}
                />
                {previewImgLoading && !previewImgError && (
                  <View style={styles.fullscreenLoader}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  </View>
                )}
                {previewImgError && (
                  <View style={styles.fullscreenErrorBox}>
                    <Ionicons
                      name="image-outline"
                      size={40}
                      color="rgba(255,255,255,0.6)"
                    />
                    <Text style={styles.fullscreenErrorText}>
                      Couldn't load this image
                    </Text>
                    <TouchableOpacity
                      style={styles.fullscreenErrorBtn}
                      onPress={() => Linking.openURL(previewImageUrl)}
                    >
                      <Text style={styles.fullscreenErrorBtnText}>
                        Open in browser
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EAED",
    backgroundColor: "#FAF7F8",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#2A1E24",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  loaderCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: "#9E8E93",
  },

  // Hero Card
  heroCard: {
    backgroundColor: "#2A1E24",
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  goldBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(200,151,56,0.18)",
    borderWidth: 1,
    borderColor: "rgba(200,151,56,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  goldBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10.5,
    color: "#C89738",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  walletIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#C5B8BD",
    marginBottom: 4,
  },
  balanceValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 30,
    color: "#FFFFFF",
    marginBottom: 14,
  },
  pendingHoldPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
    marginTop: -4,
  },
  pendingHoldText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
    color: "#FBBF24",
  },
  heroActionRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 2,
  },
  depositBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#E64A78",
    paddingVertical: 11,
    borderRadius: 13,
    shadowColor: "#E64A78",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  depositBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  withdrawBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4, // slightly reduced gap prevents text crowding
    backgroundColor: "#0E9F6E", // matching your brownish-gold screenshot color
    paddingVertical: 11,
    paddingHorizontal: 8, // <-- Left & right inside spacing
    borderRadius: 13,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  withdrawBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11, // reduced from 12 so "Withdraw" fits comfortably alongside the icon
    color: "#FFFFFF",
  },
  historyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 11,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  historyBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  decorCircle1: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(230,74,120,0.15)",
  },
  decorCircle2: {
    position: "absolute",
    bottom: -40,
    right: 40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(200,151,56,0.1)",
  },

  // Segmented Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: "#F0EAED",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: "#E64A78",
    shadowColor: "#E64A78",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#6B5F63",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },
  tabCountBadge: {
    minWidth: 20,
    height: 19,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#F4EFF2",
    alignItems: "center",
    justifyContent: "center",
  },
  tabCountBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  tabCountText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 10.5,
    color: "#9E8E93",
  },
  tabCountTextActive: {
    color: "#FFFFFF",
  },

  // List Section
  listSection: {
    gap: 14,
  },

  // Transactions Card
  txnCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    paddingLeft: 18,
    borderWidth: 1,
    borderColor: "#F0EAED",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
    overflow: "hidden",
  },
  txnAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  txnAccentCredit: {
    backgroundColor: "#27A462",
  },
  txnAccentDebit: {
    backgroundColor: "#EF4444",
  },
  txnIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txnCreditIcon: {
    backgroundColor: "#E8FBF5",
  },
  txnDebitIcon: {
    backgroundColor: "#FEF2F2",
  },
  txnInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  txnSource: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#2A1E24",
    marginBottom: 3,
  },
  txnRemark: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#9E8E93",
    marginBottom: 5,
    lineHeight: 15,
  },
  txnReasonBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    marginBottom: 5,
    marginTop: 2,
  },
  txnReasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  txnReasonLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 9.5,
    color: "#DC2626",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  txnReasonText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: "#991B1B",
    lineHeight: 16,
  },
  txnDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  txnDate: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5,
    color: "#C5B8BD",
  },
  txnAmountCol: {
    alignItems: "flex-end",
    gap: 6,
  },
  txnAmount: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15.5,
  },
  txnCreditText: {
    color: "#27A462",
  },
  txnDebitText: {
    color: "#EF4444",
  },
  txnTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  txnTypeCredit: {
    backgroundColor: "#E8FBF5",
  },
  txnTypeDebit: {
    backgroundColor: "#FEF2F2",
  },
  txnTypeBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  txnTypeCreditText: {
    color: "#27A462",
  },
  txnTypeDebitText: {
    color: "#EF4444",
  },

  // Deposit Request Card
  depositCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    paddingLeft: 18,
    borderWidth: 1,
    borderColor: "#F0EAED",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
    overflow: "hidden",
  },
  depositAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#C5B8BD",
  },
  depositAccentApproved: {
    backgroundColor: "#27A462",
  },
  depositAccentPending: {
    backgroundColor: "#C89738",
  },
  depositAccentRejected: {
    backgroundColor: "#EF4444",
  },
  depositTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  depositMethodWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  depositMethodIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#FFF0F4",
    alignItems: "center",
    justifyContent: "center",
  },
  depositMethodText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#2A1E24",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusApproved: {
    backgroundColor: "#E8FBF5",
  },
  statusPending: {
    backgroundColor: "#FBF5E6",
  },
  statusRejected: {
    backgroundColor: "#FEF2F2",
  },
  statusBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },
  statusApprovedText: {
    color: "#27A462",
  },
  statusPendingText: {
    color: "#C89738",
  },
  statusRejectedText: {
    color: "#EF4444",
  },
  depositDivider: {
    height: 1,
    backgroundColor: "#F5F0F2",
    marginBottom: 12,
  },
  depositMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  depositAmountLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#9E8E93",
    marginBottom: 2,
  },
  depositAmountValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 21,
    color: "#2A1E24",
  },
  proofThumbWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0EAED",
    position: "relative",
  },
  proofThumb: {
    width: "100%",
    height: "100%",
  },
  proofThumbBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(42,30,36,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  depositRemark: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#6B7280",
    backgroundColor: "#FAF7F8",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    lineHeight: 17,
  },
  depositDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  depositDate: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5,
    color: "#C5B8BD",
  },

  // Empty State
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F0EAED",
    marginTop: 10,
  },
  emptyIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFF0F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#2A1E24",
    marginBottom: 4,
  },
  emptyDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: "#9E8E93",
    textAlign: "center",
    lineHeight: 18,
  },
  emptyActionBtn: {
    backgroundColor: "#E64A78",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  emptyActionBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },

  // Modal Deposit
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(42,30,36,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    maxHeight: "85%",
  },
  modalIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F0EAED",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#2A1E24",
  },
  fieldLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: "#2A1E24",
    marginBottom: 6,
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF7F8",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#F0EAED",
    paddingHorizontal: 16,
    height: 56,
  },
  currencySymbol: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: "#E64A78",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: "#2A1E24",
    paddingVertical: 0,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  presetChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FAF7F8",
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  presetChipActive: {
    backgroundColor: "rgba(230,74,120,0.1)",
    borderColor: "#E64A78",
  },
  presetChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#9E8E93",
  },
  presetChipTextActive: {
    color: "#E64A78",
    fontFamily: "Poppins_600SemiBold",
  },
  methodSelectorRow: {
    flexDirection: "row",
    gap: 12,
  },
  methodCard: {
    flex: 1,
    backgroundColor: "#FAF7F8",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#F0EAED",
    alignItems: "center",
    gap: 4,
  },
  methodCardActive: {
    backgroundColor: "rgba(230,74,120,0.08)",
    borderColor: "#E64A78",
  },
  methodCardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#2A1E24",
  },
  methodCardTitleActive: {
    color: "#E64A78",
  },
  methodCardDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5,
    color: "#9E8E93",
    textAlign: "center",
  },
  proofUploadSection: {
    marginTop: 16,
  },
  proofUploadBox: {
    backgroundColor: "#FAF7F8",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#F0EAED",
    borderStyle: "dashed",
    padding: 14,
  },
  proofCardAttached: {
    backgroundColor: "#FAF7F8",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EBE3E6",
    padding: 12,
  },
  proofCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  proofBadgeAttached: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(39,164,98,0.12)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  proofActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  proofChangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  proofRemoveBtn: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FEE2E2",
  },
  proofFullPreviewWrap: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    backgroundColor: "#221A1E",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  proofFullImage: {
    width: "100%",
    height: "100%",
  },
  proofPlaceholderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  proofIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFF0F4",
    alignItems: "center",
    justifyContent: "center",
  },
  proofUploadTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#2A1E24",
  },
  proofUploadSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#9E8E93",
    marginTop: 1,
  },
  proofPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  proofPreviewImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  proofSuccessText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#27A462",
  },
  proofChangeText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#E64A78",
  },
  remarkInput: {
    backgroundColor: "#FAF7F8",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0EAED",
    paddingHorizontal: 14,
    height: 46,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#2A1E24",
  },
  submitBtn: {
    backgroundColor: "#E64A78",
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 10,
    shadowColor: "#E64A78",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // Picker Sheet
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(42,30,36,0.5)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
  pickerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    color: "#2A1E24",
    textAlign: "center",
  },
  pickerSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: "#9E8E93",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 16,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF7F8",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0EAED",
    marginBottom: 10,
  },
  pickerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  pickerOptionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#2A1E24",
  },
  pickerOptionDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#9E8E93",
    marginTop: 1,
  },
  pickerCancelBtn: {
    borderRadius: 12,
    backgroundColor: "#FAF7F8",
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  pickerCancelText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#9E8E93",
  },

  // Modal Overlay & Top Backdrop
  modalBackdropTop: {
    flex: 1,
    width: "100%",
  },

  // Deposit Details Bottom Sheet Slider
  detailsModalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SHEET_MAX_HEIGHT,
    width: "100%",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 25,
    overflow: "hidden",
  },
  detailsHeaderWrap: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F0F2",
    backgroundColor: "#FFFFFF",
  },
  detailsScroll: {
    flexShrink: 1,
  },
  detailsScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
  },
  detailsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailsIdBadge: {
    backgroundColor: "rgba(230,74,120,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  detailsIdBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#E64A78",
  },
  detailsCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FAF7F8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  detailsLoaderBox: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsLoaderText: {
    marginTop: 12,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#9E8E93",
  },
  detailsHeroCard: {
    backgroundColor: "#FAF7F8",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  detailsHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  detailsHeroLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#9E8E93",
  },
  detailsHeroAmount: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    color: "#2A1E24",
    marginBottom: 12,
  },
  approvedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#E8FBF5",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C5F2E1",
  },
  approvedBannerText: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#1E7E4C",
    lineHeight: 16,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FDF9EE",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5E8C7",
  },
  pendingBannerText: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#9A7220",
    lineHeight: 16,
  },
  rejectedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDC8C8",
  },
  rejectedBannerText: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#B91C1C",
    lineHeight: 16,
  },
  detailsSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  detailsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FAF7F8",
  },
  sectionIconBadgeGreen: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8FBF5",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIconBadgePink: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(230,74,120,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsSectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#2A1E24",
  },
  imageProofTapWrap: {
    position: "relative",
    width: "100%",
    height: 200,
  },

  // ── Fixed row layout: label has a fixed max width, value
  // flexes and wraps beneath/beside it so nothing overlaps.
  detailsInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FAF7F8",
    gap: 10,
  },
  detailsInfoRowLast: {
    borderBottomWidth: 0,
  },
  detailsInfoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: 108,
    flexShrink: 0,
    paddingTop: 1,
  },
  detailsInfoLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#9E8E93",
  },
  detailsInfoValue: {
    flex: 1,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: "#2A1E24",
    textAlign: "right",
    flexWrap: "wrap",
    lineHeight: 17,
  },

  pdfCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAF7F8",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  pdfIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  pdfFileName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: "#2A1E24",
  },
  pdfTapText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#E64A78",
    marginTop: 2,
  },

  // Receipt image box inside the details sheet, with loading /
  // error overlays so the tile is never blank with no feedback.
  imageProofBox: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0EAED",
    position: "relative",
    backgroundColor: "#FAF7F8",
    minHeight: 180,
  },
  imageProofImg: {
    width: "100%",
    height: 200,
  },
  imageProofOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAF7F8",
    gap: 8,
  },
  imageProofOverlayText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#9E8E93",
  },
  imageProofErrorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAF7F8",
    gap: 8,
    paddingHorizontal: 16,
  },
  imageProofErrorText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#6B5F63",
    textAlign: "center",
  },
  imageProofRetryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(230,74,120,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  imageProofRetryText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5,
    color: "#E64A78",
  },
  imageProofOpenLink: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#9E8E93",
    textDecorationLine: "underline",
  },
  imageZoomPill: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(42,30,36,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  imageZoomText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#FFFFFF",
  },
  detailsRefreshingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  detailsRefreshingText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#9E8E93",
  },
  detailsDismissBtn: {
    backgroundColor: "#FAF7F8",
    borderWidth: 1,
    borderColor: "#F0EAED",
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  detailsDismissBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#2A1E24",
  },
  depositCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#FAF7F8",
  },
  viewDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  viewDetailsText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#E64A78",
  },
  fullscreenSafe: {
    flex: 1,
    backgroundColor: "#000000",
  },
  fullscreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  fullscreenHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fullscreenTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  fullscreenOpenBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "100%",
  },
  fullscreenLoader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenErrorBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 30,
  },
  fullscreenErrorText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  fullscreenErrorBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  fullscreenErrorBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },

  /* ── Pagination Styles ── */
  paginationContainer: {
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#F3EFF1",
    alignItems: "center",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  paginationInfoRow: {
    marginBottom: 10,
  },
  paginationInfoText: {
    fontSize: 12,
    color: "#8A7980",
    fontFamily: "Poppins_500Medium",
  },
  paginationInfoHighlight: {
    color: "#2A1E24",
    fontFamily: "Poppins_600SemiBold",
  },
  paginationControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#FAF7F8",
    borderWidth: 1,
    borderColor: "#EFEAEB",
  },
  pageBtnDisabled: {
    backgroundColor: "#F7F5F6",
    borderColor: "#F0ECEE",
    opacity: 0.45,
  },
  pageBtnText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#2A1E24",
  },
  pageBtnTextDisabled: {
    color: "#C5B8BD",
  },
  pageNumberBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(230, 74, 120, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(230, 74, 120, 0.2)",
  },
  pageNumberText: {
    fontSize: 13,
    color: "#8A7980",
    fontFamily: "Poppins_500Medium",
  },
  pageNumberCurrent: {
    color: "#E64A78",
    fontFamily: "Poppins_700Bold",
  },
  pageNumberTotal: {
    color: "#8A7980",
    fontFamily: "Poppins_600SemiBold",
  },
});
