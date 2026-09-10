import apiClient from './apiClient';
import storageService from './storageService';

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

            const response = await this.api.get('/dashboard');
            if (response.data && response.data.status) {
                if (response.data.data?.user) {
                    await storageService.saveUser(response.data.data.user);
                }
                return {
                    success: true,
                    data: response.data.data,
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
