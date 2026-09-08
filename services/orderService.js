import axios from 'axios';
import API_CONFIG from '../config/api';
import storageService from './storageService';

class OrderService {
    constructor() {
        this.api = axios.create({
            baseURL: API_CONFIG.BASE_URL,
            timeout: API_CONFIG.TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.api.interceptors.request.use(
            async (config) => {
                const token = await storageService.getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );
    }

    // ─────────────────────────────────────────
    // Get Orders History (Paginated)
    // GET /api/get_orders?page=1&limit=10
    // ─────────────────────────────────────────
    async getOrders(page = 1, limit = 10) {
        try {
            const response = await this.api.get('/get_orders', {
                params: { page, limit },
            });

            if (response.data && response.data.status) {
                const data = response.data.data || {};
                return {
                    success: true,
                    orders: data.orders || [],
                    total: data.total || 0,
                    page: data.page || page,
                    limit: data.limit || limit,
                    message: response.data.message || 'Orders retrieved successfully',
                };
            }

            return {
                success: false,
                orders: [],
                total: 0,
                message: response.data?.message || 'Failed to fetch orders',
            };
        } catch (error) {
            console.error('OrderService getOrders error:', error.response?.data || error.message);
            return {
                success: false,
                orders: [],
                total: 0,
                message: error.response?.data?.message || error.message || 'Failed to fetch orders',
            };
        }
    }

    // ─────────────────────────────────────────
    // Get Specific Order Details
    // GET /api/get_order_details/:id
    // ─────────────────────────────────────────
    async getOrderDetails(orderId) {
        try {
            const response = await this.api.get(`/get_order_details/${orderId}`);

            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Order details retrieved successfully',
                };
            }

            return {
                success: false,
                data: null,
                message: response.data?.message || 'Failed to fetch order details',
            };
        } catch (error) {
            console.error('OrderService getOrderDetails error:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to fetch order details',
            };
        }
    }
}

export default new OrderService();
