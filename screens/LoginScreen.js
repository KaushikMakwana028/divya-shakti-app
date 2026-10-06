import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Alert from '../services/alertService';
import authService from '../services/authService';

const logo = require("../assets/logo.png");

const TERMS_URL = 'https://divyshakti.visiontechnolabs.com/terms_conditions';
const PRIVACY_URL = 'https://divyshakti.visiontechnolabs.com/privacy_policy';

const openLink = (url) => {
  Linking.openURL(url).catch(() =>
    Alert.alert('Error', 'Unable to open link. Please try again.')
  );
};

export default function LoginScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleLogin = async () => {
    if (phoneNumber.length === 10 && !loading) {
      setLoading(true);

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      try {
        const result = await authService.sendOTP(phoneNumber);

        if (result.success) {
          navigation.navigate("OtpVerify", {
            phone: phoneNumber,
            maskedMobile: result.data?.masked_mobile || phoneNumber,
            isRegister: false,
          });
        } else {
          if (
            result.message &&
            result.message.toLowerCase().includes("not registered")
          ) {
            Alert.alert("Account Not Found", result.message, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Register Now",
                onPress: () => navigation.navigate("Register"),
              },
            ]);
          } else {
            Alert.alert("Error", result.message || "Failed to send OTP");
          }
        }
      } catch (error) {
        console.error("Login send OTP error:", error);
        Alert.alert("Error", "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {/* Logo / Brand */}
          <View style={styles.brandSection}>
            <View style={styles.logoWrapper}>
              <Image
                source={logo}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.brandName}>Divy Shakti</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back 👋</Text>
            <Text style={styles.cardSubtitle}>
              Enter your phone number to continue
            </Text>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <View style={styles.divider} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter mobile number"
                  placeholderTextColor="#9E8E93"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>
            </View>

            {/* Send OTP Button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (phoneNumber.length < 10 || loading) && styles.primaryBtnDisabled,
              ]}
              onPress={handleLogin}
              disabled={phoneNumber.length !== 10 || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Send OTP</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            {/* Register Link */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate("Register")}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>Create New Account</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footerText}>
            By continuing, you agree to our{' '}
            <Text
              style={styles.footerLink}
              onPress={() => openLink(TERMS_URL)}
            >
              Terms
            </Text>
            {' '}&{' '}
            <Text
              style={styles.footerLink}
              onPress={() => openLink(PRIVACY_URL)}
            >
              Privacy Policy
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAF7F8",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    justifyContent: "center",
  },
  brandSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  brandName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 32,
    color: "#2A1E24",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    shadowColor: "#2A1E24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: "#2A1E24",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#9E8E93",
    marginBottom: 28,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#2A1E24",
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF7F8",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#F0EAED",
    overflow: "hidden",
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  countryCodeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#2A1E24",
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: "#F0EAED",
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    color: "#2A1E24",
  },
  primaryBtn: {
    backgroundColor: "#E64A78",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    shadowColor: "#E64A78",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: "#E0D4D8",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#F0EAED",
  },
  orText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#9E8E93",
  },
  secondaryBtn: {
    backgroundColor: "#FAF7F8",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F0EAED",
  },
  secondaryBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#E64A78",
  },
  footerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#9E8E93",
    textAlign: "center",
    marginTop: 28,
    lineHeight: 20,
  },
  footerLink: {
    color: "#E64A78",
    fontFamily: "Poppins_500Medium",
  },
});