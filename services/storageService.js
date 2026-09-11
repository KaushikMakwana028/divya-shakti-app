import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    TOKEN: 'auth_token',
    USER: 'user_data',
    BACKUP_TOKEN: 'permanent_auth_token_backup',
    BACKUP_USER: 'permanent_user_data_backup',
};

class StorageService {
    constructor() {
        this.cachedToken = null;
        this.cachedUser = null;
    }

    // Save token permanently on-device across multiple layers (Never expires)
    async saveToken(token) {
        if (!token) return false;
        try {
            this.cachedToken = String(token);

            // 1. SecureStore (hardware-backed EncryptedSharedPreferences on Android, Keychain on iOS)
            try {
                await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, String(token));
            } catch (secErr) {
                console.warn('SecureStore saveToken fallback to AsyncStorage:', secErr.message);
            }

            // 2. Primary AsyncStorage
            await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, String(token));

            // 3. Permanent Backup Key in AsyncStorage (survives any single-key operations)
            await AsyncStorage.setItem(STORAGE_KEYS.BACKUP_TOKEN, String(token));

            return true;
        } catch (error) {
            console.error('Error saving permanent token:', error);
            return false;
        }
    }

    // Get token with self-healing redundant fallback
    async getToken() {
        try {
            // 0. Quick return in-memory cached token if present
            if (this.cachedToken) {
                return this.cachedToken;
            }

            let token = null;

            // 1. Try SecureStore
            try {
                token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
            } catch (_) {}

            // 2. Try Primary AsyncStorage
            if (!token) {
                token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
            }

            // 3. Try Permanent Backup AsyncStorage
            if (!token) {
                token = await AsyncStorage.getItem(STORAGE_KEYS.BACKUP_TOKEN);
            }

            if (token) {
                this.cachedToken = token;
                // Self-healing: ensure token exists in all layers
                this.healTokenStorage(token);
                return token;
            }

            return null;
        } catch (error) {
            console.error('Error getting permanent token:', error);
            return this.cachedToken || null;
        }
    }

    // Self-healing: if token was retrieved from one source, ensure it is mirrored to all
    async healTokenStorage(token) {
        try {
            AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token).catch(() => {});
            AsyncStorage.setItem(STORAGE_KEYS.BACKUP_TOKEN, token).catch(() => {});
            SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, token).catch(() => {});
        } catch (_) {}
    }

    // Save user data
    async saveUser(userData) {
        if (!userData) return false;
        try {
            this.cachedUser = userData;
            const str = JSON.stringify(userData);
            await AsyncStorage.setItem(STORAGE_KEYS.USER, str);
            await AsyncStorage.setItem(STORAGE_KEYS.BACKUP_USER, str);
            return true;
        } catch (error) {
            console.error('Error saving user data:', error);
            return false;
        }
    }

    // Get user data with self-healing redundant fallback
    async getUser() {
        try {
            if (this.cachedUser) {
                return this.cachedUser;
            }

            let raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
            if (!raw) {
                raw = await AsyncStorage.getItem(STORAGE_KEYS.BACKUP_USER);
            }

            if (raw) {
                const parsed = JSON.parse(raw);
                this.cachedUser = parsed;
                // Self-heal backup
                AsyncStorage.setItem(STORAGE_KEYS.BACKUP_USER, raw).catch(() => {});
                return parsed;
            }
            return null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return this.cachedUser || null;
        }
    }

    // Clear all auth data (ONLY called on EXPLICIT user logout or delete account)
    async clearAuthData() {
        try {
            console.log('[StorageService] Auth data cleared by explicit user request');
            this.cachedToken = null;
            this.cachedUser = null;

            try {
                await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
            } catch (_) {}
            try {
                await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
            } catch (_) {}

            await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
            await AsyncStorage.removeItem(STORAGE_KEYS.USER);
            await AsyncStorage.removeItem(STORAGE_KEYS.BACKUP_TOKEN);
            await AsyncStorage.removeItem(STORAGE_KEYS.BACKUP_USER);

            return true;
        } catch (error) {
            console.error('Error clearing auth data on logout:', error);
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