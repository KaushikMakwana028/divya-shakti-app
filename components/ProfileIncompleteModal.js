import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ProfileIncompleteModal({
  visible,
  onClose,
  onComplete,
  percentage = 0,
  missingFields = [],
}) {
  const cleanPercentage = Math.max(0, Math.min(100, Number(percentage) || 0));

  const formatFieldName = (field) => {
    if (!field) return '';
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={36} color="#E64A78" />
          </View>

          {/* Title */}
          <Text style={styles.title}>100% Profile Required</Text>
          <Text style={styles.subtitle}>
            To add items to your cart and place orders, please complete 100% of your profile including KYC and Bank details.
          </Text>

          {/* Progress Bar Container */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Current Completion</Text>
              <Text style={styles.progressPercent}>{cleanPercentage}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(8, cleanPercentage)}%` },
                ]}
              />
            </View>
          </View>

          {/* Missing Fields List if any */}
          {missingFields && missingFields.length > 0 && (
            <View style={styles.missingSection}>
              <Text style={styles.missingHeader}>Pending Information:</Text>
              <View style={styles.pillsContainer}>
                {missingFields.slice(0, 4).map((field, idx) => (
                  <View key={idx} style={styles.pill}>
                    <Ionicons name="alert-circle" size={13} color="#F59E0B" />
                    <Text style={styles.pillText}>{formatFieldName(field)}</Text>
                  </View>
                ))}
                {missingFields.length > 4 && (
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>+{missingFields.length - 4} more</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={onComplete}
            >
              <Text style={styles.primaryBtnText}>Complete Profile Now</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <Text style={styles.secondaryBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 10, 15, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FDEFF3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#2A1E24',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#7A6B72',
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  progressCard: {
    width: '100%',
    backgroundColor: '#FAF7F8',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12.5,
    color: '#8C7A82',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E64A78',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8DFE2',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E64A78',
    borderRadius: 4,
  },
  missingSection: {
    width: '100%',
    marginBottom: 18,
  },
  missingHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8C7A82',
    marginBottom: 8,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#B45309',
  },
  buttonGroup: {
    width: '100%',
    gap: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E64A78',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontSize: 13.5,
    color: '#8C7A82',
    fontWeight: '600',
  },
});
