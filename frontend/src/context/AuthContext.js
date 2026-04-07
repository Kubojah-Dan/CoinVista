import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { authAPI, clearAccessToken, setAccessToken } from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [twoFactorPendingUser, setTwoFactorPendingUser] = useState(null);

    const applyAuthPayload = useCallback((payload) => {
        setAccessToken(payload?.accessToken);
        setUser(payload?.user || null);
    }, []);

    const bootstrapSession = useCallback(async () => {
        try {
            const response = await authAPI.refresh();
            applyAuthPayload(response.data);
            return response.data?.user || null;
        } catch (error) {
            clearAccessToken();
            setUser(null);
            return null;
        }
    }, [applyAuthPayload]);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            const bootstrappedUser = await bootstrapSession();
            if (mounted) {
                setUser(bootstrappedUser);
                setLoading(false);
            }
        };

        init();

        const handleExpired = () => {
            clearAccessToken();
            setUser(null);
            setTwoFactorPendingUser(null);
        };

        window.addEventListener('coinvista:auth-expired', handleExpired);
        return () => {
            mounted = false;
            window.removeEventListener('coinvista:auth-expired', handleExpired);
        };
    }, [bootstrapSession]);

    const register = async (userData) => {
        try {
            const response = await authAPI.register(userData);
            applyAuthPayload(response.data);
            setTwoFactorPendingUser(null);
            toast.success('Registration successful');
            return { success: true };
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
            return { success: false };
        }
    };

    const login = async (credentials) => {
        try {
            const response = await authAPI.login(credentials);
            if (response.data?.twoFactorRequired) {
                setTwoFactorPendingUser(response.data?.user || null);
                toast('Enter the 6-digit authenticator code to continue.');
                return { success: false, twoFactorRequired: true };
            }

            applyAuthPayload(response.data);
            setTwoFactorPendingUser(null);
            toast.success('Login successful');
            return { success: true };
        } catch (error) {
            if (error.response?.status === 202 && error.response?.data?.twoFactorRequired) {
                setTwoFactorPendingUser(error.response.data?.user || null);
                toast('Enter the 6-digit authenticator code to continue.');
                return { success: false, twoFactorRequired: true };
            }

            toast.error(error.response?.data?.message || 'Login failed');
            return { success: false };
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (error) {
            // Best effort logout.
        } finally {
            clearAccessToken();
            setUser(null);
            setTwoFactorPendingUser(null);
            toast.success('Logged out successfully');
        }
    };

    const refreshUser = async () => {
        try {
            const response = await authAPI.me();
            setUser(response.data);
            return response.data;
        } catch (error) {
            return null;
        }
    };

    const updateSettings = async (payload) => {
        try {
            const response = await authAPI.updateSettings(payload);
            setUser(response.data);
            toast.success('Settings updated');
            return { success: true, data: response.data };
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update settings');
            return { success: false };
        }
    };

    const setupTwoFactor = async () => {
        const response = await authAPI.setupTwoFactor();
        return response.data;
    };

    const verifyTwoFactor = async (code) => {
        try {
            const response = await authAPI.verifyTwoFactor(code);
            setUser(response.data);
            toast.success('Two-factor authentication enabled');
            return { success: true, data: response.data };
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to enable two-factor authentication');
            return { success: false };
        }
    };

    const disableTwoFactor = async (code) => {
        try {
            const response = await authAPI.disableTwoFactor(code);
            setUser(response.data);
            toast.success('Two-factor authentication disabled');
            return { success: true, data: response.data };
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to disable two-factor authentication');
            return { success: false };
        }
    };

    const deleteAccount = async () => {
        try {
            await authAPI.deleteAccount();
            clearAccessToken();
            setUser(null);
            setTwoFactorPendingUser(null);
            toast.success('Account deleted');
            return { success: true };
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete account');
            return { success: false };
        }
    };

    const value = {
        user,
        loading,
        register,
        login,
        logout,
        refreshUser,
        bootstrapSession,
        updateSettings,
        setupTwoFactor,
        verifyTwoFactor,
        disableTwoFactor,
        deleteAccount,
        twoFactorPendingUser,
        clearTwoFactorPendingUser: () => setTwoFactorPendingUser(null),
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
