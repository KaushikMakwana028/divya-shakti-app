import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import authService from '../services/authService';

const logo = require('../assets/logo.png');

const TERMS_URL = 'https://divyshakti.visiontechnolabs.com/terms_conditions';
const PRIVACY_URL = 'https://divyshakti.visiontechnolabs.com/privacy_policy';

const openLink = (url) => {
    Linking.openURL(url).catch(() =>
        Alert.alert('Error', 'Unable to open link. Please try again.')
    );
};

export default function RegisterScreen({ navigation }) {
    const [form, setForm] = useState({ name: '', phone: '', referral_code: '' });
    const [loading, setLoading] = useState(false);

    const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const isValid = form.name.trim().length > 0 && form.phone.length === 10;

    const handleRegister = async () => {
        if (!isValid || loading) return;

        setLoading(true);
        try {
            const result = await authService.register(
                form.name.trim(),
                form.phone,
                form.referral_code?.trim() || undefined
            );
            if (result.success) {
                navigation.navigate('OtpVerify', {
                    phone: form.phone,
                    name: form.name.trim(),
                    referral_code: form.referral_code?.trim() || '',
                    maskedMobile: result.data?.masked_mobile || form.phone,
                    isRegister: true,
                });
            } else {
                if (
                    result.message &&
                    result.message.toLowerCase().includes('already registered')
                ) {
                    Alert.alert('Already Registered', result.message, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Sign In',
                            onPress: () => navigation.navigate('Login'),
                        },
                    ]);
                } else {
                    Alert.alert('Registration Failed', result.message || 'Failed to send OTP');
                }
            }
        } catch (error) {
            console.error('Registration error:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            >
                <ScrollView
                    contentContainerStyle={[styles.container, { paddingBottom: 100 }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                >
                    {/* Brand Section */}
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
                        <Text style={styles.cardTitle}>Create Account 🙏</Text>
                        <Text style={styles.cardSubtitle}>
                            Join Divy Shakti and start your journey today
                        </Text>

                        {/* Full Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Full Name</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your full name"
                                    placeholderTextColor="#9E8E93"
                                    keyboardType="default"
                                    value={form.name}
                                    onChangeText={(v) => updateForm('name', v)}
                                />
                            </View>
                        </View>

                        {/* Phone Number */}
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
                                    value={form.phone}
                                    onChangeText={(v) => updateForm('phone', v)}
                                />
                            </View>
                        </View>

                        {/* Referral Code */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Referral Code (Optional)</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter referral code if any"
                                    placeholderTextColor="#9E8E93"
                                    keyboardType="default"
                                    value={form.referral_code}
                                    onChangeText={(v) => updateForm('referral_code', v)}
                                />
                            </View>
                        </View>

                        {/* Continue Button */}
                        <TouchableOpacity
                            style={[
                                styles.primaryBtn,
                                (!isValid || loading) && styles.primaryBtnDisabled,
                            ]}
                            onPress={handleRegister}
                            activeOpacity={0.8}
                            disabled={!isValid || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.primaryBtnText}>Continue with OTP</Text>
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

                        {/* Sign In Link */}
                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={() => navigation.navigate('Login')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.secondaryBtnText}>
                                Already have an account? Sign In
                            </Text>
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
        backgroundColor: '#FAF7F8',
    },
    container: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 32,
        justifyContent: 'center',
    },
    brandSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoWrapper: {
        width: 100,
        height: 100,
        borderRadius: 28,
        overflow: 'hidden',
        marginBottom: 20,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    brandName: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 32,
        color: '#2A1E24',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 20,
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
    },
    cardTitle: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 24,
        color: '#2A1E24',
        marginBottom: 8,
    },
    cardSubtitle: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 14,
        color: '#9E8E93',
        marginBottom: 28,
        lineHeight: 22,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 13,
        color: '#2A1E24',
        marginBottom: 10,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF7F8',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#F0EAED',
        overflow: 'hidden',
    },
    countryCode: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    countryCodeText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 15,
        color: '#2A1E24',
    },
    divider: {
        width: 1,
        height: 28,
        backgroundColor: '#F0EAED',
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontFamily: 'Poppins_400Regular',
        fontSize: 15,
        color: '#2A1E24',
    },
    primaryBtn: {
        backgroundColor: '#E64A78',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        shadowColor: '#E64A78',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 8,
    },
    primaryBtnDisabled: {
        backgroundColor: '#E0D4D8',
        shadowOpacity: 0,
        elevation: 0,
    },
    primaryBtnText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
        color: '#FFFFFF',
    },
    orRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
        gap: 12,
    },
    orLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#F0EAED',
    },
    orText: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 13,
        color: '#9E8E93',
    },
    secondaryBtn: {
        backgroundColor: '#FAF7F8',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#F0EAED',
    },
    secondaryBtnText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
        color: '#E64A78',
    },
    footerText: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 12,
        color: '#9E8E93',
        textAlign: 'center',
        marginTop: 28,
        lineHeight: 20,
    },
    footerLink: {
        color: '#E64A78',
        fontFamily: 'Poppins_500Medium',
    },
});