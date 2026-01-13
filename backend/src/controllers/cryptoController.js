const coingeckoService = require('../services/coingeckoService');
const User = require('../models/User');
const Alert = require('../models/Alert');

// Get top cryptocurrencies
exports.getTopCoins = async (req, res) => {
  try {
    const { page = 1, perPage = 50, currency = 'usd' } = req.query;

    // Get user's preferred currency if authenticated
    let preferredCurrency = currency;
    if (req.user) {
      const user = await User.findById(req.user.userId);
      if (user && user.preferences.currency) {
        preferredCurrency = user.preferences.currency;
      }
    }

    const coins = await coingeckoService.getTopCoins(preferredCurrency, page, perPage);
    res.json({ coins, currency: preferredCurrency });
  } catch (error) {
    console.error('Get top coins error:', error);
    res.status(500).json({ message: 'Failed to fetch cryptocurrencies' });
  }
};

// Get coin details
exports.getCoinDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const coin = await coingeckoService.getCoinDetails(id);
    res.json({ coin });
  } catch (error) {
    console.error('Get coin details error:', error);
    res.status(500).json({ message: 'Failed to fetch coin details' });
  }
};

// Get coin chart data
exports.getCoinChart = async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 7, currency = 'usd' } = req.query;

    // Get user's preferred currency if authenticated
    let preferredCurrency = currency;
    if (req.user) {
      const user = await User.findById(req.user.userId);
      if (user && user.preferences.currency) {
        preferredCurrency = user.preferences.currency;
      }
    }

    const chartData = await coingeckoService.getCoinChart(id, preferredCurrency, days);
    res.json({ chartData, currency: preferredCurrency });
  } catch (error) {
    console.error('Get coin chart error:', error);
    res.status(500).json({ message: 'Failed to fetch chart data' });
  }
};

// Search coins
exports.searchCoins = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const results = await coingeckoService.searchCoins(query);
    res.json({ results });
  } catch (error) {
    console.error('Search coins error:', error);
    res.status(500).json({ message: 'Failed to search coins' });
  }
};

// Get trending coins
exports.getTrendingCoins = async (req, res) => {
  try {
    const trending = await coingeckoService.getTrendingCoins();
    res.json({ trending });
  } catch (error) {
    console.error('Get trending coins error:', error);
    res.status(500).json({ message: 'Failed to fetch trending coins' });
  }
};

// Get global market data
exports.getGlobalData = async (req, res) => {
  try {
    const { currency = 'usd' } = req.query;
    const globalData = await coingeckoService.getGlobalData(currency);
    res.json({ globalData });
  } catch (error) {
    console.error('Get global data error:', error);
    res.status(500).json({ message: 'Failed to fetch global market data' });
  }
};

// Get user's watchlist
exports.getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user.watchlist || user.watchlist.length === 0) {
      return res.json({ watchlist: [] });
    }

    // Get detailed data for watchlist coins
    const coins = await coingeckoService.getCoinsPrices(user.watchlist);
    res.json({ watchlist: coins });
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ message: 'Failed to fetch watchlist' });
  }
};

// Add coin to watchlist
exports.addToWatchlist = async (req, res) => {
  try {
    const { coinId } = req.body;
    if (!coinId) {
      return res.status(400).json({ message: 'Coin ID is required' });
    }

    const user = await User.findById(req.user.userId);
    if (user.watchlist.includes(coinId)) {
      return res.status(400).json({ message: 'Coin already in watchlist' });
    }

    user.watchlist.push(coinId);
    await user.save();

    // Get updated watchlist with coin details
    const coins = await coingeckoService.getCoinsPrices(user.watchlist);
    res.json({ message: 'Added to watchlist', watchlist: coins });
  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({ message: 'Failed to add to watchlist' });
  }
};

// Remove coin from watchlist
exports.removeFromWatchlist = async (req, res) => {
  try {
    const { coinId } = req.params;

    const user = await User.findById(req.user.userId);
    user.watchlist = user.watchlist.filter(id => id !== coinId);
    await user.save();

    // Get updated watchlist with coin details
    const coins = await coingeckoService.getCoinsPrices(user.watchlist);
    res.json({ message: 'Removed from watchlist', watchlist: coins });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({ message: 'Failed to remove from watchlist' });
  }
};

// Create alert
exports.createAlert = async (req, res) => {
  try {
    const { coinId, coinName, coinSymbol, condition, targetPrice } = req.body;

    if (!coinId || !coinName || !coinSymbol || !condition || !targetPrice) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const alert = new Alert({
      user: req.user.userId,
      coinId,
      coinName,
      coinSymbol,
      condition,
      targetPrice
    });

    await alert.save();

    // Add alert to user's alerts array
    const user = await User.findById(req.user.userId);
    user.alerts.push(alert._id);
    await user.save();

    res.status(201).json({ message: 'Alert created successfully', alert });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ message: 'Failed to create alert' });
  }
};

// Get user's alerts
exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ user: req.user.userId })
      .sort({ createdAt: -1 });
    res.json({ alerts });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ message: 'Failed to fetch alerts' });
  }
};

// Delete alert
exports.deleteAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await Alert.findOneAndDelete({
      _id: alertId,
      user: req.user.userId
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    // Remove alert from user's alerts array
    const user = await User.findById(req.user.userId);
    user.alerts = user.alerts.filter(id => id.toString() !== alertId);
    await user.save();

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ message: 'Failed to delete alert' });
  }
};