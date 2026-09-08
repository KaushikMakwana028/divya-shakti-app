import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    TOKEN: 'auth_token',
    USER: 'user_data',
};

class StorageService {
    // Save token
    async saveToken(token) {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
            try {
                await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, token);
            } catch (_) {}
            return true;
        } catch (error) {
            console.error('Error saving token:', error);
            return false;
        }
    }

    // Get token
    async getToken() {
        try {
            let token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
            if (!token) {
                try {
                    token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
                } catch (_) {}
            }
            return token;
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    }

    // Save user data
    async saveUser(userData) {
        try {
            await AsyncStorage.setItem(
                STORAGE_KEYS.USER,
                JSON.stringify(userData)
            );
            return true;
        } catch (error) {
            console.error('Error saving user data:', error);
            return false;
        }
    }

    // Get user data
    async getUser() {
        try {
            const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    // Clear all auth data (logout)
    async clearAuthData() {
        try {
            await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
            await AsyncStorage.removeItem(STORAGE_KEYS.USER);
            try {
                await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
            } catch (_) {}
            try {
                await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
            } catch (_) {}
            return true;
        } catch (error) {
            console.error('Error clearing auth data:', error);
            return false;
        }
    }

    // Check if user is logged in
    async isLoggedIn() {
        try {
            const token = await this.getToken();
            return !!token;
        } catch (error) {
            return false;
        }
    }

    // ─────────────────────────────────────────
    // Customer Deleted Orders (Hidden from user view only)
    // ─────────────────────────────────────────
    async getDeletedOrderIds(userId = 'default') {
        try {
            const raw = await AsyncStorage.getItem(`customer_deleted_orders_${userId}`);
            return raw ? JSON.parse(raw) : [];
        } catch (error) {
            console.error('Error getting deleted orders:', error);
            return [];
        }
    }

    async deleteOrderForCustomer(orderId, userId = 'default') {
        try {
            const current = await this.getDeletedOrderIds(userId);
            const strId = String(orderId);
            if (!current.includes(strId)) {
                const updated = [...current, strId];
                await AsyncStorage.setItem(
                    `customer_deleted_orders_${userId}`,
                    JSON.stringify(updated)
                );
            }
            return true;
        } catch (error) {
            console.error('Error hiding order for customer:', error);
            return false;
        }
    }
}

export default new StorageService();