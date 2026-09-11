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
                const rawData = response.data.data;
                let referralsList = [];
                let summaryData = {
                    total_referrals: 0,
                    active_referrals: 0,
                    levels: 1,
                };

                if (Array.isArray(rawData)) {
                    referralsList = rawData;
                    summaryData.total_referrals = rawData.length;
                } else if (rawData && typeof rawData === 'object') {
                    if (Array.isArray(rawData.referrals)) {
                        referralsList = rawData.referrals;
                    }
                    summaryData = {
                        total_referrals: rawData.total_referrals ?? rawData.total ?? referralsList.length,
                        active_referrals: rawData.active_referrals ?? 0,
                        levels: rawData.levels ?? 1,
                    };
                }

                if (response.data.summary && typeof response.data.summary === 'object') {
                    summaryData = {
                        ...summaryData,
                        ...response.data.summary,
                    };
                }

                return {
                    success: true,
                    referrals: Array.isArray(referralsList) ? referralsList : [],
                    summary: summaryData,
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
