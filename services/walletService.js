import apiClient from './apiClient';
import storageService from './storageService';

class WalletService {
    constructor() {
        this.api = apiClient;
    }

    // ─────────────────────────────────────────
    // Get Current Wallet Balance
    // ─────────────────────────────────────────
    // Get Current Wallet Balance (with pending withdrawal hold deducted)
    // ─────────────────────────────────────────
    async getWalletBalance() {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    balance: 0,
                    rawBalance: 0,
                    pendingAmount: 0,
                    message: 'User is not logged in',
                };
            }

            // Primary: fetch /get_withdraw_info which contains both raw DB balance and live pending withdrawal total
            try {
                const withdrawRes = await this.api.get('/get_withdraw_info');
                if (withdrawRes.data && withdrawRes.data.status) {
                    const data = withdrawRes.data.data;
                    const rawBalance = Number(data?.wallet_balance) || 0;
                    const pendingAmount = Number(data?.pending_amount) || 0;
                    const availableBalance = Math.max(0, rawBalance - pendingAmount);

                    // Sync storage
                    await storageService.setPendingWithdrawAmount(pendingAmount);

                    return {
                        success: true,
                        balance: availableBalance,
                        rawBalance: rawBalance,
                        pendingAmount: pendingAmount,
                        data: {
                            ...data,
                            wallet_balance: availableBalance,
                            raw_wallet_balance: rawBalance,
                            pending_withdraw_amount: pendingAmount,
                        },
                        message: withdrawRes.data.message || 'Wallet balance retrieved successfully',
                    };
                }
            } catch (_) {}

            // Fallback: fetch /get_wallet_balance and deduct locally cached pending amount
            const response = await this.api.get('/get_wallet_balance');
            if (response.data && response.data.status) {
                const rawBalance = Number(response.data.data?.wallet_balance) || 0;
                const pendingAmount = await storageService.getPendingWithdrawAmount();
                const availableBalance = Math.max(0, rawBalance - pendingAmount);

                return {
                    success: true,
                    balance: availableBalance,
                    rawBalance: rawBalance,
                    pendingAmount: pendingAmount,
                    data: {
                        ...response.data.data,
                        wallet_balance: availableBalance,
                        raw_wallet_balance: rawBalance,
                        pending_withdraw_amount: pendingAmount,
                    },
                    message: response.data.message || 'Wallet balance retrieved successfully',
                };
            }

            return {
                success: false,
                balance: 0,
                rawBalance: 0,
                pendingAmount: 0,
                message: response.data?.message || 'Failed to fetch wallet balance',
            };
        } catch (error) {
            console.error('WalletService getWalletBalance error:', error.response?.data || error.message);
            const cachedPending = await storageService.getPendingWithdrawAmount().catch(() => 0);
            return {
                success: false,
                balance: 0,
                rawBalance: 0,
                pendingAmount: cachedPending,
                message: error.response?.data?.message || error.message || 'Failed to fetch wallet balance',
            };
        }
    }

    // ─────────────────────────────────────────
    // Get Wallet Transactions (Paginated)
    // GET /api/get_wallet_transactions
    // ─────────────────────────────────────────
    async getWalletTransactions(page = 1, limit = 20) {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    transactions: [],
                    total: 0,
                    message: 'User is not logged in',
                };
            }

            const response = await this.api.get('/get_wallet_transactions', {
                params: { page, limit },
            });

            if (response.data && response.data.status) {
                const data = response.data.data;
                return {
                    success: true,
                    transactions: data?.transactions || [],
                    total: data?.total || 0,
                    page: data?.page || page,
                    limit: data?.limit || limit,
                    message: response.data.message || 'Transactions retrieved successfully',
                };
            }

            return {
                success: false,
                transactions: [],
                total: 0,
                message: response.data?.message || 'Failed to fetch transactions',
            };
        } catch (error) {
            console.error('WalletService getWalletTransactions error:', error.response?.data || error.message);
            return {
                success: false,
                transactions: [],
                total: 0,
                message: error.response?.data?.message || error.message || 'Failed to fetch transactions',
            };
        }
    }

    // ─────────────────────────────────────────
    // Get Deposit Requests (Paginated)
    // GET /api/get_deposit_requests
    // ─────────────────────────────────────────
    async getDepositRequests(page = 1, limit = 20, params = {}) {
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
                params: { page, limit, ...params },
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
            console.error('WalletService getDepositRequests error:', error.response?.data || error.message);
            return {
                success: false,
                requests: [],
                total: 0,
                message: error.response?.data?.message || error.message || 'Failed to fetch deposit requests',
            };
        }
    }

    // ─────────────────────────────────────────
    // Get Individual Deposit Request Details
    // GET /api/get_deposit_requests/:id or GET /api/get_deposit_requests?id=:id
    // ─────────────────────────────────────────
    async getDepositRequestDetails(id) {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    request: null,
                    message: 'User is not logged in',
                };
            }

            let response;
            try {
                // Primary: RESTful URL /get_deposit_requests/{id}
                response = await this.api.get(`/get_deposit_requests/${id}`);
            } catch (err) {
                // Fallback: Query parameter /get_deposit_requests?id={id}
                if (err.response && (err.response.status === 404 || err.response.status === 405)) {
                    response = await this.api.get('/get_deposit_requests', {
                        params: { id },
                    });
                } else {
                    throw err;
                }
            }

            if (response.data && response.data.status) {
                const reqData = response.data.data?.request || response.data.data;
                return {
                    success: true,
                    request: reqData,
                    message: response.data.message || 'Deposit request details retrieved successfully',
                };
            }

            return {
                success: false,
                request: null,
                message: response.data?.message || 'Failed to fetch deposit request details',
            };
        } catch (error) {
            console.error('WalletService getDepositRequestDetails error:', error.response?.data || error.message);
            return {
                success: false,
                request: null,
                message: error.response?.data?.message || error.message || 'Failed to fetch deposit request details',
            };
        }
    }

    // ─────────────────────────────────────────
    // Request Wallet Deposit
    // POST /api/request_wallet_deposit
    // Supports Cash and Online (with proof receipt)
    // ─────────────────────────────────────────
    async requestWalletDeposit({ amount, payment_method = 'cash', remark = '', proof_file = null }) {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    data: null,
                    message: 'User is not logged in',
                };
            }

            let response;
            if (proof_file && proof_file.uri) {
                const formData = new FormData();
                formData.append('amount', String(amount));
                formData.append('payment_method', payment_method);
                if (remark) formData.append('remark', String(remark));

                const filename = proof_file.fileName || proof_file.name || `deposit_proof_${Date.now()}.jpg`;
                const type = proof_file.mimeType || proof_file.type || 'image/jpeg';
                formData.append('proof_file', {
                    uri: proof_file.uri,
                    name: filename,
                    type: type,
                });

                response = await this.api.post('/request_wallet_deposit', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    transformRequest: (data) => data,
                });
            } else {
                response = await this.api.post('/request_wallet_deposit', {
                    amount: Number(amount),
                    payment_method: payment_method,
                    remark: remark || null,
                });
            }

            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Deposit request submitted successfully',
                };
            }

            return {
                success: false,
                data: null,
                message: response.data?.message || 'Failed to submit deposit request',
            };
        } catch (error) {
            console.error('WalletService requestWalletDeposit error:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to submit deposit request',
            };
        }
    }

    // ─────────────────────────────────────────
    // Add Wallet Money (Admin Only)
    // POST /api/add_wallet_money
    // ─────────────────────────────────────────
    async addWalletMoney({ user_id, amount, remark = '' }) {
        try {
            const response = await this.api.post('/add_wallet_money', {
                user_id: Number(user_id),
                amount: Number(amount),
                remark: remark || null,
            });

            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Wallet money credited successfully',
                };
            }

            return {
                success: false,
                data: null,
                message: response.data?.message || 'Failed to credit wallet money',
            };
        } catch (error) {
            console.error('WalletService addWalletMoney error:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to credit wallet money',
            };
        }
    }
}

export default new WalletService();
