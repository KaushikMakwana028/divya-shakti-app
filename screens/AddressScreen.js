import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Alert from '../services/alertService';
import addressService from '../services/addressService';
import { useAuth } from '../contexts/AuthContext';

const INITIAL_FORM = {
  full_name: '',
  mobile: '',
  address_line1: '',
  address_line2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  is_default: false,
};

export default function AddressScreen({ navigation }) {
  const { user } = useAuth();

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // ─────────────────────────────────────────
  // Fetch Addresses
  // ─────────────────────────────────────────
  const fetchAddresses = useCallback(async () => {
    try {
      const res = await addressService.getAddresses();
      if (res.success) {
        setAddresses(res.addresses || []);
      }
    } catch (err) {
      console.error('Fetch addresses error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAddresses();
  };

  // ─────────────────────────────────────────
  // Open Add Modal
  // ─────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingAddress(null);
    setFormData({
      ...INITIAL_FORM,
      full_name: user?.name || '',
      mobile: user?.phone || user?.mobile || '',
      is_default: addresses.length === 0, // Auto-check if first address
    });
    setModalVisible(true);
  };

  // ─────────────────────────────────────────
  // Open Edit Modal
  // ─────────────────────────────────────────
  const handleOpenEdit = (addr) => {
    setEditingAddress(addr);
    setFormData({
      full_name: addr.full_name || '',
      mobile: addr.mobile || '',
      address_line1: addr.address_line1 || '',
      address_line2: addr.address_line2 || '',
      landmark: addr.landmark || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      country: addr.country || 'India',
      is_default: String(addr.is_default) === '1',
    });
    setModalVisible(true);
  };

  // ─────────────────────────────────────────
  // Set As Default
  // ─────────────────────────────────────────
  const handleSetDefault = async (addr) => {
    if (String(addr.is_default) === '1') return;
    setActionLoadingId(addr.id);
    try {
      const res = await addressService.setDefaultAddress(addr.id);
      if (res.success) {
        await fetchAddresses();
      } else {
        Alert.alert('Error', res.message || 'Failed to set default address.');
      }
    } catch (err) {
      console.error('Set default error:', err);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ─────────────────────────────────────────
  // Delete Address
  // ─────────────────────────────────────────
  const handleDelete = (addr) => {
    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete this address (${addr.city}, ${addr.pincode})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(addr.id);
            try {
              const res = await addressService.deleteAddress(addr.id);
              if (res.success) {
                await fetchAddresses();
              } else {
                Alert.alert('Error', res.message || 'Failed to delete address.');
              }
            } catch (err) {
              console.error('Delete address error:', err);
              Alert.alert('Error', 'An unexpected error occurred while deleting.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // ─────────────────────────────────────────
  // Save or Update Address
  // ─────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formData.full_name.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name.');
      return;
    }
    if (!formData.mobile.trim() || formData.mobile.trim().length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!formData.address_line1.trim()) {
      Alert.alert('Validation Error', 'Please enter Address Line 1.');
      return;
    }
    if (!formData.city.trim()) {
      Alert.alert('Validation Error', 'Please enter your city.');
      return;
    }
    if (!formData.state.trim()) {
      Alert.alert('Validation Error', 'Please enter your state.');
      return;
    }
    if (!formData.pincode.trim()) {
      Alert.alert('Validation Error', 'Please enter your 6-digit pincode.');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (editingAddress) {
        res = await addressService.updateAddress(editingAddress.id, formData);
      } else {
        res = await addressService.saveAddress(formData);
      }

      if (res.success) {
        setModalVisible(false);
        await fetchAddresses();
      } else {
        Alert.alert('Error', res.message || 'Failed to save address.');
      }
    } catch (err) {
      console.error('Submit address error:', err);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#2A1E24" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <TouchableOpacity
          style={styles.addHeaderBtn}
          onPress={handleOpenAdd}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#E64A78" />
          <Text style={styles.addHeaderBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#E64A78" />
          <Text style={styles.loaderText}>Loading addresses...</Text>
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="location-outline" size={64} color="#E64A78" />
          </View>
          <Text style={styles.emptyTitle}>No Addresses Found</Text>
          <Text style={styles.emptySubtitle}>
            Save your delivery addresses here for quick and smooth checkout.
          </Text>
          <TouchableOpacity
            style={styles.addFirstBtn}
            onPress={handleOpenAdd}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.addFirstBtnText}>Add New Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#E64A78']}
              tintColor="#E64A78"
            />
          }
        >
          {addresses.map((addr) => {
            const isDefault = String(addr.is_default) === '1';
            const isActionBusy = actionLoadingId === addr.id;

            return (
              <View
                key={addr.id}
                style={[
                  styles.addressCard,
                  isDefault && styles.addressCardDefault,
                ]}
              >
                {/* Header: Name & Badge */}
                <View style={styles.cardHeader}>
                  <View style={styles.nameRow}>
                    <View style={[styles.nameIconBox, isDefault && styles.nameIconBoxDefault]}>
                      <Ionicons
                        name="location"
                        size={18}
                        color={isDefault ? '#27A462' : '#E64A78'}
                      />
                    </View>
                    <Text style={styles.cardName}>{addr.full_name}</Text>
                  </View>

                  {isDefault && (
                    <View style={styles.defaultBadge}>
                      <Ionicons name="checkmark-circle" size={13} color="#27A462" />
                      <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                    </View>
                  )}
                </View>

                {/* Address Lines */}
                <View style={styles.addressBody}>
                  <Text style={styles.addressLine}>
                    {addr.address_line1}
                    {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                  </Text>
                  {addr.landmark ? (
                    <View style={styles.landmarkRow}>
                      <Ionicons name="navigate-outline" size={13} color="#8C7A82" />
                      <Text style={styles.landmarkText}>Landmark: {addr.landmark}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.addressCity}>
                    {addr.city}, {addr.state} - {addr.pincode}
                  </Text>
                  <Text style={styles.addressCountry}>{addr.country || 'India'}</Text>

                  {/* Phone */}
                  <View style={styles.phoneRow}>
                    <Ionicons name="call-outline" size={14} color="#8C7A82" />
                    <Text style={styles.phoneText}>{addr.mobile}</Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                {/* Actions Footer */}
                <View style={styles.cardFooter}>
                  {!isDefault ? (
                    <TouchableOpacity
                      style={styles.setDefaultBtn}
                      onPress={() => handleSetDefault(addr)}
                      disabled={isActionBusy}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="radio-button-off" size={16} color="#8C7A82" />
                      <Text style={styles.setDefaultText}>Set as Default</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.setDefaultBtn}>
                      <Ionicons name="checkmark-circle" size={16} color="#27A462" />
                      <Text style={[styles.setDefaultText, { color: '#27A462', fontWeight: '600' }]}>
                        Default Address
                      </Text>
                    </View>
                  )}

                  <View style={styles.actionsRight}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleOpenEdit(addr)}
                      disabled={isActionBusy}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={17} color="#4A7CE6" />
                      <Text style={[styles.actionBtnText, { color: '#4A7CE6' }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleDelete(addr)}
                      disabled={isActionBusy}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={17} color="#EF4444" />
                      <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Floating Add Button for quick access when addresses exist */}
      {addresses.length > 0 && (
        <View style={styles.bottomBarContainer}>
          <TouchableOpacity
            style={styles.bottomAddBtn}
            onPress={handleOpenAdd}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.bottomAddBtnText}>Add New Address</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ───────────────────────────────────────── */}
      {/* Add / Edit Address Modal */}
      {/* ───────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#2A1E24" />
              </TouchableOpacity>
            </View>

            {/* Modal Form Scroll */}
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Kaushik Makwana"
                  placeholderTextColor="#B0A4A8"
                  value={formData.full_name}
                  onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                />
              </View>

              {/* Mobile Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#B0A4A8"
                  keyboardType="phone-pad"
                  maxLength={15}
                  value={formData.mobile}
                  onChangeText={(text) => setFormData({ ...formData, mobile: text })}
                />
              </View>

              {/* Address Line 1 */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Flat, House no., Building, Street *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Flat 402, Shivam Heights"
                  placeholderTextColor="#B0A4A8"
                  value={formData.address_line1}
                  onChangeText={(text) => setFormData({ ...formData, address_line1: text })}
                />
              </View>

              {/* Address Line 2 */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Area, Sector, Village (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Near Ring Road"
                  placeholderTextColor="#B0A4A8"
                  value={formData.address_line2}
                  onChangeText={(text) => setFormData({ ...formData, address_line2: text })}
                />
              </View>

              {/* Landmark */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Landmark (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Near Shiv Temple"
                  placeholderTextColor="#B0A4A8"
                  value={formData.landmark}
                  onChangeText={(text) => setFormData({ ...formData, landmark: text })}
                />
              </View>

              {/* City & State (Two Columns) */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>City *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Ahmedabad"
                    placeholderTextColor="#B0A4A8"
                    value={formData.city}
                    onChangeText={(text) => setFormData({ ...formData, city: text })}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>State *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Gujarat"
                    placeholderTextColor="#B0A4A8"
                    value={formData.state}
                    onChangeText={(text) => setFormData({ ...formData, state: text })}
                  />
                </View>
              </View>

              {/* Pincode & Country */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Pincode *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 380015"
                    placeholderTextColor="#B0A4A8"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={formData.pincode}
                    onChangeText={(text) => setFormData({ ...formData, pincode: text })}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Country</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="India"
                    placeholderTextColor="#B0A4A8"
                    value={formData.country}
                    onChangeText={(text) => setFormData({ ...formData, country: text })}
                  />
                </View>
              </View>

              {/* Make Default Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.8}
                onPress={() => setFormData({ ...formData, is_default: !formData.is_default })}
              >
                <View
                  style={[
                    styles.checkbox,
                    formData.is_default && styles.checkboxActive,
                  ]}
                >
                  {formData.is_default && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Make this my default address</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {editingAddress ? 'Update Address' : 'Save Address'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF7F8',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAED',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A1E24',
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FAF7F8',
  },
  addHeaderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E64A78',
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8C7A82',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FDEFF3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A1E24',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8C7A82',
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E64A78',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  addFirstBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 14,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0EAED',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  addressCardDefault: {
    borderColor: '#27A462',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  nameIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDEFF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameIconBoxDefault: {
    backgroundColor: '#E8F5E9',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A1E24',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#27A462',
  },
  addressBody: {
    gap: 4,
    paddingLeft: 42,
  },
  addressLine: {
    fontSize: 13.5,
    lineHeight: 19,
    color: '#4B3F45',
  },
  landmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  landmarkText: {
    fontSize: 12.5,
    color: '#8C7A82',
    fontStyle: 'italic',
  },
  addressCity: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A1E24',
    marginTop: 2,
  },
  addressCountry: {
    fontSize: 12.5,
    color: '#8C7A82',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A1E24',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3EFF1',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setDefaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  setDefaultText: {
    fontSize: 12.5,
    color: '#8C7A82',
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0EAED',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E64A78',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  bottomAddBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAED',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2A1E24',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  modalBodyContent: {
    paddingVertical: 16,
    paddingBottom: 180,
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B3F45',
  },
  input: {
    height: 48,
    backgroundColor: '#FAF7F8',
    borderWidth: 1,
    borderColor: '#E8DFE2',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#2A1E24',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: '#E64A78',
    borderColor: '#E64A78',
  },
  checkboxLabel: {
    fontSize: 13.5,
    color: '#4B3F45',
    fontWeight: '500',
  },
  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E64A78',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 10,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
