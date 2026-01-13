# CoinVista API Reference

Complete API documentation for CoinVista backend endpoints.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### Authentication Endpoints

#### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "username": "johndoe",
    "email": "john@example.com",
    "preferences": {
      "currency": "usd",
      "theme": "dark"
    }
  }
}
```

#### Login User

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "username": "johndoe",
    "email": "john@example.com",
    "preferences": {
      "currency": "usd",
      "theme": "dark"
    }
  }
}
```

#### Get User Profile (Protected)

```http
GET /api/auth/profile
Authorization: Bearer <token>
```

**Response:**

```json
{
  "user": {
    "_id": "user_id",
    "username": "johndoe",
    "email": "john@example.com",
    "watchlist": ["bitcoin", "ethereum"],
    "preferences": {
      "currency": "usd",
      "theme": "dark"
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update User Preferences (Protected)

```http
PUT /api/auth/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "currency": "eur",
  "theme": "light"
}
```

**Response:**

```json
{
  "message": "Preferences updated successfully",
  "user": {
    "_id": "user_id",
    "username": "johndoe",
    "email": "john@example.com",
    "preferences": {
      "currency": "eur",
      "theme": "light"
    }
  }
}
```

### Cryptocurrency Endpoints

#### Get Top Cryptocurrencies (Public)

```http
GET /api/crypto/coins/top?page=1&perPage=50¤cy=usd
```

**Query Parameters:**

-   `page` (number, optional): Page number (default: 1)
-   `perPage` (number, optional): Items per page (default: 50)
-   `currency` (string, optional): Currency code (default: 'usd')

**Response:**

```json
{
  "coins": [
    {
      "id": "bitcoin",
      "symbol": "btc",
      "name": "Bitcoin",
      "image": "https://assets.coingecko.com/...",
      "current_price": 50000,
      "market_cap": 1000000000000,
      "market_cap_rank": 1,
      "price_change_percentage_24h": 2.5,
      "high_24h": 51000,
      "low_24h": 49000,
      "last_updated": "2024-01-01T00:00:00.000Z"
    }
  ],
  "currency": "usd"
}
```

#### Get Coin Details (Public)

```http
GET /api/crypto/coins/:coinId
```

**Example:**

```http
GET /api/crypto/coins/bitcoin
```

**Response:**

```json
{
  "coin": {
    "id": "bitcoin",
    "symbol": "btc",
    "name": "Bitcoin",
    "image": {
      "thumb": "https://...",
      "small": "https://...",
      "large": "https://..."
    },
    "market_data": {
      "current_price": {
        "usd": 50000
      },
      "market_cap": {
        "usd": 1000000000000
      },
      "price_change_percentage_24h": 2.5,
      "high_24h": {
        "usd": 51000
      },
      "low_24h": {
        "usd": 49000
      },
      "ath": {
        "usd": 69000
      },
      "atl": {
        "usd": 67
      },
      "circulating_supply": 19000000,
      "total_supply": 21000000,
      "max_supply": 21000000
    },
    "description": {
      "en": "Bitcoin is a decentralized cryptocurrency..."
    },
    "links": {
      "homepage": ["https://bitcoin.org"]
    },
    "market_cap_rank": 1
  }
}
```

#### Get Coin Chart Data (Public)

```http
GET /api/crypto/coins/:coinId/chart?days=7¤cy=usd
```

**Query Parameters:**

-   `days` (number, optional): Time range in days (default: 7)
    -   Options: 1, 7, 14, 30, 90, 365
-   `currency` (string, optional): Currency code (default: 'usd')

**Example:**

```http
GET /api/crypto/coins/bitcoin/chart?days=30
```

**Response:**

```json
{
  "chartData": {
    "prices": [
      [1609459200000, 50000],
      [1609545600000, 51000]
    ],
    "market_caps": [
      [1609459200000, 1000000000000],
      [1609545600000, 1010000000000]
    ],
    "total_volumes": [
      [1609459200000, 50000000000],
      [1609545600000, 52000000000]
    ],
    "currency": "usd"
  }
}
```

#### Search Coins (Public)

```http
GET /api/crypto/search?query=bitcoin
```

**Query Parameters:**

-   `query` (string, required): Search query

**Response:**

```json
{
  "results": {
    "coins": [
      {
        "id": "bitcoin",
        "name": "Bitcoin",
        "symbol": "btc",
        "thumb": "https://...",
        "market_cap_rank": 1
      }
    ]
  }
}
```

#### Get Trending Coins (Public)

```http
GET /api/crypto/trending
```

**Response:**

```json
{
  "trending": {
    "coins": [
      {
        "item": {
          "id": "bitcoin",
          "name": "Bitcoin",
          "symbol": "btc",
          "small": "https://...",
          "price_btc": 1,
          "score": 1000
        }
      }
    ]
  }
}
```

#### Get Global Market Data (Public)

```http
GET /api/crypto/global?currency=usd
```

**Query Parameters:**

-   `currency` (string, optional): Currency code (default: 'usd')

**Response:**

```json
{
  "globalData": {
    "total_market_cap": {
      "usd": 2000000000000
    },
    "total_volume": {
      "usd": 100000000000
    },
    "market_cap_percentage": {
      "btc": 50,
      "eth": 20
    },
    "market_cap_change_percentage_24h_usd": 2.5,
    "active_cryptocurrencies": 10000
  }
}
```

### Watchlist Endpoints (Protected)

#### Get Watchlist

```http
GET /api/crypto/watchlist
Authorization: Bearer <token>
```

**Response:**

```json
{
  "watchlist": [
    {
      "id": "bitcoin",
      "symbol": "btc",
      "name": "Bitcoin",
      "image": "https://...",
      "current_price": 50000,
      "price_change_percentage_24h": 2.5
    }
  ]
}
```

#### Add to Watchlist

```http
POST /api/crypto/watchlist
Authorization: Bearer <token>
Content-Type: application/json

