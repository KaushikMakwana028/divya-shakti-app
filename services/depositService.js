import apiClient from './apiClient';
import storageService from './storageService';

class DepositService {
    constructor() {
        this.api = apiClient;
    }

    /**
     * Get Admin Payment Settings:
     * QR Code URL, UPI ID, Bank Information, Minimum Deposit, User Balance
     * GET /api/get_payment_settings
     */
    async getPaymentSettings() {
        try {
            const response = await this.api.get('/get_payment_settings');
            if (response.data && response.data.status) {
                const data = response.data.data || {};
                return {
                    success: true,
                    data: data,
                    qrCodeUrl: data.qr_code_url || data.qr_code || null,
                    upiId: data.upi_id || '',
                    upiName: data.upi_name || '',
                    hasUpi: Boolean(data.has_upi || data.upi_id),
                    bankName: data.bank_name || '',
                    accountHolderName: data.account_holder_name || '',
                    accountNumber: data.account_number || '',
                    ifscCode: data.ifsc_code || '',
                    accountType: data.account_type || 'Current',
                    branchName: data.branch_name || '',
                    hasBank: Boolean(data.has_bank || (data.account_number && data.ifsc_code)),
                    instructions: data.instructions || '',
                    minDepositAmount: Number(data.min_deposit_amount) || 10,
                    formattedMinDeposit: data.formatted_min_deposit || `₹${(Number(data.min_deposit_amount) || 10).toFixed(2)}`,
                    walletBalance: Number(data.wallet_balance) || 0,
                    message: response.data.message || 'Payment settings loaded successfully',
                };
            }

            return {
                success: false,
                data: {},
                qrCodeUrl: null,
                upiId: '',
                upiName: '',
                hasUpi: false,
                bankName: '',
                accountHolderName: '',
                accountNumber: '',
                ifscCode: '',
                accountType: 'Current',
                branchName: '',
                hasBank: false,
                instructions: '',
                minDepositAmount: 10,
                formattedMinDeposit: '₹10.00',
                walletBalance: 0,
                message: response.data?.message || 'Failed to fetch payment settings',
            };
        } catch (error) {
            console.error('DepositService getPaymentSettings error:', error.response?.data || error.message);
            return {
                success: false,
                data: {},
                qrCodeUrl: null,
                upiId: '',
                upiName: '',
                hasUpi: false,
                bankName: '',
                accountHolderName: '',
                accountNumber: '',
                ifscCode: '',
                accountType: 'Current',
                branchName: '',
                hasBank: false,
                instructions: '',
                minDepositAmount: 10,
                formattedMinDeposit: '₹10.00',
                walletBalance: 0,
                message: error.response?.data?.message || error.message || 'Failed to fetch payment settings',
            };
        }
    }

    /**
     * Submit a new deposit request (Online with Screenshot proof)
     * POST /api/request_wallet_deposit
     *
     * @param {Object} payload
     * @param {number|string} payload.amount
     * @param {string} payload.payment_method - 'online' | 'cash'
     * @param {string} payload.remark - UTR or Note
     * @param {Object} payload.proof_file - { uri, name, type }
     */
    async requestDeposit({ amount, payment_method = 'online', remark = '', proof_file = null }) {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    data: null,
                    message: 'Please log in to submit a deposit request.',
                };
            }

            const formData = new FormData();
            formData.append('amount', String(amount));
            formData.append('payment_method', payment_method);
            if (remark) {
                formData.append('remark', String(remark).trim());
            }

            if (proof_file && proof_file.uri) {
                const filename = proof_file.fileName || proof_file.name || `deposit_${Date.now()}.jpg`;
                const type = proof_file.mimeType || proof_file.type || 'image/jpeg';
                formData.append('proof_file', {
                    uri: proof_file.uri,
                    name: filename,
                    type: type,
                });
            }

            const response = await this.api.post('/request_wallet_deposit', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                transformRequest: (data) => data,
            });

            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Deposit request submitted successfully! Pending approval.',
                };
            }

            return {
                success: false,
                data: null,
                message: response.data?.message || 'Failed to submit deposit request',
            };
        } catch (error) {
            console.error('DepositService requestDeposit error:', error.response?.data || error.message);
            const errMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to submit deposit request';
            return {
                success: false,
                data: null,
                message: errMsg,
            };
        }
    }

    /**
     * Fetch user's deposit requests history
     * GET /api/get_deposit_requests
     */
    async getDepositHistory(page = 1, limit = 20) {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    requests: [],
                    total: 0,
                    message: 'User is not logged in',
                };
            }

            const response = await this.api.get('/get_deposit_requests', {
                params: { page, limit },
            });

            if (response.data && response.data.status) {
                const data = response.data.data;
                return {
                    success: true,
                    requests: data?.requests || [],
                    total: data?.total || 0,
                    page: data?.page || page,
                    limit: data?.limit || limit,
                    message: response.data.message || 'Deposit requests retrieved successfully',
                };
            }

            return {
                success: false,
                requests: [],
                total: 0,
                message: response.data?.message || 'Failed to fetch deposit requests',
            };
        } catch (error) {
            console.error('DepositService getDepositHistory error:', error.response?.data || error.message);
            return {
                success: false,
                requests: [],
                total: 0,
                message: error.response?.data?.message || error.message || 'Failed to fetch deposit history',
            };
        }
    }
}

export default new DepositService();
