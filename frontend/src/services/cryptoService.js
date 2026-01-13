import axios from 'axios';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

const cryptoService = {
    getTrending: async () => {
        try {
            const response = await axios.get(`${COINGECKO_API_URL}/search/trending`);
            return response.data;
        } catch (error) {
            console.error('Error fetching trending coins:', error);
            throw error;
        }
    },

    getMarketData: async (currency = 'usd', order = 'market_cap_desc', perPage = 10, page = 1) => {
        try {
            const response = await axios.get(`${COINGECKO_API_URL}/coins/markets`, {
                params: {
                    vs_currency: currency,
                    order: order,
                    per_page: perPage,
                    page: page,
                    sparkline: true,
                    price_change_percentage: '1h,24h,7d'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching market data:', error);
            throw error;
        }
    },

    getCoinDetails: async (id) => {
        try {
            const response = await axios.get(`${COINGECKO_API_URL}/coins/${id}`, {
                params: {
                    localization: false,
                    tickers: false,
                    market_data: true,
                    community_data: false,
                    developer_data: false,
                    sparkline: true
                }
            });
            return response.data;
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
