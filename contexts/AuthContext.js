import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    useCallback,
} from 'react';
import { AppState } from 'react-native';
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
    // Check Auth Status (Permanent Token Session)
    // ─────────────────────────────────────────
    const checkAuthStatus = useCallback(async () => {
        try {
            const token = await storageService.getToken();
            const userData = await storageService.getUser();

            if (token) {
                setIsAuthenticated(true);
                setUser(userData || null);

                // Background sync latest profile details without risking logout
                profileService.getProfile().then((res) => {
                    if (res.success && res.data) {
                        setUser(res.data);
                        storageService.saveUser(res.data);
                    }
                }).catch((e) => {
                    console.log('Background profile sync note:', e.message);
                });
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        } catch (error) {
            console.log('Auth check error:', error.message);
            // Fallback: check if permanent token exists in any layer
            const fallbackToken = await storageService.getToken();
            if (fallbackToken) {
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // ─────────────────────────────────────────
    // On App Load
    // ─────────────────────────────────────────
    useEffect(() => {
        // Token is permanent — unauthorized events do NOT clear user session
        setUnauthorizedHandler(() => {
            console.log('[AuthContext] Session remains preserved permanently.');
        });
        checkAuthStatus();
    }, [checkAuthStatus]);

    // ─────────────────────────────────────────
    // Refresh Profile (Live Sync from Server)
    // ─────────────────────────────────────────
    const refreshProfile = useCallback(async () => {
        try {
            const res = await profileService.getProfile();
            if (res.success && res.data) {
                setUser(res.data);
                await storageService.saveUser(res.data);
                return { success: true, data: res.data };
            }

            const userData = await storageService.getUser();
            if (userData) {
                setUser(userData);
                return { success: true, data: userData };
            }
            return { success: false, message: 'No user found in storage' };
        } catch (error) {
            console.log('Refresh Profile Error:', error.message);
            return { success: false, message: 'Failed to refresh profile.' };
        }
    }, []);

    // ─────────────────────────────────────────
    // Update User (Direct sync from Dashboard or APIs)
    // ─────────────────────────────────────────
    const updateUser = useCallback((newUserData) => {
        if (!newUserData) return;
        setUser((prev) => {
            const merged = { ...(prev || {}), ...newUserData };
            storageService.saveUser(merged);
            return merged;
        });
    }, []);

    // ─────────────────────────────────────────
    // AppState Foreground Auto-Sync
    // Whenever user returns to the app, check latest status
    // ─────────────────────────────────────────
    useEffect(() => {
        const sub = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                refreshProfile();
            }
        });
        return () => sub?.remove();
    }, [refreshProfile]);

    // ─────────────────────────────────────────
    // Real-Time Approval Poller
    // If pending admin approval, check every 7 seconds
    // The instant admin approves, app unlocks immediately!
    // ─────────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) return;
        const isActive =
            user?.is_profile_active === true ||
            user?.is_profile_active === 1 ||
            user?.status === 'Active';
        if (isActive) return;

        const timer = setInterval(() => {
            refreshProfile();
        }, 7000);

        return () => clearInterval(timer);
    }, [isAuthenticated, user?.is_profile_active, user?.status, refreshProfile]);

    // ─────────────────────────────────────────
    // Login
    // ─────────────────────────────────────────
    const login = useCallback(async (phone, otp) => {
        try {
            const result = await authService.verifyOTP(phone, otp);
            if (result.success) {
                setIsAuthenticated(true);
                setUser(result.data.user);
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
                setIsAuthenticated(false);
                setUser(null);
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
        refreshProfile,
        updateUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};