import axios from 'axios';
import API_CONFIG from '../config/api';
import storageService from './storageService';
import { navigateResetToLogin } from '../navigation/navigationRef';

// Endpoints exempt from 401 automatic redirect to avoid redirect loops
const AUTH_EXEMPT_ROUTES = [
    '/send_otp',
    '/verify_otp',
    '/send_register_otp',
    '/register_verify_otp',
    '/login',
    '/register',
];

let unauthorizedHandler = null;
let isRedirecting = false;

export const setUnauthorizedHandler = (handler) => {
    unauthorizedHandler = handler;
};

const apiClient = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Central Request Interceptor: Attach Bearer Token automatically to every request
apiClient.interceptors.request.use(
    async (config) => {
        const token = await storageService.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Central Response Interceptor: Global 401 silent session expiry handling
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        const requestUrl = error.config?.url || '';

        const isExempt = AUTH_EXEMPT_ROUTES.some((route) =>
            requestUrl.toLowerCase().includes(route.toLowerCase())
        );

        // Check if token expired or invalid (matches Api.php check_auth status 401)
        if (status === 401 && !isExempt) {
            if (!isRedirecting) {
                isRedirecting = true;

                // Silently clear credentials from SecureStore and AsyncStorage
                await storageService.clearAuthData();

                // Notify AuthContext silently to reset state
                if (typeof unauthorizedHandler === 'function') {
                    try {
                        unauthorizedHandler();
                    } catch (cbErr) {
                        console.error('Error in unauthorizedHandler:', cbErr);
                    }
                }

                // Silently reset navigation to Login screen without any error dialog or toast
                navigateResetToLogin();

                // Allow future redirects after a short debounce
                setTimeout(() => {
                    isRedirecting = false;
                }, 1500);
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
