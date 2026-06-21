# CoinVista 🚀

CoinVista is a premium, full-stack cryptocurrency intelligence platform and paper trading simulator. Evolved into a production-grade, monetizable SaaS workspace (CoinVista 2.0), the project features MetaMask Web3 linkages, Stripe billing subscription portals, AI-powered trading mentorship, custom strategy modeling, copy trading networks, and real-time blockchain indicators.

![CoinVista Version](https://img.shields.io/badge/version-2.0.0-blue.svg) ![License](https://img.shields.io/badge/license-MIT-green.svg)

<br/>

## ✨ Key Features (CoinVista 2.0)

- 🦊 **Wagmi v2 + RainbowKit v2 Layer**: Migrated from legacy MetaMask connections to a robust Web3 infrastructure with `@tanstack/react-query`, handling EIP-6963 multi-provider conflicts, network indicators, and balance hooks.
- 🔐 **Sign-in With Ethereum (SIWE)**: Implements standard cryptographically secure EIP-4361 authentication verified on the Spring Boot backend via web3j EC recovery.
- 💳 **Stripe Billing Integration**: Implements Tiered pricing gates (Free, Trader, Pro, Elite) using Stripe Checkout sessions, Billing Portals, and automated webhook event syncs.
- 🤖 **Re-engineered Chatbot & Quantitative AI Mentor**: Powering a glassmorphic sidebar chat and automated weekly reviews. Groq (Llama 3.3 70B) scores execution, tags trader emotion, and parses reviews using an inline markdown reader.
- 📊 **Visual Strategy Builder**: Build rule-based strategies using a **React Flow** drag-and-drop canvas (inputs, indicators, conditions, actions) backtested against Binance public candlestick history.
- 👥 **Social copy-trading**: Leaderboards compiling ROI/win rates, public profile pages, follow functionality, and automated order replication.
- 🚨 **Live Whale Alerts**: Horizontal scrolling ticker of on-chain whale movements (> $100k USD) broadcast via FastAPI WebSockets.
- 🏆 **Gamification Engine**: Awarding XP for trades, SIWE sign-in, and unlocking verified shelf badges (First Step, Profit Taker, Risk Master, Diamond Hands, Web3 Explorer).

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, DaisyUI, RainbowKit v2, Wagmi v2, Viem, React Flow, Lightweight Charts v5.
- **Backend (Spring Boot)**: Java 17, Spring Boot 3.2.0, Spring Security (JWT), Spring Data MongoDB, WebClient, AOP Aspects (for Stripe gating).
- **AI Agent (FastAPI)**: Python 3.9+, FastAPI, LangGraph, LangChain Groq (Llama 3.3 70B), Pandas indicator engine.

---

## 🚀 Getting Started

### 📋 Prerequisites
- Java 17+ & Maven 3+
- Node.js (v18+) & npm
- Python 3.9+ & virtualenv
- MongoDB (running locally on port `27017` or Atlas URI)
- Groq API Key

### 1. Unified Environment Config (`.env`)
Create a `.env` in the root folder:
```env
# MongoDB Connection
MONGODB_URI=mongodb://127.0.0.1:27017/coinvista

# JWT Authentication Config
JWT_SECRET=your_secure_32_byte_jwt_secret_key_here
JWT_ACCESS_EXPIRATION=900000
JWT_REFRESH_EXPIRATION=2592000000
ENCRYPTION_KEY=4a7f3b9c2e1d8a6f5c0b4e7d9a2f1c8b3e6d0a9f2c5b8e1d4a7f0c3b6e9d2a5
REFRESH_COOKIE_NAME=coinvista_refresh

# CORS & URLs
FRONTEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:5000
CORS_ORIGINS=http://localhost:3000

# Third-party API Keys
COINGECKO_API_KEY=your_coingecko_api_key
CRYPTOPANIC_API_KEY=your_cryptopanic_key
GNEWS_API_KEY=your_gnews_key

# Groq AI Assistant
GROQ_API_KEY=gsk_your_key_here
AGENT_URL=http://localhost:8000
VITE_AGENT_URL=http://localhost:8000

# Stripe Billing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Transactional Email (SendGrid Setup below)
SENDGRID_API_KEY=SG.your_api_key_here
MAIL_FROM=verified_sender_email@gmail.com
```

### 2. Start Services Locally
- **Spring Boot Backend**: `cd backend2 && mvn spring-boot:run` (launches on port 5000)
- **FastAPI Agent**: `python -m venv .coinVenv && .\.coinVenv\Scripts\activate && pip install -r agent/requirements.txt && python agent/main.py` (launches on port 8000)
- **React Frontend**: `cd frontend && npm install && npm run dev` (launches on port 3000)

---

