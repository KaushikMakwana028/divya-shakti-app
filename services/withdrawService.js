import apiClient from './apiClient';
import storageService from './storageService';

class WithdrawService {
    constructor() {
        this.api = apiClient;
    }

    /**
     * Get Withdrawal Information:
     * Current wallet balance, bank account snapshot, min withdrawal limit, and pending request counts
     * GET /api/get_withdraw_info
     */
    async getWithdrawInfo() {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    balance: 0,
                    minWithdrawAmount: 500,
                    hasBankDetails: false,
                    bankDetails: {},
                    canWithdraw: false,
                    message: 'User is not logged in',
                };
            }

            const response = await this.api.get('/get_withdraw_info');
            if (response.data && response.data.status) {
                const data = response.data.data;
                const rawBalance = Number(data?.wallet_balance) || 0;
                const pendingAmount = Number(data?.pending_amount) || 0;
                const availableBalance = Math.max(0, rawBalance - pendingAmount);
                const minWithdrawAmount = Number(data?.min_withdraw_amount) || 500;
                const hasBankDetails = Boolean(data?.has_bank_details);

                // Cache pending amount in storage for all other screens
                await storageService.setPendingWithdrawAmount(pendingAmount);

                return {
                    success: true,
                    balance: availableBalance,
                    rawBalance: rawBalance,
                    pendingAmount: pendingAmount,
                    pendingCount: Number(data?.pending_count) || 0,
                    formattedBalance: `₹${availableBalance.toFixed(2)}`,
                    formattedRawBalance: data?.formatted_balance || `₹${rawBalance.toFixed(2)}`,
                    minWithdrawAmount: minWithdrawAmount,
                    formattedMinAmount: data?.formatted_min_amount || `₹${minWithdrawAmount.toFixed(2)}`,
                    bankDetails: data?.bank_details || {},
                    hasBankDetails: hasBankDetails,
                    canWithdraw: Boolean(hasBankDetails && availableBalance >= minWithdrawAmount),
                    ineligibilityReason: availableBalance < minWithdrawAmount
                        ? `Available balance (₹${availableBalance.toFixed(2)}) is lower than minimum limit (₹${minWithdrawAmount.toFixed(2)}).`
                        : data?.ineligibility_reason || null,
                    message: response.data.message || 'Withdrawal info retrieved successfully',
                };
            }

            return {
                success: false,
                balance: 0,
                rawBalance: 0,
                pendingAmount: 0,
                minWithdrawAmount: 500,
                hasBankDetails: false,
                bankDetails: {},
                canWithdraw: false,
                message: response.data?.message || 'Failed to fetch withdrawal info',
            };
        } catch (error) {
            console.error('WithdrawService getWithdrawInfo error:', error.response?.data || error.message);
            return {
                success: false,
                balance: 0,
                rawBalance: 0,
                pendingAmount: 0,
                minWithdrawAmount: 500,
                hasBankDetails: false,
                bankDetails: {},
                canWithdraw: false,
                message: error.response?.data?.message || error.message || 'Failed to fetch withdrawal info',
            };
        }
    }

    /**
     * Submit a new withdrawal request
     * POST /api/request_withdraw
     * @param {number|string} amount
     * @param {string} remark
     */
    async requestWithdraw(amount, remark = '') {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    message: 'User is not logged in',
                };
            }

            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                return {
                    success: false,
                    message: 'Please enter a valid withdrawal amount.',
                };
            }

            const payload = {
                amount: amountNum,
                remark: (remark || '').trim(),
            };

            const response = await this.api.post('/request_withdraw', payload);
            if (response.data && response.data.status) {
                // Immediately add requested amount to locally held pending amount
                try {
                    const currentPending = await storageService.getPendingWithdrawAmount();
                    await storageService.setPendingWithdrawAmount(currentPending + amountNum);
                } catch (_) {}

                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Withdrawal request submitted successfully.',
                };
            }

            return {
                success: false,
                message: response.data?.message || 'Failed to submit withdrawal request.',
                errors: response.data?.data || null,
            };
        } catch (error) {
            console.error('WithdrawService requestWithdraw error:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Unable to submit withdrawal request.',
                errors: error.response?.data?.data || null,
            };
        }
    }

    /**
     * Get Paginated Withdrawal Requests History
     * GET /api/get_withdraw_requests
     * @param {number} page
     * @param {number} limit
     */
    async getWithdrawRequests(page = 1, limit = 20) {
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

            const response = await this.api.get('/get_withdraw_requests', {
                params: { page, limit },
            });

            if (response.data && response.data.status) {
                const data = response.data.data;
                const requests = data?.requests || [];

                // Recalculate pending sum from requests if page 1
                if (page === 1 && Array.isArray(requests)) {
                    const pendingSum = requests
                        .filter((r) => String(r.status || '').toLowerCase() === 'pending')
                        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                    await storageService.setPendingWithdrawAmount(pendingSum);
                }

                return {
                    success: true,
                    requests: requests,
                    total: data?.total || 0,
                    page: data?.page || page,
                    limit: data?.limit || limit,
                    message: response.data.message || 'Withdrawal requests retrieved successfully.',
                };
            }

            return {
                success: false,
                requests: [],
                total: 0,
                message: response.data?.message || 'Failed to fetch withdrawal requests.',
            };
        } catch (error) {
            console.error('WithdrawService getWithdrawRequests error:', error.response?.data || error.message);
            return {
                success: false,
                requests: [],
                total: 0,
                message: error.response?.data?.message || error.message || 'Failed to fetch withdrawal requests.',
            };
        }
    }

    /**
     * Synchronize and get current pending withdrawal amount directly from backend
     */
    async syncPendingWithdrawAmount() {
        try {
            const token = await storageService.getToken();
            if (!token) return 0;
            const response = await this.api.get('/get_withdraw_info');
            if (response.data && response.data.status) {
                const pendingAmount = Number(response.data.data?.pending_amount) || 0;
                await storageService.setPendingWithdrawAmount(pendingAmount);
                return pendingAmount;
            }
        } catch (_) {}
        return await storageService.getPendingWithdrawAmount();
    }

    /**
     * Get locally stored pending withdrawal amount
     */
    async getPendingWithdrawAmount() {
        return await storageService.getPendingWithdrawAmount();
    }

    /**
     * Get details of a single withdrawal request
     * GET /api/get_withdraw_requests/:id
     * @param {number|string} id
     */
    async getWithdrawRequestDetails(id) {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    request: null,
                    message: 'User is not logged in',
                };
            }

            const response = await this.api.get(`/get_withdraw_requests/${id}`);
            if (response.data && response.data.status) {
                return {
                    success: true,
                    request: response.data.data?.request || null,
                    message: response.data.message || 'Request details retrieved successfully.',
                };
            }

            return {
                success: false,
                request: null,
                message: response.data?.message || 'Failed to fetch request details.',
            };
        } catch (error) {
            console.error('WithdrawService getWithdrawRequestDetails error:', error.response?.data || error.message);
            return {
                success: false,
                request: null,
                message: error.response?.data?.message || error.message || 'Failed to fetch request details.',
            };
        }
    }
}

export default new WithdrawService();
