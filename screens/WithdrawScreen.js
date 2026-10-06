import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Alert from "../services/alertService";
import withdrawService from "../services/withdrawService";
import { useAuth } from "../contexts/AuthContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function WithdrawScreen({ navigation }) {
  const { user } = useAuth();

  // Screen State
  const [balance, setBalance] = useState(0);
  const [rawBalance, setRawBalance] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [minAmount, setMinAmount] = useState(500);
  const [bankDetails, setBankDetails] = useState({});
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("request"); // 'request' | 'history'

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Details Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  // ─────────────────────────────────────────
  // Fetch All Withdrawal Data
  // ─────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [infoRes, histRes] = await Promise.all([
        withdrawService.getWithdrawInfo(),
        withdrawService.getWithdrawRequests(1, 30),
      ]);

      if (infoRes.success) {
        setBalance(infoRes.balance);
        setRawBalance(infoRes.rawBalance || infoRes.balance);
        setPendingAmount(infoRes.pendingAmount || 0);
        setMinAmount(infoRes.minWithdrawAmount || 500);
        setBankDetails(infoRes.bankDetails || {});
        setHasBankDetails(infoRes.hasBankDetails);
      }

      if (histRes.success) {
        setHistory(histRes.requests || []);
      }
    } catch (err) {
      console.error("Withdraw screen fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  // Quick Preset Selection
  const handleSelectPreset = (presetVal) => {
    if (presetVal === "ALL") {
      setAmount(String(Math.floor(balance)));
    } else {
      setAmount(String(presetVal));
    }
  };

  // ─────────────────────────────────────────
  // Submit Withdrawal Request
  // ─────────────────────────────────────────
  const handleSubmitWithdrawal = () => {
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount to withdraw.");
      return;
    }

    if (amountNum < minAmount) {
      Alert.alert(
        "Minimum Withdrawal Limit",
        `The minimum withdrawal amount is ₹${minAmount.toLocaleString("en-IN")}. You cannot request an amount lower than this threshold.`
      );
      return;
    }

    if (amountNum > balance) {
      Alert.alert(
        "Insufficient Balance",
        `Your current available wallet balance is ₹${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}. You cannot withdraw more than your available balance.`
      );
      return;
    }

    if (!hasBankDetails) {
      Alert.alert(
        "Bank Details Required",
        "Please update your bank details in your Profile before submitting a withdrawal request.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Profile", onPress: () => navigation.navigate("EditProfile") },
        ]
      );
      return;
    }

    // Confirmation Alert
    const bankName = bankDetails.bank_name || "your bank account";
    const accNo = bankDetails.account_number ? ` (A/C: •••• ${bankDetails.account_number.slice(-4)})` : "";

    Alert.alert(
      "Confirm Withdrawal",
      `Are you sure you want to request a withdrawal of ₹${amountNum.toLocaleString("en-IN")} to ${bankName}${accNo}?\n\nOnce approved by admin, the amount will be credited to your bank and cut from your wallet.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await withdrawService.requestWithdraw(amountNum, remark);
              if (res.success) {
                // Immediately deduct locally so user cannot submit more than available
                setBalance((prev) => Math.max(0, prev - amountNum));
                setPendingAmount((prev) => prev + amountNum);
                Alert.alert(
                  "Request Submitted",
                  "Your withdrawal request has been submitted successfully. The amount is temporarily held from your available balance until admin approves or rejects."
                );
                setAmount("");
                setRemark("");
                setActiveTab("history");
                fetchData();
              } else {
                Alert.alert("Request Failed", res.message || "Unable to submit withdrawal request.");
              }
            } catch (err) {
              console.error("Submit withdraw error:", err);
              Alert.alert("Error", "An unexpected error occurred while processing your request.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // Mask Account Number
  const getMaskedAccount = (accNo) => {
    if (!accNo) return "Not provided";
    const str = String(accNo);
    if (str.length <= 4) return str;
    return `•••• •••• ${str.slice(-4)}`;
  };

  const parsedAmount = parseFloat(amount) || 0;
  const isBelowMin = parsedAmount > 0 && parsedAmount < minAmount;
  const isExceedingBal = parsedAmount > balance;

  // Preset Buttons Array
  const PRESET_AMOUNTS = [500, 1000, 2000, 5000];

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#2A1E24" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Withdraw Money</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#E64A78" />
          <Text style={styles.loaderText}>Loading withdrawal info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#2A1E24" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw Money</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onRefresh} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={20} color="#2A1E24" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.container, { paddingBottom: 220 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#E64A78"]} />}
        >
        {/* ── Balance Hero Card ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.goldBadge}>
              <Ionicons name="wallet" size={11} color="#C89738" />
              <Text style={styles.goldBadgeText}>Wallet Balance</Text>
            </View>
            <View style={styles.minLimitPill}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#FFFFFF" />
              <Text style={styles.minLimitText}>Min. ₹{minAmount.toLocaleString("en-IN")}</Text>
            </View>
          </View>

          <Text style={styles.balanceLabel}>Available for Payout</Text>
          <Text style={styles.balanceValue}>
            ₹ {balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Text>

          {pendingAmount > 0 && (
            <View style={styles.pendingHoldPill}>
              <Ionicons name="time-outline" size={13} color="#F59E0B" />
              <Text style={styles.pendingHoldText}>
                ₹{pendingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} on hold (under review)
              </Text>
            </View>
          )}

          <View style={styles.payoutNoticeRow}>
            <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.payoutNoticeText}>
              Requested amounts are temporarily held until admin review. When approved, funds are debited; if rejected, held funds return to your balance.
            </Text>
          </View>

          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
        </View>

        {/* ── Segmented Tab Selector ── */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "request" && styles.tabBtnActive]}
            onPress={() => setActiveTab("request")}
            activeOpacity={0.85}
          >
            <Ionicons
              name="cash-outline"
              size={16}
              color={activeTab === "request" ? "#FFFFFF" : "#9E8E93"}
            />
            <Text style={[styles.tabBtnText, activeTab === "request" && styles.tabBtnTextActive]}>
              Request Payout
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "history" && styles.tabBtnActive]}
            onPress={() => setActiveTab("history")}
            activeOpacity={0.85}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={activeTab === "history" ? "#FFFFFF" : "#9E8E93"}
            />
            <Text style={[styles.tabBtnText, activeTab === "history" && styles.tabBtnTextActive]}>
              History
            </Text>
            {history.length > 0 && (
              <View style={[styles.tabCountBadge, activeTab === "history" && styles.tabCountBadgeActive]}>
                <Text style={[styles.tabCountText, activeTab === "history" && styles.tabCountTextActive]}>
                  {history.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════
            TAB 1: REQUEST WITHDRAWAL
            ══════════════════════════════════════════ */}
        {activeTab === "request" && (
          <View style={styles.sectionWrap}>
            {/* Bank Details Card */}
            <View style={styles.cardBox}>
              <View style={styles.cardBoxHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.cardHeaderIconWrap}>
                    <Ionicons name="business-outline" size={17} color="#E64A78" />
                  </View>
                  <Text style={styles.cardBoxTitle}>Payout Destination</Text>
                </View>
                <TouchableOpacity
                  style={styles.cardActionLink}
                  onPress={() => navigation.navigate("EditProfile")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cardActionLinkText}>
                    {hasBankDetails ? "Edit Details" : "Add Bank"}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#E64A78" />
                </TouchableOpacity>
              </View>

              {hasBankDetails ? (
                <View style={styles.bankGrid}>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Bank Name</Text>
                    <Text style={styles.bankValue}>{bankDetails.bank_name || "N/A"}</Text>
                  </View>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Account Holder</Text>
                    <Text style={styles.bankValue}>
                      {bankDetails.account_holder_name || user?.name || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Account Number</Text>
                    <Text style={[styles.bankValue, styles.monoText]}>
                      {getMaskedAccount(bankDetails.account_number)}
                    </Text>
                  </View>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>IFSC Code</Text>
                    <Text style={[styles.bankValue, styles.monoText]}>
                      {bankDetails.ifsc_code || "N/A"}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noBankWarning}>
                  <Ionicons name="alert-circle" size={24} color="#EF4444" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noBankTitle}>Bank Details Missing</Text>
                    <Text style={styles.noBankSub}>
                      Please provide your bank account number and IFSC code in your Profile so payouts can be transferred smoothly.
                    </Text>
                    <TouchableOpacity
                      style={styles.addBankBtn}
                      onPress={() => navigation.navigate("EditProfile")}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.addBankBtnText}>Complete Bank Profile</Text>
                      <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Withdrawal Form Card */}
            <View style={styles.cardBox}>
              <Text style={styles.inputLabel}>Enter Withdrawal Amount (₹)</Text>

              {/* Amount Input */}
              <View
                style={[
                  styles.inputBox,
                  isBelowMin && styles.inputBoxWarning,
                  isExceedingBal && styles.inputBoxError,
                ]}
              >
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder={`Min. ${minAmount}`}
                  placeholderTextColor="#C5B8BD"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  editable={!submitting}
                />
                {amount.length > 0 && (
                  <TouchableOpacity onPress={() => setAmount("")} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={18} color="#C5B8BD" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Validation Status Hints */}
              {isBelowMin && (
                <View style={styles.hintRow}>
                  <Ionicons name="warning-outline" size={14} color="#F59E0B" />
                  <Text style={[styles.hintText, { color: "#D97706" }]}>
                    Minimum withdrawal allowed is ₹{minAmount.toLocaleString("en-IN")}.
                  </Text>
                </View>
              )}

              {isExceedingBal && (
                <View style={styles.hintRow}>
                  <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                  <Text style={[styles.hintText, { color: "#EF4444" }]}>
                    Amount exceeds available balance of ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}.
                  </Text>
                </View>
              )}

              {/* Quick Preset Buttons */}
              <Text style={styles.presetLabel}>Quick Select</Text>
              <View style={styles.presetRow}>
                {PRESET_AMOUNTS.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetBtn, amount === String(preset) && styles.presetBtnActive]}
                    onPress={() => handleSelectPreset(preset)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetBtnText,
                        amount === String(preset) && styles.presetBtnTextActive,
                      ]}
                    >
                      ₹{preset}
                    </Text>
                  </TouchableOpacity>
                ))}
                {balance >= minAmount && (
                  <TouchableOpacity
                    style={[styles.presetBtn, styles.presetBtnMax]}
                    onPress={() => handleSelectPreset("ALL")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetBtnMaxText}>All</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Remark Input (Optional) */}
              <Text style={[styles.inputLabel, { marginTop: 18 }]}>Note / Remarks (Optional)</Text>
              <TextInput
                style={styles.remarkInput}
                placeholder="e.g. Urgent payout, savings a/c, etc."
                placeholderTextColor="#C5B8BD"
                value={remark}
                onChangeText={setRemark}
                maxLength={120}
                editable={!submitting}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!hasBankDetails || isBelowMin || isExceedingBal || parsedAmount <= 0 || submitting) &&
                    styles.submitBtnDisabled,
                ]}
                onPress={handleSubmitWithdrawal}
                disabled={!hasBankDetails || isBelowMin || isExceedingBal || parsedAmount <= 0 || submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Submit Withdrawal Request</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Trust & Policy Note */}
              <View style={styles.policyNoteBox}>
                <Ionicons name="lock-closed-outline" size={14} color="#9E8E93" />
                <Text style={styles.policyNoteText}>
                  Your withdrawal request is encrypted. Admin reviews and approves payouts within 24-48 business hours.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════
            TAB 2: WITHDRAWAL HISTORY
            ══════════════════════════════════════════ */}
        {activeTab === "history" && (
          <View style={styles.sectionWrap}>
            {history.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="file-tray-outline" size={38} color="#E64A78" />
                </View>
                <Text style={styles.emptyTitle}>No Withdrawal Requests</Text>
                <Text style={styles.emptyDesc}>
                  You haven't requested any wallet withdrawals yet.
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setActiveTab("request")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyActionBtnText}>Make a Request</Text>
                </TouchableOpacity>
              </View>
            ) : (
              history.map((req) => {
                const isApproved = req.status === "approved";
                const isPending = req.status === "pending";
                const isRejected = req.status === "rejected";

                return (
                  <TouchableOpacity
                    key={req.id}
                    style={styles.historyCard}
                    activeOpacity={0.75}
                    onPress={() => {
                      setSelectedRequest(req);
                      setDetailsModalVisible(true);
                    }}
                  >
                    {/* Status Accent Stripe */}
                    <View
                      style={[
                        styles.historyAccentBar,
                        isApproved && styles.accentApproved,
                        isPending && styles.accentPending,
                        isRejected && styles.accentRejected,
                      ]}
                    />

                    <View style={styles.historyContent}>
                      {/* Top Row: Amount & Status Badge */}
                      <View style={styles.historyTopRow}>
                        <View style={styles.historyAmountWrap}>
                          <Text style={styles.historyAmount}>
                            ₹{Number(req.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </Text>
                        </View>

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
                                ? "time"
                                : "close-circle"
                            }
                            size={12}
                            color={
                              isApproved ? "#047857" : isPending ? "#B45309" : "#B91C1C"
                            }
                          />
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isApproved && styles.statusTextApproved,
                              isPending && styles.statusTextPending,
                              isRejected && styles.statusTextRejected,
                            ]}
                          >
                            {req.status_label || req.status}
                          </Text>
                        </View>
                      </View>

                      {/* Bank & Date Row */}
                      <View style={styles.historyMidRow}>
                        <View style={styles.historyBankWrap}>
                          <Ionicons name="business-outline" size={13} color="#9E8E93" />
                          <Text style={styles.historyBankText} numberOfLines={1}>
                            {req.bank_name || "Bank Payout"} &bull; {getMaskedAccount(req.account_number)}
                          </Text>
                        </View>
                      </View>

                      {/* Bottom Row: Remark and Timestamp */}
                      <View style={styles.historyBottomRow}>
                        <View style={styles.historyDateRow}>
                          <Ionicons name="calendar-outline" size={11} color="#C5B8BD" />
                          <Text style={styles.historyDateText}>
                            {req.formatted_created_at || req.created_at}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="#C5B8BD" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* ─────────────────────────────────────────
          Request Details Bottom Sheet / Modal
          ───────────────────────────────────────── */}
      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDetailsModalVisible(false)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Withdrawal Details</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#2A1E24" />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
                {/* Large Amount Display */}
                <View style={styles.modalAmountBox}>
                  <Text style={styles.modalAmountLabel}>Requested Amount</Text>
                  <Text style={styles.modalAmountValue}>
                    ₹{Number(selectedRequest.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      selectedRequest.status === "approved" && styles.statusApproved,
                      selectedRequest.status === "pending" && styles.statusPending,
                      selectedRequest.status === "rejected" && styles.statusRejected,
                      { alignSelf: "center", marginTop: 8 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        selectedRequest.status === "approved" && styles.statusTextApproved,
                        selectedRequest.status === "pending" && styles.statusTextPending,
                        selectedRequest.status === "rejected" && styles.statusTextRejected,
                      ]}
                    >
                      {selectedRequest.status_label || selectedRequest.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Bank Snapshot Details */}
                <View style={styles.modalDetailsCard}>
                  <Text style={styles.modalSectionTitle}>Bank Information Snapshot</Text>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Bank Name</Text>
                    <Text style={styles.modalInfoValue}>{selectedRequest.bank_name || "N/A"}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Account Holder</Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedRequest.account_holder_name || user?.name || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Account Number</Text>
                    <Text style={[styles.modalInfoValue, styles.monoText]}>
                      {selectedRequest.account_number || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>IFSC Code</Text>
                    <Text style={[styles.modalInfoValue, styles.monoText]}>
                      {selectedRequest.ifsc_code || "N/A"}
                    </Text>
                  </View>
                  <View style={[styles.modalInfoRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.modalInfoLabel}>Submitted On</Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedRequest.formatted_created_at || selectedRequest.created_at}
                    </Text>
                  </View>
                </View>

                {/* Admin Note if Rejected or Approved */}
                {selectedRequest.admin_remark ? (
                  <View
                    style={[
                      styles.modalRemarkBox,
                      selectedRequest.status === "rejected" && { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
                    ]}
                  >
                    <Text style={styles.modalRemarkLabel}>Admin Note:</Text>
                    <Text style={styles.modalRemarkValue}>{selectedRequest.admin_remark}</Text>
                  </View>
                ) : null}

                {/* Member Remark */}
                {selectedRequest.remark ? (
                  <View style={styles.modalRemarkBox}>
                    <Text style={styles.modalRemarkLabel}>Your Note:</Text>
                    <Text style={styles.modalRemarkValue}>{selectedRequest.remark}</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalOkBtn}
              onPress={() => setDetailsModalVisible(false)}
            >
              <Text style={styles.modalOkBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3EFF1",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F7F3F5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2A1E24",
    letterSpacing: 0.2,
  },
  loaderCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: "#9E8E93",
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },

  /* ── Hero Balance Card ── */
  heroCard: {
    borderRadius: 22,
    padding: 22,
    backgroundColor: "#2A1E24",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  goldBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(200, 151, 56, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(200, 151, 56, 0.4)",
  },
  goldBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C89738",
    letterSpacing: 0.3,
  },
  minLimitPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(230, 74, 120, 0.3)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(230, 74, 120, 0.5)",
  },
  minLimitText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  balanceLabel: {
    fontSize: 12,
    color: "#C5B8BD",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "600",
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginVertical: 4,
    letterSpacing: -0.5,
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
    marginVertical: 4,
  },
  pendingHoldText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FBBF24",
  },
  payoutNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  payoutNoticeText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    flex: 1,
  },
  decorCircle1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(200, 151, 56, 0.08)",
  },
  decorCircle2: {
    position: "absolute",
    bottom: -50,
    right: 40,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(230, 74, 120, 0.08)",
  },

  /* ── Segmented Tabs ── */
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F0EAEB",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: "#E64A78",
    shadowColor: "#E64A78",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9E8E93",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  tabCountBadge: {
    backgroundColor: "rgba(158, 142, 147, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabCountBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9E8E93",
  },
  tabCountTextActive: {
    color: "#FFFFFF",
  },

  /* ── Section & Card Boxes ── */
  sectionWrap: {
    gap: 16,
  },
  cardBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F0EBEF",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F7F3F5",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardHeaderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#FDF2F4",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBoxTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2A1E24",
  },
  cardActionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cardActionLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E64A78",
  },

  /* Bank Info Grid */
  bankGrid: {
    gap: 8,
  },
  bankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  bankLabel: {
    fontSize: 12,
    color: "#9E8E93",
    fontWeight: "500",
  },
  bankValue: {
    fontSize: 13,
    color: "#2A1E24",
    fontWeight: "600",
  },
  monoText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.5,
  },

  /* Missing Bank Warning */
  noBankWarning: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  noBankTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B91C1C",
    marginBottom: 4,
  },
  noBankSub: {
    fontSize: 11,
    color: "#7F1D1D",
    lineHeight: 16,
    marginBottom: 10,
  },
  addBankBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBankBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Form Elements */
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2A1E24",
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDFBFC",
    borderWidth: 1.5,
    borderColor: "#EADBDF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  inputBoxWarning: {
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  inputBoxError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2A1E24",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#2A1E24",
    padding: 0,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    marginBottom: 8,
  },
  hintText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9E8E93",
    marginTop: 10,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F7F3F5",
    borderWidth: 1,
    borderColor: "#EADBDF",
  },
  presetBtnActive: {
    backgroundColor: "#FCE7F3",
    borderColor: "#E64A78",
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2A1E24",
  },
  presetBtnTextActive: {
    color: "#E64A78",
    fontWeight: "700",
  },
  presetBtnMax: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  presetBtnMaxText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
  },
  remarkInput: {
    backgroundColor: "#FDFBFC",
    borderWidth: 1,
    borderColor: "#EADBDF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#2A1E24",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E64A78",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 20,
    shadowColor: "#E64A78",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnDisabled: {
    backgroundColor: "#D1C7CB",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  policyNoteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  policyNoteText: {
    fontSize: 11,
    color: "#9E8E93",
    lineHeight: 16,
    flex: 1,
  },

  /* ── History Card Styles ── */
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0EBEF",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
    position: "relative",
  },
  historyAccentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
  },
  accentApproved: { backgroundColor: "#10B981" },
  accentPending: { backgroundColor: "#F59E0B" },
  accentRejected: { backgroundColor: "#EF4444" },

  historyContent: {
    padding: 16,
    paddingLeft: 18,
    gap: 8,
  },
  historyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyAmountWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2A1E24",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusApproved: {
    backgroundColor: "#D1FAE5",
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
  },
  statusRejected: {
    backgroundColor: "#FEE2E2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextApproved: { color: "#047857" },
  statusTextPending: { color: "#B45309" },
  statusTextRejected: { color: "#B91C1C" },

  historyMidRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyBankWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  historyBankText: {
    fontSize: 12,
    color: "#5C4B52",
    fontWeight: "500",
  },
  historyBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#FAF7F8",
  },
  historyDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  historyDateText: {
    fontSize: 11,
    color: "#9E8E93",
  },

  /* Empty Card */
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EBEF",
    gap: 8,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FDF2F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2A1E24",
  },
  emptyDesc: {
    fontSize: 12,
    color: "#9E8E93",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 10,
  },
  emptyActionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#E64A78",
  },
  emptyActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* ── Modal Details Sheet ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0D7DA",
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
    fontSize: 17,
    fontWeight: "700",
    color: "#2A1E24",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F7F3F5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAmountBox: {
    backgroundColor: "#FDF2F4",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCE7F3",
  },
  modalAmountLabel: {
    fontSize: 11,
    color: "#9E8E93",
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  modalAmountValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#E64A78",
    marginVertical: 4,
  },
  modalDetailsCard: {
    backgroundColor: "#FDFBFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0EBEF",
    marginBottom: 14,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2A1E24",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  modalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F7F3F5",
  },
  modalInfoLabel: {
    fontSize: 12,
    color: "#9E8E93",
  },
  modalInfoValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2A1E24",
  },
  modalRemarkBox: {
    backgroundColor: "#F9F9FB",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    marginBottom: 12,
  },
  modalRemarkLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
  },
  modalRemarkValue: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 18,
  },
  modalOkBtn: {
    backgroundColor: "#2A1E24",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
  },
  modalOkBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
