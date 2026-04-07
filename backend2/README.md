# CoinVista Spring Boot Backend

Runs on port **5000** 

## Prerequisites

- Java 17+
- Maven 3.8+
- MongoDB running on `localhost:27017`

## Run

```powershell
# From backend2/
mvn spring-boot:run

# Or build a jar first
mvn clean package -DskipTests
java -jar target/backend-1.0.0.jar
```


```powershell
$env:MONGODB_URI="mongodb://127.0.0.1:27017/coinvista"
$env:JWT_SECRET
$env:COINGECKO_API_KEY"
mvn spring-boot:run
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Register |
| POST | /api/auth/login | No | Login |
| GET | /api/crypto/coins/top | No | Top coins |
| GET | /api/crypto/coins/:id | No | Coin details |
| GET | /api/crypto/coins/:id/chart | No | Price chart |
| GET | /api/crypto/search | No | Search |
| GET | /api/crypto/trending | No | Trending |
| GET | /api/crypto/global | No | Global data |
| GET | /api/crypto/watchlist | Yes | Get watchlist |
| POST | /api/crypto/watchlist | Yes | Add to watchlist |
| DELETE | /api/crypto/watchlist/:coinId | Yes | Remove from watchlist |
| GET | /api/crypto/alerts | Yes | Get alerts |
| POST | /api/crypto/alerts | Yes | Create alert |
| DELETE | /api/crypto/alerts/:alertId | Yes | Delete alert |
| GET | /api/alerts | Yes | Get alerts (alt route) |
| POST | /api/alerts | Yes | Create alert (alt route) |
| DELETE | /api/alerts/:id | Yes | Delete alert (alt route) |
| GET | /api/holdings | Yes | Get holdings |
| POST | /api/holdings | Yes | Create holding |
| DELETE | /api/holdings/:id | Yes | Delete holding |
| GET | /health | No | Backend health check |

## WebSocket

- Endpoint: `ws://localhost:5000/ws`
- Price broadcast topic: `/topic/prices` (every 30 seconds)
- Per-coin topic: `/topic/coin/{coinId}`


## Project Structure

```
src/main/java/com/coinvista/backend/
├── CoinVistaApplication.java
├── config/
│   ├── SecurityConfig.java
│   ├── WebClientConfig.java
│   └── WebSocketConfig.java
├── controller/
│   ├── AuthController.java
│   ├── AlertController.java
│   ├── CryptoController.java
│   ├── HoldingController.java
│   └── HealthController.java
├── dto/
│   ├── AuthDto.java
│   ├── AlertDto.java
│   └── HoldingDto.java
├── exception/
│   └── GlobalExceptionHandler.java
├── model/
│   ├── User.java
│   ├── Alert.java
│   └── Holding.java
├── repository/
│   ├── UserRepository.java
│   ├── AlertRepository.java
│   └── HoldingRepository.java
├── security/
│   ├── JwtUtil.java
│   └── JwtAuthFilter.java
└── service/
    ├── AuthService.java
    ├── AlertService.java
    ├── CoinGeckoService.java
    ├── HoldingService.java
    ├── PriceUpdateService.java
    └── WatchlistService.java
```
