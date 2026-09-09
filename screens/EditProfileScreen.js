import React, { useState, useEffect, useCallback, useMemo } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import profileService from "../services/profileService";

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { user, refreshProfile } = useAuth();

  // Screen State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Expanded Accordion Sections
  const [expanded, setExpanded] = useState({
    personal: true,
    kyc: false,
    bank: false,
  });

  // Which text input currently has focus — drives the highlighted border
  const [focusedField, setFocusedField] = useState(null);

  // Profile Form Fields
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    aadhar_number: "",
    pan_number: "",
    account_holder_name: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    account_type: "Savings",
    branch_name: "",
  });

  // Image Previews (remote URL or local URI)
  const [previews, setPreviews] = useState({
    profile_image: null,
    aadhar_image: null,
    pan_image: null,
  });

  // Picked files for multipart upload
  const [selectedFiles, setSelectedFiles] = useState({
    profile_image: null,
    aadhar_image: null,
    pan_image: null,
  });

  // Raw API Profile details
  const [profileData, setProfileData] = useState(null);

  // Image Picker Modal State
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [activePickerField, setActivePickerField] = useState(null);

  // Account Type Modal State
  const [accountTypeModalVisible, setAccountTypeModalVisible] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // Load Profile Data
  // ─────────────────────────────────────────────────────────────
  const loadProfile = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      try {
        const res = await profileService.getProfile();
        if (res.success && res.data) {
          const u = res.data;
          setProfileData(u);
          setForm({
            name: u.name || "",
            email: u.email || "",
            phone: u.phone || u.mobile || "",
            address: u.address || "",
            aadhar_number: u.aadhar_number || "",
            pan_number: u.pan_number || "",
            account_holder_name: u.account_holder_name || "",
            bank_name: u.bank_name || "",
            account_number: u.account_number || "",
            ifsc_code: u.ifsc_code || "",
            account_type: u.account_type || "Savings",
            branch_name: u.branch_name || "",
          });
          setPreviews({
            profile_image: u.profile_image || u.image || null,
            aadhar_image: u.aadhar_image || null,
            pan_image: u.pan_image || null,
          });
          setSelectedFiles({
            profile_image: null,
            aadhar_image: null,
            pan_image: null,
          });
          if (refreshProfile) {
            await refreshProfile();
          }
        } else if (res.message && res.message !== "User is not logged in") {
          Alert.alert("Notice", res.message);
        }
      } catch (err) {
        console.error("Error loading profile in EditProfileScreen:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshProfile],
  );

  useEffect(() => {
    loadProfile(true);
  }, [loadProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile(false);
  }, [loadProfile]);

  // Toggle Accordion Section
  const toggleSection = (sectionKey) => {
    setExpanded((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Update Field Handler
  const updateField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  // ─────────────────────────────────────────────────────────────
  // Section Completion Counts
  // ─────────────────────────────────────────────────────────────
  const personalStats = useMemo(() => {
    const fields = [form.name, form.email, form.phone, form.address];
    const filled = fields.filter((f) => !!f && String(f).trim() !== "").length;
    return { filled, total: 4, isComplete: filled === 4 };
  }, [form.name, form.email, form.phone, form.address]);

  const kycStats = useMemo(() => {
    const hasAadharImg =
      !!selectedFiles.aadhar_image || !!previews.aadhar_image;
    const hasPanImg = !!selectedFiles.pan_image || !!previews.pan_image;
    const checks = [
      !!form.aadhar_number && form.aadhar_number.trim().length >= 12,
      hasAadharImg,
      !!form.pan_number && form.pan_number.trim().length >= 10,
      hasPanImg,
    ];
    const filled = checks.filter(Boolean).length;
    return { filled, total: 4, isComplete: filled === 4 };
  }, [form.aadhar_number, form.pan_number, selectedFiles, previews]);

  const bankStats = useMemo(() => {
    const fields = [
      form.account_holder_name,
      form.bank_name,
      form.account_number,
      form.ifsc_code,
      form.account_type,
      form.branch_name,
    ];
    const filled = fields.filter((f) => !!f && String(f).trim() !== "").length;
    return { filled, total: 6, isComplete: filled === 6 };
  }, [
    form.account_holder_name,
    form.bank_name,
    form.account_number,
    form.ifsc_code,
    form.account_type,
    form.branch_name,
  ]);

  // Overall completion across all three sections — powers the summary bar
  // in the header card so the user can see total progress without
  // expanding every accordion.
  const overallStats = useMemo(() => {
    const filled = personalStats.filled + kycStats.filled + bankStats.filled;
    const total = personalStats.total + kycStats.total + bankStats.total;
    const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
    return { filled, total, percentage, isComplete: filled === total };
  }, [personalStats, kycStats, bankStats]);

  const overallColor = overallStats.isComplete
    ? "#27A462"
    : overallStats.percentage >= 50
      ? "#C89738"
      : "#E64A78";

  // ─────────────────────────────────────────────────────────────
  // Image Picker Logic
  // ─────────────────────────────────────────────────────────────
  const openImagePickerModal = (field) => {
    setActivePickerField(field);
    setPickerModalVisible(true);
  };

  const handlePickCamera = async () => {
    setPickerModalVisible(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Camera permission is required to capture photos.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPreviews((prev) => ({ ...prev, [activePickerField]: asset.uri }));
        setSelectedFiles((prev) => ({ ...prev, [activePickerField]: asset }));
      }
    } catch (err) {
      console.error("Camera capture error:", err);
      Alert.alert("Error", "Unable to capture photo.");
    }
  };

  const handlePickGallery = async () => {
    setPickerModalVisible(false);
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Gallery permission is required to select photos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPreviews((prev) => ({ ...prev, [activePickerField]: asset.uri }));
        setSelectedFiles((prev) => ({ ...prev, [activePickerField]: asset }));
      }
    } catch (err) {
      console.error("Gallery picker error:", err);
      Alert.alert("Error", "Unable to select photo.");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Update Profile Request
  // ─────────────────────────────────────────────────────────────
  const handleUpdateProfile = async () => {
    if (!form.name || form.name.trim() === "") {
      Alert.alert("Validation Error", "Full Name is required.");
      return;
    }

    if (!form.phone || form.phone.trim() === "") {
      Alert.alert("Validation Error", "Phone number is required.");
      return;
    }

    setSaving(true);
    try {
      const textFields = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        aadhar_number: form.aadhar_number.trim(),
        pan_number: form.pan_number.trim().toUpperCase(),
        account_holder_name: form.account_holder_name.trim(),
        bank_name: form.bank_name.trim(),
        account_number: form.account_number.trim(),
        ifsc_code: form.ifsc_code.trim().toUpperCase(),
        account_type: form.account_type.trim(),
        branch_name: form.branch_name.trim(),
      };

      const filesToUpload = {};
      if (selectedFiles.profile_image)
        filesToUpload.profile_image = selectedFiles.profile_image;
      if (selectedFiles.aadhar_image)
        filesToUpload.aadhar_image = selectedFiles.aadhar_image;
      if (selectedFiles.pan_image)
        filesToUpload.pan_image = selectedFiles.pan_image;

      const res = await profileService.updateProfile(textFields, filesToUpload);

      if (res.success && res.data) {
        setProfileData(res.data);
        setPreviews({
          profile_image:
            res.data.profile_image || res.data.image || previews.profile_image,
          aadhar_image: res.data.aadhar_image || previews.aadhar_image,
          pan_image: res.data.pan_image || previews.pan_image,
        });
        setSelectedFiles({
          profile_image: null,
          aadhar_image: null,
          pan_image: null,
        });
        if (refreshProfile) {
          await refreshProfile();
        }
        Alert.alert("Success", "Profile updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert(
          "Update Failed",
          res.message || "Unable to update profile.",
        );
      }
    } catch (err) {
      console.error("Update profile error:", err);
      Alert.alert("Error", "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = form.name || profileData?.name || user?.name || "User";
  const displayEmail =
    form.email || profileData?.email || user?.email || "No email provided";
  const displayPhone =
    form.phone ||
    profileData?.phone ||
    profileData?.mobile ||
    user?.phone ||
    user?.mobile ||
    "";
  const displayRef =
    profileData?.referral_code || user?.referral_code || "DS700";
  const avatarUri =
    previews.profile_image || profileData?.profile_image || user?.profile_image;

  // Small helper so every TextInput gets consistent focus/blur wiring
  // without repeating the same two functions 11 times.
  const fieldFocusProps = (key) => ({
    onFocus: () => setFocusedField(key),
    onBlur: () => setFocusedField((prev) => (prev === key ? null : prev)),
  });

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
          <Text style={styles.screenTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#E64A78" />
          <Text style={styles.loadingText}>Loading Profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Top Header Navigation */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#2A1E24" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#E64A78"]}
              tintColor="#E64A78"
            />
          }
        >
          {/* Profile Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              {/* Avatar with gold border */}
              <TouchableOpacity
                style={styles.avatarBorderWrap}
                activeOpacity={0.8}
                onPress={() => openImagePickerModal("profile_image")}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>
                      {displayName.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.avatarCameraBadge}>
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              {/* Center Info */}
              <View style={styles.headerInfo}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.headerEmail} numberOfLines={1}>
                  {displayEmail}
                </Text>
                {displayPhone ? (
                  <Text style={styles.headerPhone} numberOfLines={1}>
                    +91 {displayPhone.replace(/^\+91\s*/, "")}
                  </Text>
                ) : null}

                {/* Referral Code Pill */}
                <View style={styles.refPill}>
                  <Ionicons name="gift-outline" size={13} color="#C89738" />
                  <Text style={styles.refCodeText}>{displayRef}</Text>
                </View>
              </View>
            </View>

            {/* Overall Completion Summary */}
            <View style={styles.overallDivider} />
            <View style={styles.overallRow}>
              <Text style={styles.overallLabel}>
                Overall Profile Completion
              </Text>
              <Text style={[styles.overallPercent, { color: overallColor }]}>
                {overallStats.percentage}%
              </Text>
            </View>
            <View style={styles.overallTrack}>
              <View
                style={[
                  styles.overallFill,
                  {
                    width: `${Math.max(4, overallStats.percentage)}%`,
                    backgroundColor: overallColor,
                  },
                ]}
              />
            </View>
            <View style={styles.overallStepsRow}>
              <View style={styles.overallStep}>
                <Ionicons
                  name={
                    personalStats.isComplete
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={13}
                  color={personalStats.isComplete ? "#27A462" : "#C5B8BD"}
                />
                <Text style={styles.overallStepText}>Personal</Text>
              </View>
              <View style={styles.overallStep}>
                <Ionicons
                  name={
                    kycStats.isComplete ? "checkmark-circle" : "ellipse-outline"
                  }
                  size={13}
                  color={kycStats.isComplete ? "#27A462" : "#C5B8BD"}
                />
                <Text style={styles.overallStepText}>KYC</Text>
              </View>
              <View style={styles.overallStep}>
                <Ionicons
                  name={
                    bankStats.isComplete
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={13}
                  color={bankStats.isComplete ? "#27A462" : "#C5B8BD"}
                />
                <Text style={styles.overallStepText}>Bank</Text>
              </View>
            </View>
          </View>

          {/* ─────────────────────────────────────────────────────────────
              Section 1: Personal Details (Dropdown Accordion)
          ───────────────────────────────────────────────────────────── */}
          <View style={styles.accordionCard}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleSection("personal")}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: "rgba(230,74,120,0.1)" },
                ]}
              >
                <Ionicons name="person-outline" size={20} color="#E64A78" />
              </View>

              <View style={styles.headerTextGroup}>
                <Text style={styles.sectionTitle}>Personal Details</Text>
                <Text
                  style={[
                    styles.sectionStatus,
                    personalStats.isComplete
                      ? styles.statusSuccess
                      : styles.statusPending,
                  ]}
                >
                  {personalStats.isComplete
                    ? "✓ Completed"
                    : `Pending (${personalStats.filled}/${personalStats.total})`}
                </Text>
              </View>

              <View style={styles.headerRightGroup}>
                <View
                  style={[
                    styles.countBadge,
                    personalStats.isComplete
                      ? styles.badgeSuccess
                      : styles.badgePending,
                  ]}
                >
                  <Text style={styles.countBadgeText}>
                    {personalStats.filled}/{personalStats.total}
                  </Text>
                </View>
                <View style={styles.chevronWrap}>
                  <Ionicons
                    name={expanded.personal ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#9E8E93"
                  />
                </View>
              </View>
            </TouchableOpacity>

            {expanded.personal && (
              <View style={styles.accordionBody}>
                <View style={styles.divider} />

                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusedField === "name" && styles.inputWrapFocused,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={17}
                      color={focusedField === "name" ? "#E64A78" : "#9E8E93"}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter full name"
                      placeholderTextColor="#9E8E93"
                      value={form.name}
                      onChangeText={(val) => updateField("name", val)}
                      {...fieldFocusProps("name")}
                    />
                  </View>
                </View>

                {/* Email Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusedField === "email" && styles.inputWrapFocused,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={17}
                      color={focusedField === "email" ? "#E64A78" : "#9E8E93"}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter email address"
                      placeholderTextColor="#9E8E93"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={form.email}
                      onChangeText={(val) => updateField("email", val)}
                      {...fieldFocusProps("email")}
                    />
                  </View>
                </View>

                {/* Mobile Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mobile Number *</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusedField === "phone" && styles.inputWrapFocused,
                    ]}
                  >
                    <Ionicons
                      name="call-outline"
                      size={17}
                      color={focusedField === "phone" ? "#E64A78" : "#9E8E93"}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#9E8E93"
                      keyboardType="phone-pad"
                      maxLength={15}
                      value={form.phone}
                      onChangeText={(val) => updateField("phone", val)}
                      {...fieldFocusProps("phone")}
                    />
                  </View>
                </View>

                {/* Residential Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      styles.multilineInputWrap,
                      focusedField === "address" && styles.inputWrapFocused,
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={17}
                      color={focusedField === "address" ? "#E64A78" : "#9E8E93"}
                      style={[styles.inputIcon, { marginTop: 10 }]}
                    />
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      placeholder="Enter complete residential address"
                      placeholderTextColor="#9E8E93"
                      multiline
                      numberOfLines={3}
                      value={form.address}
                      onChangeText={(val) => updateField("address", val)}
                      {...fieldFocusProps("address")}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* ─────────────────────────────────────────────────────────────
              Section 2: KYC Details (Dropdown Accordion)
          ───────────────────────────────────────────────────────────── */}
          <View style={styles.accordionCard}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleSection("kyc")}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: "rgba(39,164,98,0.12)" },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#27A462"
                />
              </View>

              <View style={styles.headerTextGroup}>
                <Text style={styles.sectionTitle}>KYC Details</Text>
                <Text
                  style={[
                    styles.sectionStatus,
                    kycStats.isComplete
                      ? styles.statusSuccess
                      : styles.statusPending,
                  ]}
                >
                  {kycStats.isComplete
                    ? "✓ Completed"
                    : `Pending (${kycStats.filled}/${kycStats.total})`}
                </Text>
              </View>

              <View style={styles.headerRightGroup}>
                <View
                  style={[
                    styles.countBadge,
                    kycStats.isComplete
                      ? styles.badgeSuccess
                      : styles.badgePending,
                  ]}
                >
                  <Text style={styles.countBadgeText}>
                    {kycStats.filled}/{kycStats.total}
                  </Text>
                </View>
                <View style={styles.chevronWrap}>
                  <Ionicons
                    name={expanded.kyc ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#9E8E93"
                  />
                </View>
              </View>
            </TouchableOpacity>

            {expanded.kyc && (
              <View style={styles.accordionBody}>
                <View style={styles.divider} />

                {/* Aadhar Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Aadhar Card Number</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusedField === "aadhar_number" &&
                        styles.inputWrapFocused,
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={17}
                      color={
                        focusedField === "aadhar_number" ? "#E64A78" : "#9E8E93"
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="12-digit Aadhar number"
                      placeholderTextColor="#9E8E93"
                      keyboardType="numeric"
                      maxLength={12}
                      value={form.aadhar_number}
                      onChangeText={(val) => updateField("aadhar_number", val)}
                      {...fieldFocusProps("aadhar_number")}
                    />
                  </View>
                </View>

                {/* Aadhar Image Upload */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Aadhar Card Document</Text>
                  <TouchableOpacity
                    style={styles.docUploadCard}
                    onPress={() => openImagePickerModal("aadhar_image")}
                    activeOpacity={0.75}
                  >
                    {previews.aadhar_image ? (
                      <View style={styles.docPreviewRow}>
                        <Image
                          source={{ uri: previews.aadhar_image }}
                          style={styles.docThumb}
                        />
                        <View style={styles.docInfoCol}>
                          <Text style={styles.docStatusText}>
                            ✓ Aadhar Attached
                          </Text>
                          <Text style={styles.docActionLink}>
                            Tap to change document
                          </Text>
                        </View>
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#27A462"
                        />
                      </View>
                    ) : (
                      <View style={styles.docPlaceholderRow}>
                        <View
                          style={[
                            styles.docUploadIconBox,
                            { backgroundColor: "rgba(39,164,98,0.12)" },
                          ]}
                        >
                          <Ionicons
                            name="cloud-upload-outline"
                            size={22}
                            color="#27A462"
                          />
                        </View>
                        <View style={styles.docInfoCol}>
                          <Text style={styles.docPlaceholderTitle}>
                            Upload Aadhar Card
                          </Text>
                          <Text style={styles.docPlaceholderHint}>
                            JPG, PNG (Max 2MB)
                          </Text>
                        </View>
                        <Ionicons
                          name="add-circle-outline"
                          size={22}
                          color="#27A462"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* PAN Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>PAN Card Number</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusedField === "pan_number" && styles.inputWrapFocused,
                    ]}
                  >
                    <Ionicons
                      name="card-outline"
                      size={17}
                      color={
                        focusedField === "pan_number" ? "#E64A78" : "#9E8E93"
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="10-character PAN (e.g. ABCDE1234F)"
                      placeholderTextColor="#9E8E93"
                      autoCapitalize="characters"
                      maxLength={10}
                      value={form.pan_number}
                      onChangeText={(val) =>
                        updateField("pan_number", val.toUpperCase())
                      }
                      {...fieldFocusProps("pan_number")}
                    />
                  </View>
                </View>

                {/* PAN Image Upload */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>PAN Card Document</Text>
                  <TouchableOpacity
                    style={styles.docUploadCard}
                    onPress={() => openImagePickerModal("pan_image")}
                    activeOpacity={0.75}
                  >
                    {previews.pan_image ? (
                      <View style={styles.docPreviewRow}>
                        <Image
                          source={{ uri: previews.pan_image }}
                          style={styles.docThumb}
                        />
                        <View style={styles.docInfoCol}>
                          <Text style={styles.docStatusText}>
                            ✓ PAN Card Attached
                          </Text>
                          <Text style={styles.docActionLink}>
                            Tap to change document
                          </Text>
                        </View>
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#27A462"
                        />
                      </View>
                    ) : (
                      <View style={styles.docPlaceholderRow}>
                        <View
                          style={[
                            styles.docUploadIconBox,
                            { backgroundColor: "rgba(39,164,98,0.12)" },
                          ]}
                        >
                          <Ionicons
                            name="cloud-upload-outline"
                            size={22}
                            color="#27A462"
                          />
                        </View>
                        <View style={styles.docInfoCol}>
                          <Text style={styles.docPlaceholderTitle}>
                            Upload PAN Card
                          </Text>
                          <Text style={styles.docPlaceholderHint}>
                            JPG, PNG (Max 2MB)
                          </Text>
                        </View>
                        <Ionicons
                          name="add-circle-outline"
                          size={22}
                          color="#27A462"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ─────────────────────────────────────────────────────────────
              Section 3: Bank Details (Dropdown Accordion)
          ───────────────────────────────────────────────────────────── */}
          <View style={styles.accordionCard}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleSection("bank")}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: "rgba(200,151,56,0.12)" },
                ]}
              >
                <Ionicons name="card-outline" size={20} color="#C89738" />
              </View>

              <View style={styles.headerTextGroup}>
                <Text style={styles.sectionTitle}>Bank Details</Text>
                <Text
                  style={[
                    styles.sectionStatus,
                    bankStats.isComplete
                      ? styles.statusSuccess
                      : styles.statusPending,
                  ]}
                >
                  {bankStats.isComplete
                    ? "✓ Completed"
                    : `Pending (${bankStats.filled}/${bankStats.total})`}
                </Text>
              </View>

              <View style={styles.headerRightGroup}>
                <View
                  style={[
                    styles.countBadge,
                    bankStats.isComplete
                      ? styles.badgeSuccess
                      : styles.badgePending,
                  ]}
                >
                  <Text style={styles.countBadgeText}>
                    {bankStats.filled}/{bankStats.total}
                  </Text>
                </View>
                <View style={styles.chevronWrap}>
                  <Ionicons
                    name={expanded.bank ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#9E8E93"
                  />
                </View>
              </View>
            </TouchableOpacity>

            {expanded.bank && (
              <View style={styles.accordionBody}>
                <View style={styles.divider} />

                {/* Account Holder Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Holder Name</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusedField === "account_holder_name" &&
                        styles.inputWrapFocused,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={17}
                      color={
                        focusedField === "account_holder_name"
                          ? "#E64A78"
                          : "#9E8E93"
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Name as registered with bank"
                      placeholderTextColor="#9E8E93"
                      value={form.account_holder_name}
                      onChangeText={(val) =>
                        updateField("account_holder_name", val)
                      }
                      {...fieldFocusProps("account_holder_name")}
                    />
                  </View>
                </View>

                {/* Bank Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bank Name</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusedField === "bank_name" && styles.inputWrapFocused,
                    ]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={17}
                      color={
                        focusedField === "bank_name" ? "#E64A78" : "#9E8E93"
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. State Bank of India, HDFC"
                      placeholderTextColor="#9E8E93"
                      value={form.bank_name}
                      onChangeText={(val) => updateField("bank_name", val)}
                      {...fieldFocusProps("bank_name")}
                    />
                  </View>
                </View>

                {/* Account Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Number</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusedField === "account_number" &&
                        styles.inputWrapFocused,
                    ]}
                  >
                    <Ionicons
                      name="wallet-outline"
                      size={17}
                      color={
                        focusedField === "account_number"
                          ? "#E64A78"
                          : "#9E8E93"
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter bank account number"
                      placeholderTextColor="#9E8E93"
                      keyboardType="numeric"
                      value={form.account_number}
                      onChangeText={(val) => updateField("account_number", val)}
                      {...fieldFocusProps("account_number")}
                    />
                  </View>
                </View>

                {/* IFSC Code */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>IFSC Code</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusedField === "ifsc_code" && styles.inputWrapFocused,
                    ]}
                  >
                    <Ionicons
                      name="barcode-outline"
                      size={17}
                      color={
                        focusedField === "ifsc_code" ? "#E64A78" : "#9E8E93"
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. SBIN0001234"
                      placeholderTextColor="#9E8E93"
                      autoCapitalize="characters"
                      value={form.ifsc_code}
                      onChangeText={(val) =>
                        updateField("ifsc_code", val.toUpperCase())
                      }
                      {...fieldFocusProps("ifsc_code")}
                    />
                  </View>
                </View>

                {/* Account Type Dropdown */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Type</Text>
                  <TouchableOpacity
                    style={styles.dropdownSelector}
                    onPress={() => setAccountTypeModalVisible(true)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.dropdownLeft}>
                      <Ionicons
                        name="wallet-outline"
                        size={17}
                        color="#9E8E93"
                        style={styles.inputIcon}
                      />
                      <Text
                        style={[
                          styles.dropdownValueText,
                          !form.account_type && styles.dropdownPlaceholderText,
                        ]}
                      >
                        {form.account_type
                          ? `${form.account_type.replace(/ account$/i, "")} Account`
                          : "Select Account Type"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={18} color="#9E8E93" />
                  </TouchableOpacity>
                </View>

                {/* Branch Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Branch Name</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusedField === "branch_name" && styles.inputWrapFocused,
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={17}
                      color={
                        focusedField === "branch_name" ? "#E64A78" : "#9E8E93"
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Naroda Branch"
                      placeholderTextColor="#9E8E93"
                      value={form.branch_name}
                      onChangeText={(val) => updateField("branch_name", val)}
                      {...fieldFocusProps("branch_name")}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* ─────────────────────────────────────────────────────────────
              Update Profile Button (Brand Color: #E64A78)
          ───────────────────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.updateButton, saving && styles.updateButtonDisabled]}
            onPress={handleUpdateProfile}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.btnContentRow}>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.updateButtonText}>Update Profile</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─────────────────────────────────────────────────────────────
          Modal for Photo / Document Selection
      ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={pickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalTitle}>
              {activePickerField === "profile_image"
                ? "Update Profile Photo"
                : activePickerField === "aadhar_image"
                  ? "Upload Aadhar Card"
                  : "Upload PAN Card"}
            </Text>
            <Text style={styles.modalSubtitle}>
              Select an option to proceed
            </Text>

            <View style={styles.modalOptions}>
              <TouchableOpacity
                style={styles.modalOptionItem}
                onPress={handlePickCamera}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.modalOptionIconBox,
                    { backgroundColor: "rgba(230,74,120,0.1)" },
                  ]}
                >
                  <Ionicons name="camera-outline" size={22} color="#E64A78" />
                </View>
                <View style={styles.modalOptionTextCol}>
                  <Text style={styles.modalOptionTitle}>Take Photo</Text>
                  <Text style={styles.modalOptionDesc}>
                    Use camera to capture directly
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C5B8BD" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOptionItem}
                onPress={handlePickGallery}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.modalOptionIconBox,
                    { backgroundColor: "rgba(200,151,56,0.12)" },
                  ]}
                >
                  <Ionicons name="images-outline" size={22} color="#C89738" />
                </View>
                <View style={styles.modalOptionTextCol}>
                  <Text style={styles.modalOptionTitle}>
                    Choose from Gallery
                  </Text>
                  <Text style={styles.modalOptionDesc}>
                    Pick from device gallery
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C5B8BD" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setPickerModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          Modal for Account Type Selection (Dropdown)
      ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={accountTypeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountTypeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAccountTypeModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalTitle}>Select Account Type</Text>
            <Text style={styles.modalSubtitle}>
              Choose your bank account type
            </Text>

            <View style={styles.modalOptions}>
              {[
                {
                  label: "Savings Account",
                  value: "Savings",
                  desc: "Standard personal savings account",
                },
                {
                  label: "Current Account",
                  value: "Current",
                  desc: "Commercial / business current account",
                },
              ].map((item) => {
                const isSelected =
                  (form.account_type || "").toLowerCase() ===
                    item.value.toLowerCase() ||
                  (form.account_type || "").toLowerCase() ===
                    item.label.toLowerCase();
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.accountTypeOption,
                      isSelected && styles.accountTypeOptionActive,
                    ]}
                    onPress={() => {
                      updateField("account_type", item.value);
                      setAccountTypeModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.accountTypeIconBox,
                        isSelected && styles.accountTypeIconBoxActive,
                      ]}
                    >
                      <Ionicons
                        name="wallet-outline"
                        size={22}
                        color={isSelected ? "#E64A78" : "#8C7A82"}
                      />
                    </View>
                    <View style={styles.accountTypeTextCol}>
                      <Text
                        style={[
                          styles.accountTypeOptionTitle,
                          isSelected && styles.accountTypeOptionTitleActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.accountTypeOptionDesc}>
                        {item.desc}
                      </Text>
                    </View>
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={isSelected ? "#E64A78" : "#C5B8BD"}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setAccountTypeModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
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
  screenTitle: {
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
  loadingText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: "#9E8E93",
  },

  // Header Card
  headerCard: {
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarBorderWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#C89738",
    padding: 2,
    backgroundColor: "#FFFFFF",
    marginRight: 14,
    position: "relative",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 34,
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 34,
    backgroundColor: "#2A1E24",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
  },
  avatarCameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E64A78",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerInfo: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  headerName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    color: "#2A1E24",
    marginBottom: 2,
  },
  headerEmail: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: "#9E8E93",
    marginBottom: 2,
  },
  headerPhone: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#2A1E24",
    marginBottom: 6,
  },
  refPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(200,151,56,0.12)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(200,151,56,0.3)",
  },
  refCodeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 11.5,
    color: "#C89738",
    letterSpacing: 0.5,
  },

  // Overall completion summary (inside header card)
  overallDivider: {
    height: 1,
    backgroundColor: "#F5EFF1",
    marginBottom: 14,
  },
  overallRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  overallLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12.5,
    color: "#8C7A82",
  },
  overallPercent: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13.5,
  },
  overallTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EDE6E9",
    overflow: "hidden",
    marginBottom: 12,
  },
  overallFill: {
    height: "100%",
    borderRadius: 4,
  },
  overallStepsRow: {
    flexDirection: "row",
    gap: 16,
  },
  overallStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  overallStepText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: "#6B5A63",
  },

  // Accordion Card
  accordionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0EAED",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  headerTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#2A1E24",
    marginBottom: 1,
  },
  sectionStatus: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  statusSuccess: {
    color: "#27A462",
  },
  statusPending: {
    color: "#C89738",
  },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeSuccess: {
    backgroundColor: "#27A462",
  },
  badgePending: {
    backgroundColor: "#C89738",
  },
  countBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  chevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#FAF7F8",
    alignItems: "center",
    justifyContent: "center",
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#FAF7F8",
    marginBottom: 14,
  },

  // Input Fields
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#2A1E24",
    marginBottom: 5,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF7F8",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F0EAED",
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapFocused: {
    borderColor: "#E64A78",
    backgroundColor: "#FFFFFF",
  },
  multilineInputWrap: {
    height: 84,
    alignItems: "flex-start",
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    color: "#2A1E24",
    paddingVertical: 0,
  },
  multilineInput: {
    paddingTop: 8,
    textAlignVertical: "top",
  },

  // Document Upload
  docUploadCard: {
    backgroundColor: "#FAF7F8",
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: "#F0EAED",
    borderStyle: "dashed",
    padding: 12,
  },
  docPlaceholderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  docUploadIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  docPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  docThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    marginRight: 12,
  },
  docInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  docStatusText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#27A462",
  },
  docActionLink: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#E64A78",
    marginTop: 2,
  },
  docPlaceholderTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#2A1E24",
  },
  docPlaceholderHint: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#9E8E93",
    marginTop: 1,
  },

  // Account Type Dropdown
  dropdownSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAF7F8",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#F0EAED",
    paddingHorizontal: 14,
    height: 50,
  },
  dropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dropdownValueText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13.5,
    color: "#2A1E24",
    marginLeft: 10,
  },
  dropdownPlaceholderText: {
    color: "#9E8E93",
  },
  accountTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF7F8",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#F0EAED",
  },
  accountTypeOptionActive: {
    backgroundColor: "rgba(230,74,120,0.06)",
    borderColor: "#E64A78",
  },
  accountTypeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F3EDF0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  accountTypeIconBoxActive: {
    backgroundColor: "rgba(230,74,120,0.12)",
  },
  accountTypeTextCol: {
    flex: 1,
  },
  accountTypeOptionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#2A1E24",
  },
  accountTypeOptionTitleActive: {
    color: "#E64A78",
  },
  accountTypeOptionDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#9E8E93",
    marginTop: 2,
  },

  // Update Button
  updateButton: {
    backgroundColor: "#E64A78",
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
    shadowColor: "#E64A78",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  btnContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  updateButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(42,30,36,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
  modalIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F0EAED",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    color: "#2A1E24",
    textAlign: "center",
  },
  modalSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: "#9E8E93",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 16,
  },
  modalOptions: {
    gap: 10,
    marginBottom: 16,
  },
  modalOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF7F8",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0EAED",
  },
  modalOptionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  modalOptionTextCol: {
    flex: 1,
  },
  modalOptionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#2A1E24",
  },
  modalOptionDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#9E8E93",
    marginTop: 1,
  },
  modalCancelBtn: {
    borderRadius: 12,
    backgroundColor: "#FAF7F8",
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#9E8E93",
  },
});
