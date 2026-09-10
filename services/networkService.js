import apiClient from './apiClient';

class NetworkService {
    constructor() {
        this.api = apiClient;
    }

    // ─────────────────────────────────────────
    // Get Downline Referrals & Summary
    // GET /api/get_referrals
    // ─────────────────────────────────────────
    async getReferrals() {
        try {
            const response = await this.api.get('/get_referrals');
            if (response.data && response.data.status) {
                return {
                    success: true,
                    referrals: response.data.data || [],
                    summary: response.data.summary || {
                        total_referrals: 0,
                        active_referrals: 0,
                        levels: 1,
                    },
                    message: response.data.message || 'Referrals fetched successfully',
                };
            }
            return {
                success: false,
                referrals: [],
                summary: {
                    total_referrals: 0,
                    active_referrals: 0,
                    levels: 1,
                },
                message: response.data?.message || 'Failed to fetch referrals',
            };
        } catch (error) {
            console.error('NetworkService getReferrals error:', error.response?.data || error.message);
            return {
                success: false,
                referrals: [],
                summary: {
                    total_referrals: 0,
                    active_referrals: 0,
                    levels: 1,
                },
                message: error.response?.data?.message || error.message || 'Failed to fetch referrals',
            };
        }
    }
}

export default new NetworkService();
