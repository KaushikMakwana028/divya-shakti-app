import apiClient from './apiClient';

class OrderService {
    constructor() {
        this.api = apiClient;
    }

    // ─────────────────────────────────────────
    // Place Order (Review creation)
    // POST /api/place_order
    // Supports Cart Checkout (no product_id) or Buy Now (product_id + quantity)
    // plus address_id, payment_method, pay_now, and preview flags.
    // ─────────────────────────────────────────
    async placeOrder({
        product_id = null,
        quantity = null,
        address_id = null,
        payment_method = 'wallet',
        pay_now = 1,
        preview = 0,
    } = {}) {
        try {
            const payload = {};
            if (product_id !== null && product_id !== undefined && product_id !== '') {
                payload.product_id = Number(product_id);
                payload.quantity = Number(quantity) || 1;
            }
            if (address_id !== null && address_id !== undefined && address_id !== '') {
                payload.address_id = Number(address_id);
            }
            if (payment_method) {
                payload.payment_method = payment_method;
            }
            if (pay_now !== null && pay_now !== undefined) {
                payload.pay_now = Number(pay_now);
            }
            if (preview !== null && preview !== undefined && preview) {
                payload.preview = 1;
            }

            const response = await this.api.post('/place_order', payload);

            if (response.data && response.data.status) {
                const resData = response.data.data || {};
                return {
                    success: true,
                    data: resData,
                    raw: resData,
                    is_paid: Boolean(resData.is_paid),
                    order_status: resData.order_status || resData.status || 'placed',
                    order_ids: resData.order_ids || (resData.order_id ? [resData.order_id] : []),
                    message: response.data.message || 'Order placed successfully.',
                };
            }

            return {
                success: false,
                message: response.data?.message || 'Failed to place order.',
                data: response.data?.data || null,
            };
        } catch (error) {
            console.warn('OrderService placeOrder notice:', error.response?.data || error.message);
            const resData = error.response?.data || {};
            return {
                success: false,
                status: error.response?.status,
                message: resData.message || error.message || 'An error occurred while placing order.',
                data: resData.data || null,
            };
        }
    }

    // Checkout preview helper (does not create orders in database)
    async getCheckoutPreview({ product_id = null, quantity = null, address_id = null } = {}) {
        return this.placeOrder({ product_id, quantity, address_id, preview: 1 });
    }

    // Alias for verifyOrderPayment
    async verifyPayment(orderIds) {
        return this.verifyOrderPayment(orderIds);
    }

    // ─────────────────────────────────────────
    // Verify Order Payment (Confirm & Pay)
    // POST /api/verify_order_payment
    // Only endpoint that executes wallet deduction, stock deduction, commissions & clears cart.
    // ─────────────────────────────────────────
    async verifyOrderPayment(orderIds) {
        try {
            let ids = orderIds;
            if (!Array.isArray(ids)) {
                ids = [ids];
            }
            ids = ids.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0);

            const response = await this.api.post('/verify_order_payment', {
                order_ids: ids,
            });

            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Payment verified and order confirmed successfully.',
                };
            }

            return {
                success: false,
                message: response.data?.message || 'Failed to verify payment.',
                data: response.data?.data || null,
            };
        } catch (error) {
            console.warn('OrderService verifyOrderPayment notice:', error.response?.data || error.message);
            const resData = error.response?.data || {};
            return {
                success: false,
                status: error.response?.status,
                message: resData.message || error.message || 'An error occurred during payment verification.',
                data: resData.data || null,
            };
        }
    }

    // ─────────────────────────────────────────
    // Cancel Order
    // POST /api/cancel_order
    // Allowed when status is pending, placed, or confirmed.
    // ─────────────────────────────────────────
    async cancelOrder(orderId) {
        try {
            const response = await this.api.post('/cancel_order', {
                order_id: Number(orderId),
            });

            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Order cancelled successfully.',
                };
            }

            return {
                success: false,
                message: response.data?.message || 'Failed to cancel order.',
                data: response.data?.data || null,
            };
        } catch (error) {
            console.warn('OrderService cancelOrder notice:', error.response?.data || error.message);
            const resData = error.response?.data || {};
            return {
                success: false,
                status: error.response?.status,
                message: resData.message || error.message || 'Failed to cancel order.',
                data: resData.data || null,
            };
        }
    }

    // ─────────────────────────────────────────
    // Get Orders History (Paginated)
    // GET /api/get_orders?page=1&limit=10&status=...
    // ─────────────────────────────────────────
    async getOrders(page = 1, limit = 10, status = null) {
        try {
            const params = { page: Number(page) || 1, limit: Number(limit) || 10 };
            if (status !== null && status !== undefined && status !== '') {
                params.status = status;
            }

            const response = await this.api.get('/get_orders', { params });

            if (response.data && response.data.status) {
                const data = response.data.data || {};
                return {
                    success: true,
                    orders: data.orders || [],
                    total: data.total ?? 0,
                    page: data.page ?? page,
                    limit: data.limit ?? limit,
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
            console.warn('OrderService getOrders notice:', error.response?.data || error.message);
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
            console.warn('OrderService getOrderDetails notice:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to fetch order details',
            };
        }
    }
}

export default new OrderService();
