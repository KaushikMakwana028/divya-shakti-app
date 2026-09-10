import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    TOKEN: 'auth_token',
    USER: 'user_data',
};

class StorageService {
    // Save token securely on-device
    async saveToken(token) {
        try {
            // Primary: SecureStore (hardware-backed EncryptedSharedPreferences on Android, Keychain on iOS)
            let secureSaved = false;
            try {
                await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, token);
                secureSaved = true;
            } catch (secErr) {
                console.warn('SecureStore saveToken fallback to AsyncStorage:', secErr.message);
            }

            // Also keep in AsyncStorage for web or environments where SecureStore isn't available
            await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
            return true;
        } catch (error) {
            console.error('Error saving token:', error);
            return false;
        }
    }

    // Get token (auto-load from SecureStore first, then AsyncStorage)
    async getToken() {
        try {
            let token = null;
            try {
                token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
            } catch (secErr) {
                // SecureStore unavailable, fallback
            }

            if (!token) {
                token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
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

    // Clear all auth data (logout / 401 expiration)
    async clearAuthData() {
        try {
            try {
                await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
            } catch (_) {}
            try {
                await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
            } catch (_) {}
            await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
            await AsyncStorage.removeItem(STORAGE_KEYS.USER);
            return true;
        } catch (error) {
            console.error('Error clearing auth data:', error);
            return false;
        }
    }

    // Alias for clearAuthData
    async clearAll() {
        return await this.clearAuthData();
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