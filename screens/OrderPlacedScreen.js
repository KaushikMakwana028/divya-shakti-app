import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function OrderPlacedScreen({ route, navigation }) {
  const {
    orderIds = [],
    orderNumber = null,
    orderNumbers = [],
    totalAmountPaid = 0,
    newWalletBalance = 0,
    orders = [],
  } = route?.params || {};

  const primaryOrderNum =
    orderNumber ||
    (Array.isArray(orderNumbers) && orderNumbers.length > 0 ? orderNumbers.join(', ') : null) ||
    (Array.isArray(orders) && orders[0]?.order_number ? orders.map(o => o.order_number).filter(Boolean).join(', ') : null);

  const orderIdText = primaryOrderNum
    ? primaryOrderNum
    : 'Order Confirmed';

  const handleViewOrderDetails = () => {
    if (orderIds.length === 1) {
      navigation.replace('OrderDetails', { orderId: orderIds[0] });
    } else {
      navigation.replace('Orders');
    }
  };

  const handleReturnHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Success Icon */}
        <View style={styles.successIconCircle}>
          <Ionicons name="checkmark" size={48} color="#FFFFFF" />
        </View>

        <Text style={styles.title}>Order Placed Successfully!</Text>
        <Text style={styles.subtitle}>
          Thank you for your purchase. Your order has been placed and payment confirmed.
        </Text>

        {/* Order Details Receipt Card */}
        <View style={styles.receiptCard}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Order ID(s)</Text>
            <Text style={styles.receiptValueBold}>{orderIdText}</Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Amount Paid</Text>
            <Text style={styles.receiptPaidValue}>
              ₹{Number(totalAmountPaid).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Payment Method</Text>
            <View style={styles.paymentMethodPill}>
              <Ionicons name="wallet" size={14} color="#E64A78" />
              <Text style={styles.paymentMethodText}>Divy Shakti Wallet</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>New Wallet Balance</Text>
            <Text style={styles.receiptBalanceValue}>
              ₹{Number(newWalletBalance).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionCol}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleViewOrderDetails}
            activeOpacity={0.85}
          >
            <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>
              {orderIds.length > 1 ? 'View All Orders' : 'View Order Details'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleReturnHome}
            activeOpacity={0.8}
          >
            <Ionicons name="home-outline" size={18} color="#E64A78" />
            <Text style={styles.secondaryBtnText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2A1E24',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#7A6E74',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 320,
  },
  receiptCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0E6E9',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  receiptLabel: {
    fontSize: 13,
    color: '#7A6E74',
  },
  receiptValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A1E24',
  },
  receiptPaidValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16A34A',
  },
  paymentMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E64A78',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0E6E9',
    marginVertical: 12,
  },
  receiptBalanceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A1E24',
  },
  actionCol: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#E64A78',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E64A78',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    width: '100%',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E64A78',
  },
});
