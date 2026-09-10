import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    useCallback,
} from 'react';
import authService from '../services/authService';
import profileService from '../services/profileService';
import storageService from '../services/storageService';
import { setUnauthorizedHandler } from '../services/apiClient';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // ─────────────────────────────────────────
    // Check Auth Status
    // ─────────────────────────────────────────
    const checkAuthStatus = useCallback(async () => {
        try {
            const token = await storageService.getToken();
            const userData = await storageService.getUser();

            if (token) {
                setIsAuthenticated(true);
                setUser(userData || null);
                console.log('User found in storage:', userData?.name || 'Logged in');

                // Background sync latest profile details and completion %
                profileService.getProfile().then((res) => {
                    if (res.success && res.data) {
                        setUser(res.data);
                    }
                }).catch((e) => {
                    console.log('Background profile fetch error:', e.message);
                });
            } else {
                setIsAuthenticated(false);
                setUser(null);
                console.log('No authenticated user found');
            }
        } catch (error) {
            console.log('Auth check error:', error.message);
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // ─────────────────────────────────────────
    // On App Load
    // ─────────────────────────────────────────
    useEffect(() => {
        setUnauthorizedHandler(() => {
            setIsAuthenticated(false);
            setUser(null);
        });
        checkAuthStatus();
    }, [checkAuthStatus]);

    // ─────────────────────────────────────────
    // Refresh Profile
    // ─────────────────────────────────────────
    const refreshProfile = useCallback(async () => {
        try {
            const res = await profileService.getProfile();
            if (res.success && res.data) {
                setUser(res.data);
                console.log('Profile refreshed from API:', res.data.name);
                return { success: true, data: res.data };
            }

            const userData = await storageService.getUser();
            if (userData) {
                setUser(userData);
                console.log('Profile refreshed from storage:', userData.name);
                return { success: true, data: userData };
            }
            return { success: false, message: 'No user found in storage' };
        } catch (error) {
            console.log('Refresh Profile Error:', error.message);
            return { success: false, message: 'Failed to refresh profile.' };
        }
    }, []);

    // ─────────────────────────────────────────
    // Login
    // ─────────────────────────────────────────
    const login = useCallback(async (phone, otp) => {
        try {
            const result = await authService.verifyOTP(phone, otp);
            if (result.success) {
                setIsAuthenticated(true);
                setUser(result.data.user);
                console.log('Login successful:', result.data.user.name);
                return { success: true, data: result.data };
            }
            return { success: false, message: result.message };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Something went wrong.' };
        }
    }, []);

    // ─────────────────────────────────────────
    // Register Verify
    // ─────────────────────────────────────────
    const registerVerify = useCallback(async (phone, otp) => {
        try {
            const result = await authService.registerVerifyOTP(phone, otp);
            if (result.success) {
                setIsAuthenticated(true);
                setUser(result.data.user);
                console.log('Registration successful:', result.data.user?.name);
                return { success: true, data: result.data };
            }
            return { success: false, message: result.message };
        } catch (error) {
            console.error('Register verify error:', error);
            return { success: false, message: 'Something went wrong.' };
        }
    }, []);

    // ─────────────────────────────────────────
    // Logout
    // ─────────────────────────────────────────
    const logout = useCallback(async () => {
        try {
            await authService.logout();
            setIsAuthenticated(false);
            setUser(null);
            console.log('Logout successful');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }, []);

    // ─────────────────────────────────────────
    // Delete Account
    // ─────────────────────────────────────────
    const deleteAccount = useCallback(async () => {
        try {
            const result = await authService.deleteAccount();
            if (result.success) {
                // ✅ Clear local state to trigger navigation
                setIsAuthenticated(false);
                setUser(null);
                console.log('Account deleted successfully');
                return { success: true, message: result.message };
            }
            return { success: false, message: result.message };
        } catch (error) {
            console.error('Delete Account Error:', error);
            return { success: false, message: 'Something went wrong.' };
        }
    }, []);

    const value = {
        isAuthenticated,
        user,
        loading,
        login,
        registerVerify,
        logout,
        deleteAccount,
        checkAuthStatus,
        refreshProfile,  // ✅ Use this after profile update
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};