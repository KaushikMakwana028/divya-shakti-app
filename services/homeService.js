import apiClient from './apiClient';
import storageService from './storageService';
import withdrawService from './withdrawService';

class HomeService {
    constructor() {
        this.api = apiClient;
    }

    // ─────────────────────────────────────────
    // Get Dashboard Data
    // ─────────────────────────────────────────
    async getDashboard() {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    message: 'User is not logged in',
                    data: null,
                };
            }

            // Concurrently fetch dashboard and sync pending withdrawal amount
            const [response, pendingAmount] = await Promise.all([
                this.api.get('/dashboard'),
                withdrawService.syncPendingWithdrawAmount().catch(() => storageService.getPendingWithdrawAmount()),
            ]);

            if (response.data && response.data.status) {
                const dashData = response.data.data || {};
                const holdAmount = Math.max(0, Number(pendingAmount) || 0);

                if (dashData.wallet) {
                    const rawBal = Number(dashData.wallet.wallet_balance) || 0;
                    dashData.wallet.raw_wallet_balance = rawBal;
                    dashData.wallet.wallet_balance = Math.max(0, rawBal - holdAmount);
                    dashData.wallet.pending_withdraw_amount = holdAmount;
                }

                if (dashData.user) {
                    const rawBal = Number(dashData.user.wallet_balance) || 0;
                    dashData.user.raw_wallet_balance = rawBal;
                    dashData.user.wallet_balance = Math.max(0, rawBal - holdAmount);
                    dashData.user.pending_withdraw_amount = holdAmount;
                    await storageService.saveUser(dashData.user);
                }

                return {
                    success: true,
                    data: dashData,
                    message: response.data.message || 'Dashboard data retrieved successfully',
                };
            }

            return {
                success: false,
                message: response.data?.message || 'Failed to fetch dashboard data',
                data: null,
            };
        } catch (error) {
            console.error('HomeService getDashboard error:', error.response?.data || error.message);
            return {
                success: false,
                message:
                    error.response?.data?.message ||
                    error.message ||
                    'Failed to fetch dashboard data',
                data: null,
            };
        }
    }
}

export default new HomeService();
