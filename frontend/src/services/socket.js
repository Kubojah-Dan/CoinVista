import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let stompClient = null;

export const connectSocket = ({ onConnect, onDisconnect, onError } = {}) => {
  if (stompClient && stompClient.connected) {
    stompClient.deactivate();
  }

  stompClient = new Client({
    webSocketFactory: () => new SockJS(`${SOCKET_URL}/ws`),
    reconnectDelay: 5000,
    onConnect: () => {
      console.log('Connected to WebSocket server');
      onConnect?.(stompClient);
    },
    onDisconnect: () => {
      console.log('Disconnected from WebSocket server');
      onDisconnect?.();
    },
    onStompError: (frame) => {
      console.error('STOMP error:', frame);
      onError?.(frame);
    },
  });

  stompClient.activate();
  return stompClient;
};

export const subscribeToCoin = (coinId) => {
  // Spring Boot broadcasts on /topic/coin/:coinId — no emit needed, just subscribe
};

export const unsubscribeFromCoin = (coinId) => {
  // Handled by component-level unsubscribe
};

export const onPriceUpdates = (callback) => {
  if (stompClient) {
    return stompClient.subscribe('/topic/prices', (message) => {
      callback(JSON.parse(message.body));
    });
  }
};

export const onCoinPriceUpdate = (coinId, callback) => {
  if (stompClient) {
    return stompClient.subscribe(`/topic/coin/${coinId}`, (message) => {
      callback(JSON.parse(message.body));
    });
  }
};

export const disconnectSocket = () => {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
};

export const getSocket = () => stompClient;
