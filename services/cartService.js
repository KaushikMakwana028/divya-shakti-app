import apiClient from './apiClient';
import storageService from './storageService';

class CartService {
    constructor() {
        this.api = apiClient;
    }

    // ─────────────────────────────────────────
    // Get Cart Items
    // GET /api/get_cart
    // ─────────────────────────────────────────
    async getCart() {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    data: [],
                    message: 'User is not logged in',
                };
            }

            const response = await this.api.get('/get_cart');
            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data || [],
                    message: response.data.message || 'Cart items retrieved successfully',
                };
            }
            return {
                success: false,
                data: [],
                message: response.data?.message || 'Failed to fetch cart',
            };
        } catch (error) {
            console.log('CartService getCart error:', error.response?.data?.message || error.message);
            return {
                success: false,
                data: [],
                message: error.response?.data?.message || error.message || 'Failed to fetch cart',
            };
        }
    }

    // ─────────────────────────────────────────
    // Add To Cart
    // POST /api/add_to_cart
    // ─────────────────────────────────────────
    async addToCart(productId, quantity = 1, size = null) {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    data: null,
                    message: 'Please login to add items to your cart',
                };
            }

            const payload = {
                product_id: Number(productId),
                quantity: Number(quantity),
            };
            if (size) {
                payload.size = size;
            }

            const response = await this.api.post('/add_to_cart', payload);

            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Product added to cart successfully',
                };
            }

            return {
                success: false,
                data: null,
                message: response.data?.message || 'Failed to add product to cart',
            };
        } catch (error) {
            const errData = error.response?.data;
            const profileData = errData?.data || null;
            const msg = errData?.message || error.message || 'Failed to add product to cart';
            const isUnderReview =
                error.response?.status === 403 &&
                (profileData?.is_profile_active === false ||
                    Number(profileData?.profile_completion_percentage) >= 100 ||
                    (typeof msg === 'string' &&
                        (msg.toLowerCase().includes('review') ||
                            msg.toLowerCase().includes('activate') ||
                            msg.toLowerCase().includes('activation'))));
            const isProfileIncomplete =
                error.response?.status === 403 ||
                profileData?.is_profile_completed === false;
            console.log('CartService addToCart info:', msg);
            return {
                success: false,
                isUnderReview: !!isUnderReview,
                isProfileIncomplete,
                profileData,
                data: profileData,
                message: msg,
            };
        }
    }

    // ─────────────────────────────────────────
    // Update Cart Quantity
    // POST /api/update_cart_quantity
    // ─────────────────────────────────────────
    async updateCartQuantity(productId, quantity) {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    data: null,
                    message: 'User is not logged in',
                };
            }

            const response = await this.api.post('/update_cart_quantity', {
                product_id: Number(productId),
                quantity: Number(quantity),
            });

            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Cart quantity updated successfully',
                };
            }

            return {
                success: false,
                data: null,
                message: response.data?.message || 'Failed to update cart quantity',
            };
        } catch (error) {
            console.log('CartService updateCartQuantity error:', error.response?.data?.message || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to update quantity',
            };
        }
    }

    // ─────────────────────────────────────────
    // Remove From Cart
    // POST /api/remove_from_cart
    // ─────────────────────────────────────────
    async removeFromCart(productId) {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    message: 'User is not logged in',
                };
            }

            const response = await this.api.post('/remove_from_cart', {
                product_id: Number(productId),
            });

            if (response.data && response.data.status) {
                return {
                    success: true,
                    message: response.data.message || 'Product removed from cart successfully',
                };
            }

            return {
                success: false,
                message: response.data?.message || 'Failed to remove product from cart',
            };
        } catch (error) {
            console.log('CartService removeFromCart error:', error.response?.data?.message || error.message);
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to remove from cart',
            };
        }
    }

    // ─────────────────────────────────────────
    // Clear Cart
    // POST /api/clear_cart
    // ─────────────────────────────────────────
    async clearCart() {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    message: 'User is not logged in',
                };
            }

            const response = await this.api.post('/clear_cart', {});
            if (response.data && response.data.status) {
                return {
                    success: true,
                    message: response.data.message || 'Cart cleared successfully',
                };
            }

            return {
                success: false,
                message: response.data?.message || 'Failed to clear cart',
            };
        } catch (error) {
            console.error('CartService clearCart error:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to clear cart',
            };
        }
    }

    // ─────────────────────────────────────────
    // Get Cart Row for a single product
    // GET /api/get_cart_row?product_id=X
    // ─────────────────────────────────────────
    async getCartRow(productId) {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    data: null,
                    message: 'User is not logged in',
                };
            }

            const response = await this.api.get('/get_cart_row', {
                params: { product_id: Number(productId) },
            });

            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Cart row retrieved successfully',
                };
            }

            return {
                success: false,
                data: null,
                message: response.data?.message || 'Failed to retrieve cart row',
            };
        } catch (error) {
            console.error('CartService getCartRow error:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to retrieve cart row',
            };
        }
    }

    // ─────────────────────────────────────────
    // Get Cart Summary
    // GET /api/get_cart_summary
    // ─────────────────────────────────────────
    async getCartSummary() {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    data: { total_items: 0, subtotal: 0 },
                    message: 'User is not logged in',
                };
            }

            const response = await this.api.get('/get_cart_summary');
            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data || { total_items: 0, subtotal: 0 },
                    message: response.data.message || 'Cart summary retrieved successfully',
                };
            }

            return {
                success: false,
                data: { total_items: 0, subtotal: 0 },
                message: response.data?.message || 'Failed to retrieve cart summary',
            };
        } catch (error) {
            console.error('CartService getCartSummary error:', error.response?.data || error.message);
            return {
                success: false,
                data: { total_items: 0, subtotal: 0 },
                message: error.response?.data?.message || error.message || 'Failed to retrieve summary',
            };
        }
    }
}

export default new CartService();
