import apiClient from './apiClient';

class NetworkService {
    constructor() {
        this.api = apiClient;
    }

    // ─────────────────────────────────────────
    // Get Downline Referrals & Summary
    // GET /api/get_referrals
    // ─────────────────────────────────────────
    async getReferrals(view = 'my') {
        try {
            const response = await this.api.get('/get_referrals');
            if (response.data && response.data.status) {
                const rawData = response.data.data;
                let referralsList = [];
                let treeData = [];
                let myTreeData = [];
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
                    if (Array.isArray(rawData.tree)) {
                        treeData = rawData.tree;
                    }
                    if (Array.isArray(rawData.my_tree)) {
                        myTreeData = rawData.my_tree;
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
                    tree: treeData,
                    my_tree: myTreeData,
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

    // ─────────────────────────────────────────
    // Get Member Profile, Hierarchy & Real Activities
    // GET /api/get_member_details?id=...
    // ─────────────────────────────────────────
    async getMemberDetails(memberId) {
        try {
            const response = await this.api.get('/get_member_details', {
                params: { id: memberId },
            });
            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Member details fetched successfully',
                };
            }
            return {
                success: false,
                data: null,
                message: response.data?.message || 'Failed to fetch member details',
            };
        } catch (error) {
            console.error('NetworkService getMemberDetails error:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to fetch member details',
            };
        }
    }
}

export default new NetworkService();
