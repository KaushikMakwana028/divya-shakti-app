import axios from 'axios';
import API_CONFIG from '../config/api';
import storageService from './storageService';

let unauthorizedHandler = null;

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
            if (config.headers?.set) {
                config.headers.set('Authorization', `Bearer ${token}`);
            } else {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Central Response Interceptor: Permanent Token Policy
// The token NEVER auto-expires or logs the user out.
// Only explicit user action (Logout / Delete Account) clears the session.
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        if (status === 401) {
            console.warn(
                '[apiClient] 401 received for:',
                error.config?.url,
                '- Permanent session maintained (no auto-logout).'
            );
        }
        return Promise.reject(error);
    }
);

export default apiClient;
