import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add token to requests
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const cryptoAPI = {
  getTopCoins: ({ page = 1, perPage = 50, currency = 'usd' }) =>
    api.get(`/crypto/coins/top`, { params: { page, perPage, currency } }),

  getCoinDetails: (id) =>
    api.get(`/crypto/coins/${id}`),

  getCoinChart: (id, { days = 7, currency = 'usd' }) =>
    api.get(`/crypto/coins/${id}/chart`, { params: { days, currency } }),

  searchCoins: (query) =>
    api.get(`/crypto/search`, { params: { query } }),

  getGlobalData: (currency = 'usd') =>
    api.get(`/crypto/global`, { params: { currency } }),

  getWatchlist: () =>
    api.get(`/crypto/watchlist`),

  addToWatchlist: (coinId) =>
    api.post(`/crypto/watchlist`, { coinId }),

  removeFromWatchlist: (coinId) =>
    api.delete(`/crypto/watchlist/${coinId}`),

  getAlerts: () =>
    api.get(`/crypto/alerts`),

  createAlert: (data) =>
    api.post(`/crypto/alerts`, data),

  deleteAlert: (id) =>
    api.delete(`/crypto/alerts/${id}`),
};

export default api;
