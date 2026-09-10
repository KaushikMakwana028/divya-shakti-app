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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import authService from '../services/authService';

const LOGO_URL = 'https://images.unsplash.com/photo-1620288627223-53302f4e8c74?w=400&h=400&fit=crop';

export default function RegisterScreen({ navigation }) {
    const [form, setForm] = useState({ name: '', phone: '', referral_code: '' });
    const [focused, setFocused] = useState('');
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

    const renderInput = (key, label, placeholder, keyboardType = 'default', icon) => (
        <View style={styles.inputGroup} key={key}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={[styles.inputWrapper, focused === key && styles.inputFocused]}>
                <View style={styles.iconBox}>
                    <Ionicons
                        name={icon}
                        size={18}
                        color={focused === key ? '#E64A78' : '#9E8E93'}
                    />
                </View>
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#9E8E93"
                    keyboardType={keyboardType}
                    value={form[key]}
                    onChangeText={(v) => updateForm(key, v)}
                    onFocus={() => setFocused(key)}
                    onBlur={() => setFocused('')}
                    maxLength={key === 'phone' ? 10 : undefined}
                />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            >
                <ScrollView
                    contentContainerStyle={[styles.container, { paddingBottom: 140 }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={20} color="#2A1E24" />
                    </TouchableOpacity>

                    {/* Logo */}
                    <View style={styles.logoSection}>
                        <View style={styles.logoWrapper}>
                            <Image
                                source={{ uri: LOGO_URL }}
                                style={styles.logoImage}
                                resizeMode="cover"
                            />
                        </View>
                    </View>

                    {/* Header */}
                    <View style={styles.headerSection}>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>
                            Join Divy Shakti and start your journey today
                        </Text>
                    </View>

                    {/* Card */}
                    <View style={styles.card}>
                        {renderInput('name', 'Full Name', 'Enter your full name', 'default', 'person-outline')}
                        {renderInput('phone', 'Phone Number', 'Enter 10-digit mobile number', 'phone-pad', 'call-outline')}
                        {renderInput('referral_code', 'Referral Code (Optional)', 'Enter referral code if any', 'default', 'gift-outline')}

                        <TouchableOpacity
                            style={[styles.primaryBtn, (!isValid || loading) && styles.primaryBtnDisabled]}
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
                    </View>

                    {/* Login Link */}
                    <View style={styles.loginRow}>
                        <Text style={styles.loginText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
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
        paddingTop: 20,
        paddingBottom: 32,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F0EAED',
        marginBottom: 20,
        alignSelf: 'flex-start',
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logoWrapper: {
        width: 80,
        height: 80,
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    headerSection: {
        marginBottom: 28,
    },
    title: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 30,
        color: '#2A1E24',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 14,
        color: '#9E8E93',
        lineHeight: 22,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 24,
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
        gap: 4,
    },
    inputGroup: {
        marginBottom: 16,
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
        paddingHorizontal: 14,
    },
    inputFocused: {
        borderColor: '#E64A78',
        backgroundColor: '#FFFFFF',
    },
    iconBox: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
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
    loginRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 28,
    },
    loginText: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 14,
        color: '#9E8E93',
    },
    loginLink: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 14,
        color: '#E64A78',
    },
});