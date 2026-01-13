const coingeckoService = require('../services/coingeckoService');
const Alert = require('../models/Alert');
const User = require('../models/User');

class SocketManager {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.setupSocketHandlers();
    this.startPriceUpdates();
    this.startAlertChecker();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Handle user joining with their user ID
      socket.on('join', (userId) => {
        console.log('User joined:', userId);
        this.connectedUsers.set(socket.id, userId);
        socket.join(`user-${userId}`);
      });

      // Handle user disconnecting
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        this.connectedUsers.delete(socket.id);
      });

      // Handle room subscriptions (e.g., coin-specific updates)
      socket.on('subscribe-to-coin', (coinId) => {
        socket.join(`coin-${coinId}`);
        console.log(`User ${socket.id} subscribed to coin ${coinId}`);
      });

      // Handle room unsubscriptions
      socket.on('unsubscribe-from-coin', (coinId) => {
        socket.leave(`coin-${coinId}`);
        console.log(`User ${socket.id} unsubscribed from coin ${coinId}`);
      });
    });
  }

  // Start periodic price updates
  startPriceUpdates() {
    // Update prices every 30 seconds
    setInterval(async () => {
      try {
        // Get top 50 coins
        const coins = await coingeckoService.getTopCoins('usd', 1, 50);

        // Emit price updates to all connected clients
        this.io.emit('price-updates', {
          coins: coins.map(coin => ({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            current_price: coin.current_price,
            price_change_percentage_24h: coin.price_change_percentage_24h,
            market_cap: coin.market_cap,
            last_updated: coin.last_updated
          })),
          timestamp: new Date().toISOString()
        });

        // Emit updates to specific coin rooms
        coins.forEach(coin => {
          this.io.to(`coin-${coin.id}`).emit('coin-price-update', {
            id: coin.id,
            current_price: coin.current_price,
            price_change_percentage_24h: coin.price_change_percentage_24h,
            last_updated: coin.last_updated
          });
        });
      } catch (error) {
        console.error('Error in price updates:', error);
      }
    }, 30000); // 30 seconds
  }

  // Check for triggered alerts
  startAlertChecker() {
    // Check alerts every minute
    setInterval(async () => {
      try {
        // Get all active alerts
        const activeAlerts = await Alert.find({ isActive: true, notified: false });

        if (activeAlerts.length === 0) return;

        // Get unique coin IDs
        const coinIds = [...new Set(activeAlerts.map(alert => alert.coinId))];

        // Get current prices for these coins
        const coinPrices = await coingeckoService.getCoinsPrices(coinIds);

        // Create a price lookup map
        const priceMap = {};
        coinPrices.forEach(coin => {
          priceMap[coin.id] = coin.current_price;
        });

        // Check each alert
        for (const alert of activeAlerts) {
          const currentPrice = priceMap[alert.coinId];

          if (!currentPrice) continue;

          let triggered = false;

          if (alert.condition === 'above' && currentPrice >= alert.targetPrice) {
            triggered = true;
          } else if (alert.condition === 'below' && currentPrice <= alert.targetPrice) {
            triggered = true;
          }

          if (triggered) {
            // Update alert
            alert.currentPrice = currentPrice;
            alert.triggeredAt = new Date();
            alert.notified = true;
            await alert.save();

            // Send notification to user
            this.io.to(`user-${alert.user}`).emit('alert-triggered', {
              alert: {
                id: alert._id,
                coinName: alert.coinName,
                coinSymbol: alert.coinSymbol,
                condition: alert.condition,
                targetPrice: alert.targetPrice,
                currentPrice: currentPrice,
                triggeredAt: alert.triggeredAt
              }
            });

            console.log(`Alert triggered for user ${alert.user}: ${alert.coinName} ${alert.condition} ${alert.targetPrice}`);
          }
        }
      } catch (error) {
        console.error('Error checking alerts:', error);
      }
    }, 60000); // 1 minute
  }

  // Emit real-time notification to specific user
  notifyUser(userId, notification) {
    this.io.to(`user-${userId}`).emit('notification', notification);
  }
}

module.exports = SocketManager;