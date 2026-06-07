# CoinVista 🚀

CoinVista is a premium, full-stack cryptocurrency intelligence platform and paper trading simulator. Built with a modern React frontend, a high-performance Java Spring Boot backend, and a Groq-powered FastAPI AI Agent, CoinVista delivers real-time blockchain indicators, advanced charting, automated trading execution, and social safety nets.

![CoinVista Version](https://img.shields.io/badge/version-2.0.0-blue.svg) ![License](https://img.shields.io/badge/license-MIT-green.svg)

<br/>

## ✨ Key Features

- 📊 **Advanced Candlestick Charts**: Built using **TradingView Lightweight Charts v5**, featuring live price updates, volume histogram overlays, support/resistance levels, Fibonacci retracements, and indicator overlays (EMA 20/50/200, Bollinger Bands).
- 🤖 **FastAPI AI Agent Assistant**: An autonomous quantitative analyst powered by **LangGraph** and **Groq (Llama 3.1 8B / 3.3 70B)**. The agent retrieves indicators, detects candlestick patterns, analyzes sentiment, and executes trades autonomously.
- 📈 **Pro Paper Trading Simulator**: Supports long/short margin trading, custom **Stop-Loss (SL)** and **Take-Profit (TP)** boundaries, strategy classifications, and key portfolio metrics (Sharpe Ratio, Max Drawdown, Win Rate).
- 🛡️ **Live Trading Safety Gate**: Safety gating prevents activation of live exchange trading until the user completes at least **30 paper trades** with a **win rate > 50%**. Live keys are fully AES-GCM encrypted.
- 🦊 **Web3 MetaMask Integration**: Connect native EVM wallets to view live ETH balances directly on the global Navbar and Settings page.
- 📰 **Sentiment Analytics**: Aggregates and scores live headlines from **CryptoPanic** (v1 REST API) and **GNews**, featuring a robust mock news fallback mechanism when third-party API quotas are exceeded.

<br/>

## 🛠️ Technology Stack

### Frontend (React)
- React 18 & React Router DOM
- TradingView Lightweight Charts (v5)
- Ethers.js / MetaMask Web3 Provider
- Tailwind CSS & DaisyUI
- Socket.IO Client (STOMP WebSockets)
- Lucide Icons

### Backend (Spring Boot)
- Java 17 / Spring Boot 3.2.0
- Spring Security & JWT Token Verification
- Spring Data MongoDB (State persistence)
- WebClient (Reactive HTTP requests)
- Spring WebSockets & STOMP Message Broker
- AES-256-GCM Exchange Credentials Encryption

### AI Agent Service (FastAPI)
- Python 3.9+ & FastAPI
- LangGraph (Agentic workflow graphs)
- LangChain Groq (Llama-3.1-8b-instant & Llama-3.3-70b-versatile)
- Technical Analysis Engine (Pandas, NumPy computations for EMA, SMA, VWAP, RSI, MACD, Stochastic, ATR, support/resistance, Fibonacci, and pattern recognition)

---

## 📁 Project Structure

```
coinvista/
├── backend2/            # Java Spring Boot Backend Service (Port 5000)
│   ├── src/main/java/   # Core logic: controllers, services, repositories, models
│   ├── src/main/resources/
│   │   └── application.properties # Application properties
│   └── pom.xml          # Maven dependencies
│
├── agent/               # FastAPI Python AI Agent Microservice (Port 8000)
│   ├── agents/          # LangGraph reactive agent structures
│   ├── analysis/        # Technical analysis calculations (ta_indicators.py)
│   ├── main.py          # FastAPI server entry point (SSE streaming endpoints)
│   └── requirements.txt # Python dependencies
│
├── frontend/            # React Frontend SPA (Port 3000)
│   ├── src/
│   │   ├── components/  # PriceChart (Lightweight Charts), AgentChat panel, Navbar
│   │   ├── pages/       # Dashboard, Settings (MetaMask), PaperTrading (Pro Simulator)
│   │   └── services/    # REST API endpoints & WebSocket listeners
│   └── package.json
│
├── docker-compose.yml   # Multi-service container orchestration
└── .env                 # Unified local environment configuration
```

---

## 🚀 Getting Started

### 📋 Prerequisites
Ensure you have the following installed:
- Java 17 or higher & Maven 3+
- Node.js (v18 or higher) & npm
- Python 3.9+ & virtualenv
- MongoDB (running locally on port `27017` or MongoDB Atlas URI)
- Groq API Key ([console.groq.com](https://console.groq.com/))

### 1. Environment Configurations
Create a `.env` file in the root directory:
```env
# MongoDB Connection
MONGODB_URI=mongodb://127.0.0.1:27017/coinvista

# JWT Authentication Config
JWT_SECRET=your_secure_32_byte_jwt_secret_key_here
JWT_ACCESS_EXPIRATION=900000
JWT_REFRESH_EXPIRATION=2592000000
ENCRYPTION_KEY=4a7f3b9c2e1d8a6f5c0b4e7d9a2f1c8b3e6d0a9f2c5b8e1d4a7f0c3b6e9d2a5
REFRESH_COOKIE_NAME=coinvista_refresh

# CORS Configurations
CORS_ORIGINS=http://localhost:3000

# Third-party APIs
COINGECKO_API_KEY=your_coingecko_api_key
CRYPTOPANIC_API_KEY=your_cryptopanic_api_key
GNEWS_API_KEY=your_gnews_api_key

# Groq AI Agent
GROQ_API_KEY=gsk_your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
```

### 2. Start Services

#### Run Spring Boot Backend:
```bash
cd backend2
mvn spring-boot:run
```
*The backend server will launch at `http://localhost:5000`*

#### Run Python AI Agent:
```bash
# From the root directory, create a virtual environment
python -m venv .coinVenv
.\.coinVenv\Scripts\activate

# Install dependencies and start FastAPI
pip install -r agent/requirements.txt
python agent/main.py
```
*The agent microservice will run at `http://localhost:8000`*

#### Run React Frontend:
```bash
cd frontend
npm install
npm start
```
*The web dashboard will open at `http://localhost:3000`*

---

## 🔒 Security & Safety Gates

1. **Safety Gating**: Live trading controls are physically locked. To unlock:
   - Perform at least **30 paper trades** in the simulator.
   - Maintain a mathematical **win rate > 50%** across your closed positions.
2. **Encrypted Keys**: Exchange API keys and secrets are protected using AES-256-GCM authenticated encryption before saving to MongoDB.
3. **Loop-Recursion Prevention**: The AI assistant utilizes system prompt bounds that reject infinite agent retries on tool errors.
