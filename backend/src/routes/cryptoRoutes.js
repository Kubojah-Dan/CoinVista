const express = require('express');
const router = express.Router();
const cryptoController = require('../controllers/cryptoController');
const auth = require('../middleware/auth');

// Public routes
router.get('/coins/top', cryptoController.getTopCoins);
router.get('/coins/:id', cryptoController.getCoinDetails);
router.get('/coins/:id/chart', cryptoController.getCoinChart);
router.get('/search', cryptoController.searchCoins);
router.get('/trending', cryptoController.getTrendingCoins);
router.get('/global', cryptoController.getGlobalData);

// Protected routes
router.get('/watchlist', auth, cryptoController.getWatchlist);
router.post('/watchlist', auth, cryptoController.addToWatchlist);
router.delete('/watchlist/:coinId', auth, cryptoController.removeFromWatchlist);
router.get('/alerts', auth, cryptoController.getAlerts);
router.post('/alerts', auth, cryptoController.createAlert);
router.delete('/alerts/:alertId', auth, cryptoController.deleteAlert);

module.exports = router;