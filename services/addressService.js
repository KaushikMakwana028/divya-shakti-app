import apiClient from './apiClient';

class AddressService {
    constructor() {
        this.api = apiClient;
    }

    // ─────────────────────────────────────────
    // Get All User Addresses
    // GET /api/get_addresses
    // ─────────────────────────────────────────
    async getAddresses() {
        try {
            const response = await this.api.get('/get_addresses');
            if (response.data && response.data.status) {
                const addresses = response.data.data?.addresses || [];
                return {
                    success: true,
                    addresses,
                    message: response.data.message || 'Addresses retrieved successfully',
                };
            }
            return {
                success: false,
                addresses: [],
                message: response.data?.message || 'Failed to fetch addresses',
            };
        } catch (error) {
            console.error('AddressService getAddresses error:', error.response?.data || error.message);
            return {
                success: false,
                addresses: [],
                message: error.response?.data?.message || error.message || 'Failed to fetch addresses',
            };
        }
    }

    // ─────────────────────────────────────────
    // Save New Address
    // POST /api/save_address
    // ─────────────────────────────────────────
    async saveAddress(addressData) {
        try {
            // Note: is_default must be passed as string '0' or '1' to pass backend validation
            const payload = {
                full_name: addressData.full_name?.trim(),
                mobile: addressData.mobile?.trim(),
                address_line1: addressData.address_line1?.trim(),
                address_line2: addressData.address_line2?.trim() || null,
                landmark: addressData.landmark?.trim() || null,
                city: addressData.city?.trim(),
                state: addressData.state?.trim(),
                pincode: addressData.pincode?.trim(),
                country: addressData.country?.trim() || 'India',
                is_default: addressData.is_default ? '1' : '0',
            };

            const response = await this.api.post('/save_address', payload);
            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Address saved successfully',
                };
            }
            return {
                success: false,
                data: null,
                message: response.data?.message || 'Failed to save address',
            };
        } catch (error) {
            console.error('AddressService saveAddress error:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to save address',
            };
        }
    }

    // ─────────────────────────────────────────
    // Update Address
    // POST /api/update_address/:id
    // ─────────────────────────────────────────
    async updateAddress(id, addressData) {
        try {
            const payload = {};
            if (addressData.full_name !== undefined) payload.full_name = addressData.full_name.trim();
            if (addressData.mobile !== undefined) payload.mobile = addressData.mobile.trim();
            if (addressData.address_line1 !== undefined) payload.address_line1 = addressData.address_line1.trim();
            if (addressData.address_line2 !== undefined) payload.address_line2 = addressData.address_line2?.trim() || '';
            if (addressData.landmark !== undefined) payload.landmark = addressData.landmark?.trim() || '';
            if (addressData.city !== undefined) payload.city = addressData.city.trim();
            if (addressData.state !== undefined) payload.state = addressData.state.trim();
            if (addressData.pincode !== undefined) payload.pincode = addressData.pincode.trim();
            if (addressData.country !== undefined) payload.country = addressData.country.trim() || 'India';
            if (addressData.is_default !== undefined) {
                payload.is_default = addressData.is_default ? '1' : '0';
            }

            const response = await this.api.post(`/update_address/${id}`, payload);
            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Address updated successfully',
                };
            }
            return {
                success: false,
                data: null,
                message: response.data?.message || 'Failed to update address',
            };
        } catch (error) {
            console.error('AddressService updateAddress error:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to update address',
            };
        }
    }

    // ─────────────────────────────────────────
    // Set Address As Default
    // ─────────────────────────────────────────
    async setDefaultAddress(id) {
        return this.updateAddress(id, { is_default: '1' });
    }

    // ─────────────────────────────────────────
    // Delete Address
    // POST /api/delete_address/:id
    // ─────────────────────────────────────────
    async deleteAddress(id) {
        try {
            const response = await this.api.post(`/delete_address/${id}`, {});
            if (response.data && response.data.status) {
                return {
                    success: true,
                    message: response.data.message || 'Address deleted successfully',
                };
            }
            return {
                success: false,
                message: response.data?.message || 'Failed to delete address',
            };
        } catch (error) {
            console.error('AddressService deleteAddress error:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to delete address',
            };
        }
    }
}

export default new AddressService();
