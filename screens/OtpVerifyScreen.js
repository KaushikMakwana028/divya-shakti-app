import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const LOGO_URL = 'https://images.unsplash.com/photo-1620288627223-53302f4e8c74?w=400&h=400&fit=crop';

const OTP_LENGTH = 6;

export default function OtpVerifyScreen({ navigation, route }) {
    const { phone } = route.params || {};
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [timer, setTimer] = useState(30);
    const inputs = useRef([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleChange = (text, index) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        if (text && index < OTP_LENGTH - 1) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleVerify = () => {
        const code = otp.join('');
        if (code.length === OTP_LENGTH) {
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        }
    };

    const handleResend = () => {
        setOtp(Array(OTP_LENGTH).fill(''));
        setTimer(30);
        inputs.current[0]?.focus();
    };

    const isComplete = otp.every((d) => d !== '');

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.container}>
                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={20} color="#2A1E24" />
                    </TouchableOpacity>

                    {/* Logo with Shield */}
                    <View style={styles.logoSection}>
                        <View style={styles.logoWrapper}>
                            <Image
                                source={{ uri: LOGO_URL }}
                                style={styles.logoImage}
                                resizeMode="cover"
                            />
                            <View style={styles.shieldBadge}>
                                <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                            </View>
                        </View>
                    </View>

                    {/* Text */}
                    <Text style={styles.title}>Verify OTP</Text>
                    <Text style={styles.subtitle}>
                        We've sent a 6-digit code to{'\n'}
                        <Text style={styles.phone}>+91 {phone}</Text>
                    </Text>

                    {/* OTP Boxes */}
                    <View style={styles.otpRow}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => (inputs.current[index] = ref)}
                                style={[styles.otpBox, digit && styles.otpBoxFilled]}
                                value={digit}
                                onChangeText={(text) => handleChange(text.slice(-1), index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                keyboardType="number-pad"
                                maxLength={1}
                                autoFocus={index === 0}
                                selectTextOnFocus
                            />
                        ))}
                    </View>

                    {/* Timer / Resend */}
                    <View style={styles.resendRow}>
                        {timer > 0 ? (
                            <Text style={styles.timerText}>
                                Resend OTP in{' '}
                                <Text style={styles.timerCount}>00:{String(timer).padStart(2, '0')}</Text>
                            </Text>
                        ) : (
                            <TouchableOpacity onPress={handleResend}>
                                <Text style={styles.resendText}>Resend OTP</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity
                        style={[styles.primaryBtn, !isComplete && styles.primaryBtnDisabled]}
                        onPress={handleVerify}
                        activeOpacity={0.8}
                        disabled={!isComplete}
                    >
                        <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    </TouchableOpacity>

                    {/* Change number */}
                    <TouchableOpacity
                        style={styles.changeBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.changeBtnText}>Change Phone Number</Text>
                    </TouchableOpacity>
                </View>
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
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 32,
        alignItems: 'center',
    },
    backBtn: {
        alignSelf: 'flex-start',
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F0EAED',
        marginBottom: 32,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoWrapper: {
        width: 110,
        height: 110,
        borderRadius: 30,
        overflow: 'hidden',
        position: 'relative',
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
    shieldBadge: {
        position: 'absolute',
        bottom: -8,
        right: -8,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E64A78',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FAF7F8',
        shadowColor: '#E64A78',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    title: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 28,
        color: '#2A1E24',
        marginBottom: 12,
    },
    subtitle: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 14,
        color: '#9E8E93',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    phone: {
        fontFamily: 'Poppins_600SemiBold',
        color: '#2A1E24',
    },
    otpRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 32,
    },
    otpBox: {
        width: 48,
        height: 58,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#F0EAED',
        textAlign: 'center',
        fontFamily: 'Poppins_700Bold',
        fontSize: 22,
        color: '#2A1E24',
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    otpBoxFilled: {
        borderColor: '#E64A78',
        backgroundColor: '#FFF0F4',
    },
    resendRow: {
        marginBottom: 32,
    },
    timerText: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 14,
        color: '#9E8E93',
    },
    timerCount: {
        fontFamily: 'Poppins_600SemiBold',
        color: '#E64A78',
    },
    resendText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 14,
        color: '#E64A78',
        textDecorationLine: 'underline',
    },
    primaryBtn: {
        backgroundColor: '#E64A78',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 32,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        width: '100%',
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
    changeBtn: {
        marginTop: 20,
        paddingVertical: 12,
    },
    changeBtnText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 14,
        color: '#9E8E93',
        textDecorationLine: 'underline',
    },
});