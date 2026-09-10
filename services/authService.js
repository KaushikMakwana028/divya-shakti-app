import apiClient from './apiClient';
import storageService from './storageService';

const AUTH_ENDPOINTS = {
    SEND_OTP: '/send_otp',
    VERIFY_OTP: '/verify_otp',
    REGISTER: '/send_register_otp',
    REGISTER_VERIFY_OTP: '/register_verify_otp',
    LOGOUT: '/logout',
    DELETE_ACCOUNT: '/delete_account',
};

const USER_ENDPOINTS = {
    UPDATE_PROFILE: '/update_profile',
    GET_PROFILE: '/get_profile',
};

class AuthService {
    constructor() {
        this.api = apiClient;
    }

    // ═════════════════════════════════════════
    // AUTH METHODS
    // ═════════════════════════════════════════

    // ─────────────────────────────────────────
    // Send OTP (Login)
    // ─────────────────────────────────────────
    async sendOTP(phone) {
        try {
            const response = await this.api.post(AUTH_ENDPOINTS.SEND_OTP, {
                phone,
            });

            if (response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message,
                };
            } else {
                return {
                    success: false,
                    message: response.data.message || 'Failed to send OTP',
                };
            }
        } catch (error) {
            console.error('Send OTP Error:', error);
            return {
                success: false,
                message:
                    error.response?.data?.message ||
                    'Network error. Please try again.',
            };
        }
    }

    // ─────────────────────────────────────────
    // Verify OTP (Login)
    // ─────────────────────────────────────────
    async verifyOTP(phone, otp) {
        try {
            console.log(
                'Calling verifyOTP:',
                phone,
                otp,
                '========================='
            );
            const response = await this.api.post(AUTH_ENDPOINTS.VERIFY_OTP, {
                phone,
                otp,
            });

            if (response.data.status) {
                const { token, user } = response.data.data;
                await storageService.saveToken(token);
                await storageService.saveUser(user);

                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message,
                };
            } else {
                return {
                    success: false,
                    message: response.data.message || 'Invalid OTP',
                };
            }
        } catch (error) {
            console.error('Verify OTP Error:', error);
            return {
                success: false,
                message:
                    error.response?.data?.message ||
                    'Network error. Please try again.',
            };
        }
    }

    // ─────────────────────────────────────────
    // Register
    // ─────────────────────────────────────────
    async register(name, phone, referral_code) {
        try {
            console.log(
                'Calling register:',
                name,
                phone,
                referral_code,
                '========================='
            );
            const response = await this.api.post(AUTH_ENDPOINTS.REGISTER, {
                name,
                phone,
                referral_code,
            });

            if (response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message,
                };
            } else {
                return {
                    success: false,
                    message: response.data.message || 'Registration failed',
                };
            }
        } catch (error) {
            console.error('Register Error:', error);
            return {
                success: false,
                message:
                    error.response?.data?.message ||
                    'Network error. Please try again.',
            };
        }
    }

    // ─────────────────────────────────────────
    // Register Verify OTP
    // ─────────────────────────────────────────
    async registerVerifyOTP(phone, otp) {
        try {
            console.log(
                'Calling registerVerifyOTP:',
                phone,
                otp,
                '========================='
            );
            const response = await this.api.post(
                AUTH_ENDPOINTS.REGISTER_VERIFY_OTP,
                { phone, otp }
            );

            console.log('Register Verify Response:', response.data);

            if (response.data.status === true && response.data.data) {
                const { token, user } = response.data.data;

                await storageService.clearAuthData();
                await storageService.saveToken(token);
                await storageService.saveUser(user);

                console.log('Registration successful, token saved');

                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message,
                };
            } else {
                console.log('Registration failed:', response.data.message);
                await storageService.clearAuthData();

                return {
                    success: false,
                    message: response.data.message || 'Invalid OTP',
                };
            }
        } catch (error) {
            console.error('Register Verify OTP Error:', error);
            await storageService.clearAuthData();

            return {
                success: false,
                message:
                    error.response?.data?.message ||
                    'Network error. Please try again.',
            };
        }
    }

    // ─────────────────────────────────────────
    // Logout
    // ─────────────────────────────────────────
    async logout() {
        try {
            try {
                await this.api.post(AUTH_ENDPOINTS.LOGOUT);
                console.log('Backend logout called successfully');
            } catch (apiError) {
                console.warn('Backend logout API error:', apiError.response?.data || apiError.message);
            }
            await storageService.clearAuthData();
            return { success: true };
        } catch (error) {
            console.error('Logout Error:', error);
            await storageService.clearAuthData();
            return { success: false };
        }
    }

    // ─────────────────────────────────────────
    // Get Current User
    // ─────────────────────────────────────────
    async getCurrentUser() {
        try {
            const user = await storageService.getUser();
            return user;
        } catch (error) {
            console.error('Get User Error:', error);
            return null;
        }
    }

    // ─────────────────────────────────────────
    // Is Authenticated
    // ─────────────────────────────────────────
    async isAuthenticated() {
        return await storageService.isLoggedIn();
    }

    // ─────────────────────────────────────────
    // Delete Account
    // ─────────────────────────────────────────
    async deleteAccount() {
        try {
            const response = await this.api.post(AUTH_ENDPOINTS.DELETE_ACCOUNT);

            if (response.data.status) {
                // ✅ Clear all auth data from storage
                await storageService.clearAuthData();

                return {
                    success: true,
                    message: response.data.message || 'Account deleted successfully',
                };
            }

            return {
                success: false,
                message: response.data.message || 'Failed to delete account',
            };
        } catch (error) {
            console.error('Delete Account Error:', error);

            // ✅ Clear auth data even on error (user might be deleted on server)
            await storageService.clearAuthData();

            return {
                success: false,
                message:
                    error.response?.data?.message ||
                    'Network error. Please try again.',
            };
        }
    }


    // ═════════════════════════════════════════
    // USER / PROFILE METHODS
    // ═════════════════════════════════════════

    // ─────────────────────────────────────────
    // Get Profile (Fresh from server)
    // ─────────────────────────────────────────
    // async getProfile() {
    //     try {
    //         const response = await this.api.get(USER_ENDPOINTS.GET_PROFILE);

    //         if (response.data.status) {
    //             // ✅ Keep local storage in sync
    //             await storageService.saveUser(response.data.data);
    //             return {
    //                 success: true,
    //                 data: response.data.data,
    //                 message: response.data.message,
    //             };
    //         }

    //         return {
    //             success: false,
    //             message:
    //                 response.data.message || 'Failed to fetch profile',
    //         };
    //     } catch (error) {
    //         console.error('Get Profile Error:', error);
    //         return {
    //             success: false,
    //             message:
    //                 error.response?.data?.message ||
    //                 'Network error. Please try again.',
    //         };
    //     }
    // }

    // // ─────────────────────────────────────────
    // // Update Profile
    // // Accepts FormData (supports image upload)
    // // ─────────────────────────────────────────
    // async updateProfile(formData) {
    //     try {
    //         console.log(
    //             'Calling updateProfile ==========================='
    //         );

    //         const response = await this.api.post(
    //             USER_ENDPOINTS.UPDATE_PROFILE,
    //             formData,
    //             {
    //                 headers: {
    //                     // ✅ Override Content-Type for multipart FormData
    //                     'Content-Type': 'multipart/form-data',
    //                 },
    //             }
    //         );

    //         if (response.data.status) {
    //             // ✅ Update locally saved user data
    //             const updatedUser = response.data.data;
    //             await storageService.saveUser(updatedUser);

    //             return {
    //                 success: true,
    //                 data: updatedUser,
    //                 message:
    //                     response.data.message ||
    //                     'Profile updated successfully',
    //             };
    //         }

    //         return {
    //             success: false,
    //             message:
    //                 response.data.message || 'Failed to update profile',
    //         };
    //     } catch (error) {
    //         console.error('Update Profile Error:', error);
    //         return {
    //             success: false,
    //             message:
    //                 error.response?.data?.message ||
    //                 'Network error. Please try again.',
    //         };
    //     }
    // }

    // async getProfile() {
    //     try {
    //         const response = await this.api.get(USER_ENDPOINTS.GET_PROFILE);

    //         if (response.data.status) {
    //             // ✅ Sync latest profile to local storage
    //             await storageService.saveUser(response.data.data);
    //             return {
    //                 success: true,
    //                 data: response.data.data,
    //                 message: response.data.message,
    //             };
    //         }

    //         return {
    //             success: false,
    //             message: response.data.message || 'Failed to fetch profile',
    //         };
    //     } catch (error) {
    //         console.error('Get Profile Error:', error);
    //         return {
    //             success: false,
    //             message:
    //                 error.response?.data?.message ||
    //                 'Network error. Please try again.',
    //         };
    //     }
    // }

    // async updateProfile(formData) {
    //     try {
    //         const response = await this.api.post(
    //             USER_ENDPOINTS.UPDATE_PROFILE,
    //             formData,
    //             {
    //                 headers: {
    //                     // ✅ Must override for multipart/form-data
    //                     'Content-Type': 'multipart/form-data',
    //                 },
    //             }
    //         );

    //         if (response.data.status) {
    //             const updatedUser = response.data.data;

    //             // ✅ Sync updated profile to local storage
    //             await storageService.saveUser(updatedUser);

    //             return {
    //                 success: true,
    //                 data: updatedUser,
    //                 message:
    //                     response.data.message || 'Profile updated successfully',
    //             };
    //         }

    //         return {
    //             success: false,
    //             message: response.data.message || 'Failed to update profile',
    //         };
    //     } catch (error) {
    //         console.error('Update Profile Error:', error);
    //         return {
    //             success: false,
    //             message:
    //                 error.response?.data?.message ||
    //                 'Network error. Please try again.',
    //         };
    //     }
    // ─────────────────────────────────────────
    // Delete Account
    // ─────────────────────────────────────────
    async deleteAccount() {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return { success: false, message: 'User is not logged in' };
            }
            const response = await this.api.post(AUTH_ENDPOINTS.DELETE_ACCOUNT, {});
            if (response.data && response.data.status) {
                await storageService.clearAll();
                return {
                    success: true,
                    message: response.data.message || 'Account deleted successfully',
                    data: response.data.data,
                };
            }
            return {
                success: false,
                message: response.data?.message || 'Failed to delete account',
            };
        } catch (error) {
            console.error('Delete Account Error:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to delete account',
            };
        }
    }
}

export default new AuthService();