import apiClient from './apiClient';
import storageService from './storageService';

class ProfileService {
    constructor() {
        this.api = apiClient;
    }

    // ─────────────────────────────────────────
    // Get Profile
    // ─────────────────────────────────────────
    async getProfile() {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    message: 'User is not logged in',
                    data: null,
                };
            }

            // Concurrently get profile and pending withdrawal hold amount
            const [response, pendingAmount] = await Promise.all([
                this.api.get('/get_profile'),
                storageService.getPendingWithdrawAmount(),
            ]);

            if (response.data && response.data.status) {
                const userData = response.data.data;
                if (userData) {
                    const rawBal = Number(userData.wallet_balance) || 0;
                    const holdAmount = Math.max(0, Number(pendingAmount) || 0);
                    userData.raw_wallet_balance = rawBal;
                    userData.wallet_balance = Math.max(0, rawBal - holdAmount);
                    userData.pending_withdraw_amount = holdAmount;
                    await storageService.saveUser(userData);
                }
                return {
                    success: true,
                    data: userData,
                    message: response.data.message || 'Profile retrieved successfully',
                };
            }

            return {
                success: false,
                message: response.data?.message || 'Failed to fetch profile',
                data: null,
            };
        } catch (error) {
            console.error('ProfileService getProfile error:', error.response?.data || error.message);
            return {
                success: false,
                message:
                    error.response?.data?.message ||
                    error.message ||
                    'Failed to fetch profile',
                data: null,
            };
        }
    }

    // ─────────────────────────────────────────
    // Update Profile
    // Supports text and multipart file uploads
    // ─────────────────────────────────────────
    async updateProfile(fields = {}, files = {}) {
        try {
            const token = await storageService.getToken();
            if (!token) {
                return {
                    success: false,
                    message: 'User is not logged in',
                    data: null,
                };
            }

            const hasFiles = files && Object.keys(files).some((k) => !!files[k]);

            let response;
            if (hasFiles) {
                const formData = new FormData();

                // Append text fields
                Object.keys(fields).forEach((key) => {
                    const val = fields[key];
                    if (val !== undefined && val !== null) {
                        formData.append(key, String(val));
                    }
                });

                // Append files (profile_image, aadhar_image, pan_image)
                Object.keys(files).forEach((key) => {
                    const file = files[key];
                    if (file && file.uri) {
                        const filename = file.fileName || file.name || `${key}_${Date.now()}.jpg`;
                        const type = file.mimeType || file.type || 'image/jpeg';
                        formData.append(key, {
                            uri: file.uri,
                            name: filename,
                            type: type,
                        });
                    }
                });

                response = await this.api.post('/update_profile', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    transformRequest: (data) => data,
                });
            } else {
                response = await this.api.post('/update_profile', fields);
            }

            if (response.data && response.data.status) {
                const updatedUser = response.data.data;
                if (updatedUser) {
                    await storageService.saveUser(updatedUser);
                }
                return {
                    success: true,
                    data: updatedUser,
                    message: response.data.message || 'Profile updated successfully',
                };
            }

            return {
                success: false,
                message: response.data?.message || 'Failed to update profile',
                data: null,
            };
        } catch (error) {
            console.error('ProfileService updateProfile error:', error.response?.data || error.message);
            return {
                success: false,
                message:
                    error.response?.data?.message ||
                    error.message ||
                    'Failed to update profile',
                data: null,
            };
        }
    }
}

export default new ProfileService();
