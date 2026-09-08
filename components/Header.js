import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function Header({ title, showBack = false, rightIcon, onRightPress, cartCount = 0 }) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    return (
        <View style={[styles.container, { paddingTop: 6 }]}>
            <View style={styles.left}>
                {showBack && (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={20} color="#2A1E24" />
                    </TouchableOpacity>
                )}
            </View>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.right}>
                {rightIcon && (
                    <TouchableOpacity onPress={onRightPress} style={styles.iconBtn}>
                        <Ionicons name={rightIcon} size={20} color="#2A1E24" />
                        {cartCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {cartCount > 99 ? '99+' : cartCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF7F8',
        paddingBottom: 14,
        paddingHorizontal: 20,
    },
    left: { alignItems: 'flex-start' },
    right: { alignItems: 'flex-end' },
    title: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 22,
        color: '#2A1E24',
        flex: 1,
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F0EAED',
        position: 'relative',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F0EAED',
        position: 'relative',
        marginRight: '15'
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#E64A78',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
        borderWidth: 2,
        borderColor: '#FAF7F8',
    },
    badgeText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 9,
        color: '#FFFFFF',
    },
});