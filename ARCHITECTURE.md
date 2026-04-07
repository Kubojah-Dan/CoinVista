# CoinVista Architecture

## Overview

CoinVista is a React + Spring Boot + MongoDB application built around five product pillars:

1. Live market discovery
2. Portfolio analytics
3. Paper trading simulation
4. AI-flavored market intelligence
5. Secure account/session management

The current codebase no longer uses the old Express backend described in previous docs. The active backend is the Spring Boot application in [`backend2/`](./backend2).

## High-Level Topology

```text
┌────────────────────────────────────────────────────────────────────┐
│                           React Frontend                          │
│                                                                    │
│  Routes                                                            │
│  - /                         Home / recruiter-facing landing        │
│  - /login, /signup          Auth + social sign-in handoff          │
│  - /dashboard               Portfolio + market overview            │
│  - /coin/:id                Market intelligence + comparison       │
│  - /alerts                  Server-side alert management           │
│  - /simulator               Paper trading workspace                │
│  - /settings                2FA, privacy, account controls         │
│                                                                    │
│  Frontend services                                                 │
│  - authAPI / cryptoAPI / portfolioAPI / paperTradingAPI            │
│  - in-memory access token                                          │
│  - refresh-cookie bootstrap + 401 refresh retry                    │
│  - STOMP/SockJS live price subscriptions                           │
└───────────────────────────────┬────────────────────────────────────┘
                                │ HTTPS / REST / WebSocket
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                      Spring Boot Backend (backend2)                │
│                                                                    │
│  Security                                                          │
│  - JWT access tokens                                               │
│  - rotated refresh sessions stored in MongoDB                      │
│  - refresh token cookie                                             │
│  - TOTP 2FA                                                         │
│  - OAuth flows for Google / GitHub / Facebook                      │
│                                                                    │
│  Core API groups                                                   │
│  - /api/auth                Session + account lifecycle            │
│  - /api/crypto              CoinGecko markets, alerts, watchlist   │
│  - /api/holdings            Encrypted holdings CRUD                │
│  - /api/portfolio           Summary + CSV export                   │
│  - /api/paper-trading       Simulator trades + ledger              │
│  - /api/intelligence        Forecast + sentiment + anomaly bundle  │
│  - /ws                      Live price topics                      │
│                                                                    │
│  Scheduled services                                                │
│  - PriceUpdateService      Broadcasts tracked market prices        │
│  - AlertMonitorService     Evaluates alert thresholds offline      │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                              MongoDB                               │
│                                                                    │
│  Collections                                                       │
│  - users                                                           │
│  - holdings                                                        │
│  - alerts                                                          │
│  - refresh_sessions                                                │
│  - paper_trades                                                    │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                      External / Optional Providers                 │
│                                                                    │
│  - CoinGecko      Market data + historical charts                 │
│  - CryptoPanic    News feed enrichment                            │
│  - GNews          News feed enrichment                            │
│  - SendGrid       Alert emails                                    │
│  - Google OAuth   Social authentication                           │
│  - GitHub OAuth   Social authentication                           │
│  - Facebook OAuth Social authentication                           │
└────────────────────────────────────────────────────────────────────┘
```

## Domain Model

### `User`

Stores identity and personalization:

- email / password
- `authProvider` + `providerId`
- `privacyModeEnabled`
- `emailNotificationsEnabled`
- `twoFactorEnabled`
- encrypted/pending TOTP secrets
- connected wallet address
- paper trading starting balance + cash balance
- watchlist + alert ids

### `Holding`

Represents tracked portfolio holdings:

- `coinId`, `symbol`, `name`
- encrypted amount
- encrypted purchase price
- optional notes
- entry date

The app still keeps plaintext numeric fields for backwards compatibility, but new writes also persist encrypted copies for sensitive values.

### `Alert`

Represents server-side alert rules:

- coin metadata
- target price
- direction (`above` / `below`)
- triggered state
- triggered price / timestamps
- notification send timestamp

### `RefreshSession`

Represents a refresh-token family record:

- token hash
- user id
- user agent / IP
- expiry
- revocation timestamp

### `PaperTrade`

Represents simulator transactions:

- coin metadata
- side (`buy` / `sell`)
- quantity
- execution price
- total value
- realized PnL
- timestamp

## Backend Module Breakdown

### Auth & Session Layer

Key classes:

- [`AuthController`](./backend2/src/main/java/com/coinvista/backend/controller/AuthController.java)
- [`AuthService`](./backend2/src/main/java/com/coinvista/backend/service/AuthService.java)
- [`JwtUtil`](./backend2/src/main/java/com/coinvista/backend/security/JwtUtil.java)
- [`JwtAuthFilter`](./backend2/src/main/java/com/coinvista/backend/security/JwtAuthFilter.java)
- [`OAuthService`](./backend2/src/main/java/com/coinvista/backend/service/OAuthService.java)
- [`TotpService`](./backend2/src/main/java/com/coinvista/backend/service/TotpService.java)

Responsibilities:

- registration/login
- refresh-session rotation
- logout
- account deletion
- user settings
- TOTP setup/verify/disable
- Google/GitHub/Facebook OAuth start + callback flows

### Portfolio Layer

Key classes:

- [`HoldingController`](./backend2/src/main/java/com/coinvista/backend/controller/HoldingController.java)
- [`HoldingService`](./backend2/src/main/java/com/coinvista/backend/service/HoldingService.java)
- [`PortfolioService`](./backend2/src/main/java/com/coinvista/backend/service/PortfolioService.java)
- [`CryptoSecurityService`](./backend2/src/main/java/com/coinvista/backend/service/CryptoSecurityService.java)

