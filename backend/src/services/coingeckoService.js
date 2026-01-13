const axios = require('axios');

class CoinGeckoService {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.apiKey = process.env.COINGECKO_API_KEY;
    this.headers = {
      'x-cg-demo-api-key': this.apiKey
    };
  }

  // Get top cryptocurrencies with market data
  async getTopCoins(currency = 'usd', page = 1, perPage = 50) {
    try {
      const response = await axios.get(`${this.baseURL}/coins/markets`, {
        headers: this.headers,
        params: {
          vs_currency: currency,
          order: 'market_cap_desc',
          per_page: perPage,
          page: page,
          sparkline: false
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching top coins:', error.message);
      throw new Error('Failed to fetch cryptocurrency data');
    }
  }

  // Get coin details
  async getCoinDetails(coinId) {
    try {
      const response = await axios.get(`${this.baseURL}/coins/${coinId}`, {
        headers: this.headers,
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching coin details:', error.message);
      throw new Error('Failed to fetch coin details');
    }
  }

  // Get coin price chart data
  async getCoinChart(coinId, currency = 'usd', days = 7) {
    try {
      const response = await axios.get(`${this.baseURL}/coins/${coinId}/market_chart`, {
        headers: this.headers,
        params: {
          vs_currency: currency,
          days: days
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching coin chart:', error.message);
      throw new Error('Failed to fetch chart data');
    }
  }

  // Search coins
  async searchCoins(query) {
    try {
      const response = await axios.get(`${this.baseURL}/search`, {
        headers: this.headers,
        params: {
          query: query
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching coins:', error.message);
      throw new Error('Failed to search coins');
    }
  }

  // Get trending coins
  async getTrendingCoins() {
    try {
      const response = await axios.get(`${this.baseURL}/search/trending`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching trending coins:', error.message);
      throw new Error('Failed to fetch trending coins');
    }
  }

  // Get global market data
  async getGlobalData(currency = 'usd') {
    try {
      const response = await axios.get(`${this.baseURL}/global`, {
        headers: this.headers
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching global data:', error.message);
      throw new Error('Failed to fetch global market data');
    }
  }

  // Get multiple coins prices for alerts checking
  async getCoinsPrices(coinIds, currency = 'usd') {
    try {
      const response = await axios.get(`${this.baseURL}/coins/markets`, {
        headers: this.headers,
        params: {
          vs_currency: currency,
          ids: coinIds.join(','),
          sparkline: false
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching coins prices:', error.message);
      throw new Error('Failed to fetch coins prices');
    }
  }
}

module.exports = new CoinGeckoService();