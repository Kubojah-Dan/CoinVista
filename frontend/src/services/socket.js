import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const connectSocket = (userId) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    console.log('Connected to socket server');
    if (userId) {
      socket.emit('join', userId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from socket server');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const subscribeToCoin = (coinId) => {
  if (socket) {
    socket.emit('subscribe-to-coin', coinId);
  }
};

export const unsubscribeFromCoin = (coinId) => {
  if (socket) {
    socket.emit('unsubscribe-from-coin', coinId);
  }
};

export const onPriceUpdates = (callback) => {
  if (socket) {
    socket.on('price-updates', callback);
  }
};

export const onCoinPriceUpdate = (callback) => {
  if (socket) {
    socket.on('coin-price-update', callback);
  }
};

export const onAlertTriggered = (callback) => {
  if (socket) {
    socket.on('alert-triggered', callback);
  }
};

export const onNotification = (callback) => {
  if (socket) {
    socket.on('notification', callback);
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;