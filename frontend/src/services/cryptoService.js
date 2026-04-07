import { cryptoAPI } from './api';

const cryptoService = {
    getTrending: async () => {
        try {
            const response = await cryptoAPI.getTrendingCoins();
            return response.data;
        } catch (error) {
            console.error('Error fetching trending coins:', error);
            throw error;
        }
    },

    getMarketData: async (currency = 'usd', order = 'market_cap_desc', perPage = 10, page = 1) => {
        try {
            const response = await cryptoAPI.getTopCoins({ page, perPage, currency });
            return response.data?.coins || [];
        } catch (error) {
            console.error('Error fetching market data:', error);
            throw error;
        }
    },

    getCoinDetails: async (id) => {
        try {
            const response = await cryptoAPI.getCoinDetails(id);
            return response.data?.coin || null;
        } catch (error) {
            console.error('Error fetching coin details:', error);
            throw error;
        }
    },

    // Helper to format chart data from sparkline
    formatChartData: (sparkline, label) => {
        return {
            labels: sparkline.map((_, index) => index),
            datasets: [
                {
                    label: label || 'Price',
                    data: sparkline,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.4
                }
            ]
        };
    }
};

export default cryptoService;
