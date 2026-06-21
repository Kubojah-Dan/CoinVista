import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let accessToken = null;
let refreshPromise = null;

export const setAccessToken = (token) => {
    accessToken = token || null;
};

export const clearAccessToken = () => {
    accessToken = null;
};

export const getAccessToken = () => accessToken;

export const getOrRefreshAccessToken = async () => {
    if (!accessToken) return null;
    try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const isExpired = payload.exp * 1000 - 30000 < Date.now();
        if (isExpired) {
            if (!refreshPromise) {
                refreshPromise = refreshClient.post('/auth/refresh')
                    .then((response) => {
                        setAccessToken(response.data?.accessToken);
                        return response;
                    })
                    .finally(() => {
                        refreshPromise = null;
                    });
            }
            await refreshPromise;
        }
    } catch (e) {
        // Fallback to current token
    }
    return accessToken;
};

export const getApiBaseUrl = () => API_URL;

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

const refreshClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;

        if (
            status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/refresh')
        ) {
            originalRequest._retry = true;

            try {
                if (!refreshPromise) {
                    refreshPromise = refreshClient.post('/auth/refresh')
                        .then((response) => {
                            setAccessToken(response.data?.accessToken);
                            return response;
                        })
                        .finally(() => {
                            refreshPromise = null;
                        });
                }

                await refreshPromise;
                if (accessToken) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }
                return api(originalRequest);
            } catch (refreshError) {
                clearAccessToken();
                window.dispatchEvent(new CustomEvent('coinvista:auth-expired'));
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export const authAPI = {
    register: (payload) => api.post('/auth/register', payload),
    login: (payload) => api.post('/auth/login', payload),
    refresh: () => refreshClient.post('/auth/refresh'),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
    updateSettings: (payload) => api.patch('/auth/settings', payload),
    setupTwoFactor: () => api.post('/auth/2fa/setup'),
    verifyTwoFactor: (code) => api.post('/auth/2fa/verify', { code }),
    disableTwoFactor: (code) => api.post('/auth/2fa/disable', { code }),
    deleteAccount: () => api.delete('/auth/account'),
    oauthUrl: (provider) => `${API_URL}/auth/oauth/${provider}/start`,
};

export const cryptoAPI = {
    getTopCoins: ({ page = 1, perPage = 50, currency = 'usd' }) =>
        api.get('/crypto/coins/top', { params: { page, perPage, currency } }),
    getCoinDetails: (id) => api.get(`/crypto/coins/${id}`),
    getCoinChart: (id, { days = 7, currency = 'usd' }) =>
        api.get(`/crypto/coins/${id}/chart`, { params: { days, currency } }),
    getCoinOhlcv: (id, { days = 7, currency = 'usd' } = {}) =>
        api.get(`/crypto/coins/${id}/ohlcv`, { params: { days, currency } }),
    searchCoins: (query) => api.get('/crypto/search', { params: { query } }),
    getGlobalData: (currency = 'usd') => api.get('/crypto/global', { params: { currency } }),
    getTrendingCoins: () => api.get('/crypto/trending'),
    getWatchlist: () => api.get('/crypto/watchlist'),
    addToWatchlist: (coinId) => api.post('/crypto/watchlist', { coinId }),
    removeFromWatchlist: (coinId) => api.delete(`/crypto/watchlist/${coinId}`),
    getAlerts: () => api.get('/crypto/alerts'),
    createAlert: (payload) => api.post('/crypto/alerts', payload),
    deleteAlert: (id) => api.delete(`/crypto/alerts/${id}`),
};

export const portfolioAPI = {
    getHoldings: () => api.get('/holdings'),
    createHolding: (payload) => api.post('/holdings', payload),
    deleteHolding: (id) => api.delete(`/holdings/${id}`),
    getSummary: () => api.get('/portfolio/summary'),
    exportCsv: () => api.get('/portfolio/export.csv', { responseType: 'blob' }),
};

export const paperTradingAPI = {
    getSummary: () => api.get('/paper-trading/summary'),
    placeTrade: (payload) => api.post('/paper-trading/trades', payload),
    reset: () => api.post('/paper-trading/reset'),
    toggle: (paperTradingEnabled, liveTradingEnabled) =>
        api.post('/paper-trading/toggle', null, { params: { paperTradingEnabled, liveTradingEnabled } }),
    getTradeAnalysis: (tradeId) => api.get(`/paper-trading/trades/${tradeId}/analysis`),
    getInbox: () => api.get('/paper-trading/inbox'),
    markInboxRead: (id) => api.patch(`/paper-trading/inbox/${id}/read`),
    triggerWeeklyReview: () => api.post('/paper-trading/weekly-review/trigger'),
};

export const intelligenceAPI = {
    getInsights: (coinId) => api.get(`/intelligence/${coinId}`),
};

export const liveTradingAPI = {
    getEligibility: () => api.get('/live-trading/eligibility'),
    enable: (enable, activeExchange, apiKey, apiSecret) =>
        api.post('/live-trading/enable', null, { params: { enable, activeExchange, apiKey, apiSecret } }),
};

export const billingAPI = {
    checkout: (payload) => api.post('/billing/checkout', payload),
    portal: (payload) => api.post('/billing/portal', payload),
};

export const strategiesAPI = {
    getAll: () => api.get('/strategies'),
    create: (payload) => api.post('/strategies', payload),
    update: (id, payload) => api.put(`/strategies/${id}`, payload),
    delete: (id) => api.delete(`/strategies/${id}`),
};

export const socialAPI = {
    getLeaderboard: () => api.get('/social/leaderboard'),
    getProfile: (userId) => api.get(`/social/profile/${userId}`),
    follow: (userId) => api.post(`/social/follow/${userId}`),
    unfollow: (userId) => api.post(`/social/unfollow/${userId}`),
    updateCopyConfig: (payload) => api.post('/social/copy-config', payload),
    getFollowing: () => api.get('/social/following'),
    getFollowers: () => api.get('/social/followers'),
};

export const gamificationAPI = {
    getXP: () => api.get('/gamification/xp'),
};

export default api;
