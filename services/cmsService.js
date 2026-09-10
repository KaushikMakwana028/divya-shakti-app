import apiClient from './apiClient';
import storageService from './storageService';

class CmsService {
    constructor() {
        this.api = apiClient;
    }

    // ─────────────────────────────────────────
    // Get Privacy Policy
    // GET /api/privacy_policy
    // ─────────────────────────────────────────
    async getPrivacyPolicy() {
        try {
            const response = await this.api.get('/privacy_policy');
            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Privacy Policy retrieved successfully',
                };
            }
            return {
                success: false,
                data: null,
                message: response.data?.message || 'Failed to fetch Privacy Policy',
            };
        } catch (error) {
            console.error('CmsService getPrivacyPolicy error:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to fetch Privacy Policy',
            };
        }
    }

    // ─────────────────────────────────────────
    // Get Terms & Conditions
    // GET /api/terms_conditions
    // ─────────────────────────────────────────
    async getTermsConditions() {
        try {
            const response = await this.api.get('/terms_conditions');
            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Terms & Conditions retrieved successfully',
                };
            }
            return {
                success: false,
                data: null,
                message: response.data?.message || 'Failed to fetch Terms & Conditions',
            };
        } catch (error) {
            console.error('CmsService getTermsConditions error:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to fetch Terms & Conditions',
            };
        }
    }

    // ─────────────────────────────────────────
    // Get Delete Account Info (Steps & Policies)
    // GET /api/delete_account
    // ─────────────────────────────────────────
    async getDeleteAccountInfo() {
        try {
            const response = await this.api.get('/delete_account');
            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Delete account info retrieved successfully',
                };
            }
            return {
                success: false,
                data: null,
                message: response.data?.message || 'Failed to fetch delete account info',
            };
        } catch (error) {
            console.error('CmsService getDeleteAccountInfo error:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to fetch delete account info',
            };
        }
    }

    // ─────────────────────────────────────────
    // Delete Account (Permanent)
    // POST /api/delete_account
    // ─────────────────────────────────────────
    async deleteAccount() {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    message: 'User is not logged in',
                };
            }

            const response = await this.api.post('/delete_account', {});
            if (response.data && response.data.status) {
                await storageService.clearAll();
                return {
                    success: true,
                    message: response.data.message || 'Your account has been deleted successfully.',
                    data: response.data.data,
                };
            }
            return {
                success: false,
                message: response.data?.message || 'Failed to delete account',
            };
        } catch (error) {
            console.error('CmsService deleteAccount error:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to delete account',
            };
        }
    }
}

export default new CmsService();
