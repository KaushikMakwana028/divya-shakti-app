import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { useCart } from '../contexts/CartContext';

export default function CartScreen({ navigation }) {
    const { cartItems, updateQuantity, removeFromCart, clearCart, getCartTotal, getCartCount } = useCart();

    const handleCheckout = () => {
        if (cartItems.length === 0) {
            Alert.alert('Cart Empty', 'Please add items to your cart first.');
            return;
        }
        Alert.alert(
            'Checkout',
            `Proceed to checkout with ${getCartCount()} items?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Proceed',
                    onPress: () => {
                        Alert.alert('Success', 'Order placed successfully!');
                        clearCart();
                        navigation.navigate('Home');
                    },
                },
            ]
        );
    };

    const handleRemoveItem = (item) => {
        Alert.alert(
            'Remove Item',
            `Remove ${item.name} from cart?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => removeFromCart(item.id) },
            ]
        );
    };

    if (cartItems.length === 0) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <Header title="Shopping Cart" showBack={true} />
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBox}>
                        <Ionicons name="bag-outline" size={80} color="#E0D4D8" />
                    </View>
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptyText}>Add some products to get started!</Text>
                    <TouchableOpacity
                        style={styles.shopNowBtn}
                        onPress={() => navigation.navigate('Shop')}
                    >
                        <Ionicons name="storefront-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.shopNowText}>Start Shopping</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <Header title="Shopping Cart" showBack={true} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.container}
            >
                {/* Cart Items */}
                {cartItems.map((item, index) => (
                    <View key={`${item.id}-${index}`} style={styles.cartItem}>
                        <View style={[styles.itemImage, { backgroundColor: item.color + '15' }]}>
                            <Ionicons name={item.icon} size={36} color={item.color} />
                        </View>

                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <Text style={styles.itemCategory}>{item.category}</Text>
                            <Text style={styles.itemPrice}>{item.price}</Text>
                        </View>

                        <View style={styles.itemActions}>
                            <TouchableOpacity
                                style={styles.removeBtn}
                                onPress={() => handleRemoveItem(item)}
                            >
                                <Ionicons name="trash-outline" size={16} color="#E64A78" />
                            </TouchableOpacity>

                            <View style={styles.quantityControl}>
                                <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => updateQuantity(item.id, item.quantity - 1)}
                                >
                                    <Ionicons name="remove" size={14} color="#2A1E24" />
                                </TouchableOpacity>
                                <Text style={styles.qtyText}>{item.quantity}</Text>
                                <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                                >
                                    <Ionicons name="add" size={14} color="#2A1E24" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ))}

                {/* Coupon Section */}
                <View style={styles.couponCard}>
                    <View style={styles.couponIcon}>
                        <Ionicons name="pricetag" size={18} color="#C89738" />
                    </View>
                    <Text style={styles.couponText}>Apply Coupon Code</Text>
                    <TouchableOpacity style={styles.applyBtn}>
                        <Text style={styles.applyBtnText}>Apply</Text>
                    </TouchableOpacity>
                </View>

                {/* Price Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Price Summary</Text>

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal ({getCartCount()} items)</Text>
                        <Text style={styles.summaryValue}>₹{getCartTotal().toLocaleString()}</Text>
                    </View>

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Discount</Text>
                        <Text style={[styles.summaryValue, { color: '#27A462' }]}>
                            - ₹{Math.round(getCartTotal() * 0.1).toLocaleString()}
                        </Text>
                    </View>

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Delivery Charges</Text>
                        <Text style={[styles.summaryValue, { color: '#27A462' }]}>FREE</Text>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryRow}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalValue}>
                            ₹{Math.round(getCartTotal() * 0.9).toLocaleString()}
                        </Text>
                    </View>

                    <View style={styles.savingsBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#27A462" />
                        <Text style={styles.savingsText}>
                            You will save ₹{Math.round(getCartTotal() * 0.1).toLocaleString()} on this order
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Checkout Bar */}
            <View style={styles.checkoutBar}>
                <View style={styles.checkoutLeft}>
                    <Text style={styles.checkoutLabel}>Total</Text>
                    <Text style={styles.checkoutPrice}>
                        ₹{Math.round(getCartTotal() * 0.9).toLocaleString()}
                    </Text>
                </View>
                <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
                    <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#FAF7F8',
    },
    container: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 120,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    emptyIconBox: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#FAF7F8',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#F0EAED',
        borderStyle: 'dashed',
    },
    emptyTitle: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 22,
        color: '#2A1E24',
        marginBottom: 8,
    },
    emptyText: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 14,
        color: '#9E8E93',
        textAlign: 'center',
        marginBottom: 32,
    },
    shopNowBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#E64A78',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        shadowColor: '#E64A78',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    shopNowText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 14,
        color: '#FFFFFF',
    },
    cartItem: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    itemImage: {
        width: 70,
        height: 70,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 14,
        color: '#2A1E24',
        marginBottom: 4,
    },
    itemCategory: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 11,
        color: '#9E8E93',
        marginBottom: 6,
    },
    itemPrice: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 15,
        color: '#E64A78',
    },
    itemActions: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    removeBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#FFF0F4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FAF7F8',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    qtyBtn: {
        width: 24,
        height: 24,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        color: '#2A1E24',
        minWidth: 20,
        textAlign: 'center',
    },
    couponCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FBF5E6',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(200,151,56,0.2)',
        borderStyle: 'dashed',
    },
    couponIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(200,151,56,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    couponText: {
        flex: 1,
        fontFamily: 'Poppins_500Medium',
        fontSize: 13,
        color: '#2A1E24',
    },
    applyBtn: {
        backgroundColor: '#C89738',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    applyBtnText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12,
        color: '#FFFFFF',
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 3,
    },
    summaryTitle: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
        color: '#2A1E24',
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryLabel: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 13,
        color: '#9E8E93',
    },
    summaryValue: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        color: '#2A1E24',
    },
    summaryDivider: {
        height: 1,
        backgroundColor: '#F0EAED',
        marginVertical: 12,
    },
    totalLabel: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 15,
        color: '#2A1E24',
    },
    totalValue: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 18,
        color: '#E64A78',
    },
    savingsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E8FBF5',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 12,
    },
    savingsText: {
        flex: 1,
        fontFamily: 'Poppins_500Medium',
        fontSize: 12,
        color: '#27A462',
    },
    checkoutBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F0EAED',
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 10,
    },
    checkoutLeft: {},
    checkoutLabel: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 12,
        color: '#9E8E93',
        marginBottom: 2,
    },
    checkoutPrice: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 20,
        color: '#2A1E24',
    },
    checkoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#E64A78',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 16,
        shadowColor: '#E64A78',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    checkoutBtnText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        color: '#FFFFFF',
    },
});