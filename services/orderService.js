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
    // Checkout Details
    // GET /api/checkout
    // Fetches live items, server calculations, shipping addresses & wallet preview
    // ─────────────────────────────────────────
    async getCheckout({ product_id = null, quantity = null } = {}) {
        try {
            const params = {};
            if (product_id !== null && product_id !== undefined) {
                params.product_id = Number(product_id);
                params.quantity = Number(quantity) || 1;
            }

            const response = await this.api.get('/checkout', { params });

            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Checkout details retrieved successfully',
                };
            }

            return {
                success: false,
                message: response.data?.message || 'Failed to fetch checkout details',
            };
        } catch (error) {
            console.error('OrderService getCheckout error:', error.response?.data || error.message);
            const status = error.response?.status;
            const resData = error.response?.data || {};

            if (status === 403) {
                const profileData = resData.data || null;
                const msg = resData.message || 'Profile completion of 100% is required to checkout.';
                const isUnderReview =
                    profileData?.is_profile_active === false ||
                    Number(profileData?.profile_completion_percentage) >= 100 ||
                    (typeof msg === 'string' &&
                        (msg.toLowerCase().includes('review') ||
                            msg.toLowerCase().includes('activate') ||
                            msg.toLowerCase().includes('activation')));
                return {
                    success: false,
                    isUnderReview: !!isUnderReview,
                    isProfileIncomplete: true,
                    profileData,
                    message: msg,
                };
            }

            return {
                success: false,
                message: resData.message || error.message || 'Failed to load checkout details',
            };
        }
    }

    // ─────────────────────────────────────────
    // Place Order
    // POST /api/place_order
    // Supports Cart Checkout (no product_id) or Buy Now (product_id + quantity)
    // Supports immediate wallet payment (payment_method: 'wallet', pay_now: 1)
    // ─────────────────────────────────────────
    async placeOrder({ product_id = null, quantity = null, address_id = null, payment_method = 'wallet', pay_now = 1 } = {}) {
        try {
            const payload = {
                payment_method: payment_method || 'wallet',
                pay_now: pay_now ? 1 : 0,
            };
            if (product_id !== null && product_id !== undefined) {
                payload.product_id = Number(product_id);
                payload.quantity = Number(quantity) || 1;
            }
            if (address_id !== null && address_id !== undefined) {
                payload.address_id = Number(address_id);
            }

            const response = await this.api.post('/place_order', payload);

            if (response.data && response.data.status) {
                const resData = response.data.data || {};
                // If cart checkout returned { orders: [...] }, or buy now { order: {...} }
                const placedItems = resData.orders || (resData.order ? [resData.order] : (Array.isArray(resData) ? resData : (resData.id ? [resData] : [])));
                return {
                    success: true,
                    data: placedItems,
                    raw: resData,
                    is_paid: Boolean(resData.is_paid),
                    buyer_updated_balance: resData.buyer_updated_balance,
                    message: response.data.message || 'Order placed successfully.',
                };
            }

            return {
                success: false,
                message: response.data?.message || 'Failed to place order.',
            };
        } catch (error) {
            console.error('OrderService placeOrder error:', error.response?.data || error.message);

            const status = error.response?.status;
            const resData = error.response?.data || {};

            if (status === 403) {
                const profileData = resData.data || null;
                const msg = resData.message || 'Profile completion of 100% is required to place an order.';
                const isUnderReview =
                    profileData?.is_profile_active === false ||
                    Number(profileData?.profile_completion_percentage) >= 100 ||
                    (typeof msg === 'string' &&
                        (msg.toLowerCase().includes('review') ||
                            msg.toLowerCase().includes('activate') ||
                            msg.toLowerCase().includes('activation')));
                return {
                    success: false,
                    isUnderReview: !!isUnderReview,
                    isProfileIncomplete: true,
                    profileData,
                    message: msg,
                };
            }

            return {
                success: false,
                message: resData.message || error.message || 'An error occurred while placing order.',
            };
        }
    }

    // ─────────────────────────────────────────
    // Verify Order Payment
    // POST /api/verify_order_payment
    // Deducts from wallet, confirms order, generates MLM commissions
    // ─────────────────────────────────────────
    async verifyPayment(orderId) {
        try {
            const response = await this.api.post('/verify_order_payment', {
                order_id: Number(orderId),
            });

            if (response.data && response.data.status) {
                const resData = response.data.data || {};
                return {
                    success: true,
                    data: resData.order || resData,
                    buyer_updated_balance: resData.buyer_updated_balance,
                    message: response.data.message || 'Payment verified and order confirmed successfully.',
                };
            }

            return {
                success: false,
                message: response.data?.message || 'Failed to verify payment.',
            };
        } catch (error) {
            console.error('OrderService verifyPayment error:', error.response?.data || error.message);
            const resData = error.response?.data || {};
            return {
                success: false,
                message: resData.message || error.message || 'An error occurred during payment verification.',
            };
        }
    }

    // ─────────────────────────────────────────
    // Cancel Order
    // POST /api/cancel_order
    // Allows cancelling a pending or confirmed order (with wallet refund if confirmed)
    // ─────────────────────────────────────────
    async cancelOrder(orderId) {
        try {
            const response = await this.api.post('/cancel_order', {
                order_id: Number(orderId),
            });

            if (response.data && response.data.status) {
                const resData = response.data.data || {};
                return {
                    success: true,
                    data: resData.order || resData,
                    refunded: !!resData.refunded,
                    refund_amount: resData.refund_amount || 0,
                    buyer_updated_balance: resData.buyer_updated_balance,
                    message: response.data.message || 'Order cancelled successfully.',
                };
            }

            return {
                success: false,
                message: response.data?.message || 'Failed to cancel order.',
            };
        } catch (error) {
            console.error('OrderService cancelOrder error:', error.response?.data || error.message);
            const resData = error.response?.data || {};
            return {
                success: false,
                message: resData.message || error.message || 'Failed to cancel order.',
            };
        }
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
                    total: data.pagination?.total ?? data.total ?? 0,
                    page: data.pagination?.page ?? data.page ?? page,
                    limit: data.pagination?.limit ?? data.limit ?? limit,
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
                const orderData = response.data.data?.order || response.data.data;
                return {
                    success: true,
                    data: orderData,
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

    // ─────────────────────────────────────────
    // Update Order Status (Admin lifecycle transition)
    // POST /api/update_order_status
    // ─────────────────────────────────────────
    async updateOrderStatus(orderId, status) {
        try {
            const response = await this.api.post('/update_order_status', {
                order_id: Number(orderId),
                status: String(status),
            });

            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Order status updated successfully.',
                };
            }

            return {
                success: false,
                message: response.data?.message || 'Failed to update order status.',
            };
        } catch (error) {
            console.error('OrderService updateOrderStatus error:', error.response?.data || error.message);
            const resData = error.response?.data || {};
            return {
                success: false,
                message: resData.message || error.message || 'Failed to update order status.',
            };
        }
    }
}

export default new OrderService();