{
  "coinId": "bitcoin"
}
```

**Response:**

```json
{
  "message": "Added to watchlist",
  "watchlist": [...]
}
```

#### Remove from Watchlist

```http
DELETE /api/crypto/watchlist/:coinId
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "Removed from watchlist",
  "watchlist": [...]
}
```

### Alert Endpoints (Protected)

#### Get Alerts

```http
GET /api/crypto/alerts
Authorization: Bearer <token>
```

**Response:**

```json
{
  "alerts": [
    {
      "_id": "alert_id",
      "coinId": "bitcoin",
      "coinName": "Bitcoin",
      "coinSymbol": "BTC",
      "condition": "above",
      "targetPrice": 55000,
      "currentPrice": 50000,
      "isActive": true,
      "notified": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Alert

```http
POST /api/crypto/alerts
Authorization: Bearer <token>
Content-Type: application/json

{
  "coinId": "bitcoin",
  "coinName": "Bitcoin",
  "coinSymbol": "BTC",
  "condition": "above",
  "targetPrice": 55000
}
```

**Parameters:**

-   `coinId` (string, required): Coin identifier
-   `coinName` (string, required): Coin name
-   `coinSymbol` (string, required): Coin symbol
-   `condition` (string, required): "above" or "below"
-   `targetPrice` (number, required): Target price to trigger alert

**Response:**

```json
{
  "message": "Alert created successfully",
  "alert": {
    "_id": "alert_id",
    "coinId": "bitcoin",
    "coinName": "Bitcoin",
    "coinSymbol": "BTC",
    "condition": "above",
    "targetPrice": 55000,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Delete Alert

```http
DELETE /api/crypto/alerts/:alertId
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "Alert deleted successfully"
}
```

## Socket.IO Events

### Connection

**Client → Server:**

```javascript
socket.emit('join', userId);
```

**Server → Client:**

```javascript
socket.emit('connected');
```

### Subscribe to Coin

**Client → Server:**

```javascript
socket.emit('subscribe-to-coin', 'bitcoin');
```

**Client → Server:**

```javascript
socket.emit('unsubscribe-from-coin', 'bitcoin');
```

### Price Updates

**Server → Client (All coins):**

```javascript
socket.on('price-updates', (data) => {
  // data.coins: Array of top 50 coins with updated prices
  // data.timestamp: ISO timestamp
});
```

**Server → Client (Specific coin):**

```javascript
socket.on('coin-price-update', (data) => {
  // data.id: Coin ID
  // data.current_price: Current price
  // data.price_change_percentage_24h: 24h change
  // data.last_updated: Last update timestamp
});
```

### Alert Notifications

**Server → Client:**

```javascript
socket.on('alert-triggered', (data) => {
  // data.alert: Triggered alert object
});
```

**Server → Client:**

```javascript
socket.on('notification', (notification) => {
  // notification: Notification object
});
```

## Error Responses

All errors follow this format:

```json
{
  "message": "Error description"
}
```

### Common Error Codes

-   `400`: Bad Request - Invalid input or missing required fields
-   `401`: Unauthorized - Missing or invalid token
-   `404`: Not Found - Resource not found
-   `429`: Too Many Requests - Rate limit exceeded
-   `500`: Internal Server Error - Server error

## Rate Limiting

-   API requests: 100 requests per 15 minutes per IP
-   CoinGecko API: 50 requests per minute (free tier)

## Data Caching

-   Price updates: Cached for 30 seconds
-   Coin details: Cached for 5 minutes
-   Global data: Cached for 1 minute

## Pagination

For endpoints that return large datasets, use pagination:

```http
GET /api/crypto/coins/top?page=2&perPage=50
```

-   `page`: Page number (starts at 1)
-   `perPage`: Number of items per page (max: 250)

## Currency Support

Supported currencies:

-   `usd` - US Dollar
-   `eur` - Euro
-   `btc` - Bitcoin
-   And many more supported by CoinGecko API

* * *

**Last Updated:** 2024 **API Version:** 1.0.0