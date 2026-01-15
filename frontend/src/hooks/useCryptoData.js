import { useState, useEffect, useCallback } from 'react';
import { cryptoAPI } from '../services/api';

export const useCryptoData = () => {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchCoins = useCallback(async (pageNum = 1, currency = 'usd') => {
    try {
      setLoading(true);
      setError(null);
      const response = await cryptoAPI.getTopCoins({ page: pageNum, perPage: 50, currency });
      setCoins(response.data.coins);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch cryptocurrency data');
    } finally {
      setLoading(false);
    }
  }, []);

  const nextPage = () => {
    const newPage = page + 1;
    setPage(newPage);
    fetchCoins(newPage);
  };

  const prevPage = () => {
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      fetchCoins(newPage);
    }
  };

  return {
    coins,
    loading,
    error,
    page,
    fetchCoins,
    nextPage,
    prevPage,
  };
};

export const useCoinDetails = (coinId) => {
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCoinDetails = useCallback(async (id = coinId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await cryptoAPI.getCoinDetails(id);
      setCoin(response.data.coin);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch coin details');
    } finally {
      setLoading(false);
    }
  }, [coinId]);

  useEffect(() => {
    if (coinId) {
      fetchCoinDetails();
    }
  }, [coinId, fetchCoinDetails]);

  return { coin, loading, error, fetchCoinDetails };
};

export const useCoinChart = (coinId, days = 7) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchChartData = useCallback(async (id = coinId, chartDays = days) => {
    try {
      setLoading(true);
      setError(null);
      const response = await cryptoAPI.getCoinChart(id, { days: chartDays });
      setChartData(response.data.chartData);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch chart data');
    } finally {
      setLoading(false);
    }
  }, [coinId, days]);

  useEffect(() => {
    if (coinId) {
      fetchChartData();
    }
  }, [coinId, days, fetchChartData]);

  return { chartData, loading, error, fetchChartData };
};

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWatchlist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await cryptoAPI.getWatchlist();
      setWatchlist(response.data.watchlist);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch watchlist');
    } finally {
      setLoading(false);
    }
  }, []);

  const addToWatchlist = async (coinId) => {
    try {
      await cryptoAPI.addToWatchlist(coinId);
      await fetchWatchlist();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to add to watchlist'
      };
    }
  };

  const removeFromWatchlist = async (coinId) => {
    try {
      await cryptoAPI.removeFromWatchlist(coinId);
      await fetchWatchlist();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to remove from watchlist'
      };
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  return {
    watchlist,
    loading,
    error,
    fetchWatchlist,
    addToWatchlist,
    removeFromWatchlist,
  };
};

export const useAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await cryptoAPI.getAlerts();
      setAlerts(response.data.alerts);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  const createAlert = async (alertData) => {
    try {
      await cryptoAPI.createAlert(alertData);
      await fetchAlerts();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to create alert'
      };
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      await cryptoAPI.deleteAlert(alertId);
      setAlerts(alerts.filter(alert => alert._id !== alertId));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to delete alert'
      };
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    loading,
    error,
    fetchAlerts,
    createAlert,
    deleteAlert,
  };
};