Responsibilities:

- hold encrypted position data
- compute current value / invested value / PnL / ROI
- calculate diversification score
- build allocation datasets
- export CSV portfolio report

### Alerting Layer

Key classes:

- [`AlertService`](./backend2/src/main/java/com/coinvista/backend/service/AlertService.java)
- [`AlertMonitorService`](./backend2/src/main/java/com/coinvista/backend/service/AlertMonitorService.java)
- [`NotificationService`](./backend2/src/main/java/com/coinvista/backend/service/NotificationService.java)

Responsibilities:

- CRUD for user alerts
- evaluate pending alerts every minute
- mark alerts triggered
- optionally send alert emails through SendGrid

### Intelligence Layer

Key classes:

- [`IntelligenceController`](./backend2/src/main/java/com/coinvista/backend/controller/IntelligenceController.java)
- [`MarketIntelligenceService`](./backend2/src/main/java/com/coinvista/backend/service/MarketIntelligenceService.java)
- [`NewsService`](./backend2/src/main/java/com/coinvista/backend/service/NewsService.java)

Responsibilities:

- fetch bundle of intelligence data for a coin
- compute experimental 24h forecast
- compute anomaly score using short-term z-scores
- compute sentiment from headlines + momentum
- load live headlines when APIs are configured

### Paper Trading Layer

Key classes:

- [`PaperTradingController`](./backend2/src/main/java/com/coinvista/backend/controller/PaperTradingController.java)
- [`PaperTradingService`](./backend2/src/main/java/com/coinvista/backend/service/PaperTradingService.java)

Responsibilities:

- maintain virtual cash balance
- execute simulated buys/sells using live market prices
- calculate open positions and average cost
- track realized and unrealized PnL
- reset simulator back to the seed balance

## Request Flows

### 1. Secure Login Flow

```text
Frontend login form
  -> POST /api/auth/login
  -> access token returned in JSON
  -> refresh token stored in httpOnly cookie
  -> React keeps access token in memory
  -> when 401 occurs, frontend calls /api/auth/refresh
  -> backend rotates refresh session and returns a fresh access token
```

If the account has 2FA enabled:

```text
POST /api/auth/login without TOTP
  -> 202 Accepted with twoFactorRequired=true
  -> user enters authenticator code
  -> POST /api/auth/login with totpCode
  -> session issued
```

### 2. Social Login Flow

```text
Frontend social button
  -> GET /api/auth/oauth/{provider}/start
  -> backend sets state cookies + redirects to provider
  -> provider redirects back to /api/auth/oauth/{provider}/callback
  -> backend exchanges code, loads profile, upserts user, sets refresh cookie
  -> backend redirects frontend to /login?oauth=success
  -> frontend bootstraps session via /api/auth/refresh
```

### 3. Portfolio Dashboard Flow

```text
Dashboard mounts
  -> GET /api/portfolio/summary
  -> backend decrypts holdings and enriches them with CoinGecko prices
  -> frontend renders portfolio cards, allocation chart, and holdings table
```

### 4. Coin Intelligence Flow

```text
Coin page mounts
  -> GET /api/crypto/coins/{id}
  -> GET /api/crypto/coins/{id}/chart
  -> GET /api/intelligence/{id}
  -> backend builds forecast, anomaly, sentiment, and optional news
  -> frontend renders the research-oriented coin page
```

### 5. Alert Monitoring Flow

```text
User creates alert
  -> alert stored in MongoDB
  -> AlertMonitorService runs every 60s
  -> pending alerts grouped by coin id
  -> current prices fetched from CoinGecko
  -> triggered alerts are updated
  -> optional SendGrid email dispatched
```

## Frontend Architecture

### State & Data Access

- `AuthContext` owns login/register/bootstrap/logout/settings/2FA logic
- `services/api.js` centralizes axios clients and refresh retry logic
- feature-specific API namespaces keep data access readable

### Page Responsibilities

- `Dashboard.jsx` combines portfolio summary, wallet connection, export, and market cards
- `CoinDetail.jsx` is the intelligence page for forecasting, anomaly detection, sentiment, and comparison charts
- `PaperTrading.jsx` exposes the simulator workflow
- `Settings.jsx` holds privacy, 2FA, and account lifecycle actions

### Real-Time Layer

The frontend uses STOMP + SockJS to subscribe to `/topic/prices`, which is fed by Spring’s scheduled `PriceUpdateService`.

## External Integration Contract

### Required

- MongoDB connection string
- CoinGecko API key
- JWT secret
- encryption key

### Optional

- CryptoPanic or GNews API key for live news ingestion
- SendGrid API key + sender email for alert notifications
- Google / GitHub / Facebook client credentials for social auth
- MoonPay / Transak sandbox URLs for UI buy-crypto links

## Notes on ML

The live app currently serves experimental forecasting from the Spring Boot intelligence layer and checks whether processed local datasets exist in [`data/processed/`](./data/processed).

The Python scripts in [`scripts/`](./scripts) remain the offline experimentation path for:

- ETL / dataset generation
- feature engineering
- model comparison
- future export of richer model artifacts into the app

## Verification Status

- Frontend build verified with `npm run build`
- Backend compile could not be confirmed in this sandbox because Maven was pinned to an inaccessible global repository path outside the workspace

