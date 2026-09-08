import axios from 'axios';
import API_CONFIG from '../config/api';
import storageService from './storageService';

class ProductService {
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
    // Get Categories List
    // ─────────────────────────────────────────
    async getCategories() {
        try {
            const response = await this.api.get('/get_category_list');
            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data || [],
                    message: response.data.message || 'Categories retrieved successfully',
                };
            }
            return {
                success: false,
                data: [],
                message: response.data?.message || 'Failed to fetch categories',
            };
        } catch (error) {
            console.error('ProductService getCategories error:', error.response?.data || error.message);
            return {
                success: false,
                data: [],
                message: error.response?.data?.message || error.message || 'Failed to fetch categories',
            };
        }
    }

    // ─────────────────────────────────────────
    // Get Products List
    // Supports search, category_id, min_price, max_price, sort_by, page, limit
    // ─────────────────────────────────────────
    async getProducts(params = {}) {
        try {
            const queryParams = {};
            if (params.search) queryParams.search = params.search;
            if (params.category_id && params.category_id !== 'all') {
                queryParams.category_id = params.category_id;
            }
            if (params.min_price !== undefined && params.min_price !== '') {
                queryParams.min_price = params.min_price;
            }
            if (params.max_price !== undefined && params.max_price !== '') {
                queryParams.max_price = params.max_price;
            }
            if (params.sort_by) queryParams.sort_by = params.sort_by;
            if (params.page) queryParams.page = params.page;
            if (params.limit) queryParams.limit = params.limit;

            const response = await this.api.get('/get_product_list', { params: queryParams });
            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data?.products || [],
                    total: response.data.data?.total || 0,
                    page: response.data.data?.page || 1,
                    limit: response.data.data?.limit || 10,
                    message: response.data.message || 'Products retrieved successfully',
                };
            }
            return {
                success: false,
                data: [],
                total: 0,
                message: response.data?.message || 'Failed to fetch products',
            };
        } catch (error) {
            console.error('ProductService getProducts error:', error.response?.data || error.message);
            return {
                success: false,
                data: [],
                total: 0,
                message: error.response?.data?.message || error.message || 'Failed to fetch products',
            };
        }
    }

    // ─────────────────────────────────────────
    // Get Products by Category
    // ─────────────────────────────────────────
    async getProductsByCategory(categoryId, params = {}) {
        try {
            if (!categoryId) return this.getProducts(params);
            const queryParams = { category_id: categoryId, ...params };
            const response = await this.api.get('/get_products_by_category', { params: queryParams });
            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data?.products || [],
                    total: response.data.data?.total || 0,
                    page: response.data.data?.page || 1,
                    limit: response.data.data?.limit || 10,
                    message: response.data.message || 'Products retrieved successfully',
                };
            }
            return {
                success: false,
                data: [],
                total: 0,
                message: response.data?.message || 'Failed to fetch category products',
            };
        } catch (error) {
            console.error('ProductService getProductsByCategory error:', error.response?.data || error.message);
            // Fallback to getProducts with category_id
            return this.getProducts({ ...params, category_id: categoryId });
        }
    }

    // ─────────────────────────────────────────
    // Get Product Detail
    // ─────────────────────────────────────────
    async getProductDetail(id) {
        try {
            const response = await this.api.get('/get_product_detail', { params: { id } });
            if (response.data && response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Product details retrieved successfully',
                };
            }
            return {
                success: false,
                data: null,
                message: response.data?.message || 'Failed to fetch product details',
            };
        } catch (error) {
            console.error('ProductService getProductDetail error:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error.message || 'Failed to fetch product details',
            };
        }
    }
}

export default new ProductService();
