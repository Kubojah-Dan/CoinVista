# CoinVista 🚀

A modern, full-stack cryptocurrency dashboard built with React, Node.js, Express, MongoDB, and the CoinGecko API. Features real-time price updates, interactive charts, watchlist management, and price alerts.

![CoinVista](https://img.shields.io/badge/version-1.0.0-blue.svg) ![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

-   📊 **Real-time Cryptocurrency Data**: Live prices and market data from CoinGecko API
-   📈 **Interactive Charts**: Beautiful, responsive price charts with multiple time ranges
-   🔔 **Price Alerts**: Set custom price alerts and receive notifications
-   ⭐ **Watchlist**: Track your favorite cryptocurrencies
-   🎨 **Modern UI**: Built with Tailwind CSS and DaisyUI
-   🌙 **Dark/Light Theme**: Toggle between themes
-   🔐 **Authentication**: Secure user authentication with JWT
-   📱 **Responsive Design**: Works seamlessly on desktop and mobile
-   🔄 **Real-time Updates**: Socket.IO for live price updates

## 🛠️ Tech Stack

### Frontend

-   React 18
-   React Router DOM
-   Tailwind CSS
-   DaisyUI
-   Chart.js
-   React Chart.js 2
-   Axios
-   Socket.IO Client
-   React Toastify
-   Lucide React Icons

### Backend

-   Node.js
-   Express.js
-   MongoDB
-   Mongoose
-   Socket.IO
-   JWT Authentication
-   CoinGecko API
-   Helmet (Security)
-   Express Rate Limiting

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

-   Node.js (v14 or higher)
-   MongoDB (local or Atlas)
-   npm or yarn
-   CoinGecko API Key (get free at [coingecko.com](https://www.coingecko.com/en/api))

## 🚀 Installation

### 1\. Clone the Repository

```bash
git clone <repository-url>
cd coinvista
```

### 2\. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env file and add your credentials
```

**Backend .env Configuration:**

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/coinvista
JWT_SECRET=your_jwt_secret_key_here_change_in_production
COINGECKO_API_KEY=your_coingecko_api_key_here
NODE_ENV=development
```

### 3\. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install
```

**Frontend .env Configuration:**

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 4\. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas connection string in .env
```

### 5\. Run the Application

**Start Backend:**

```bash
# From the backend directory
cd backend
npm run dev
```

The backend server will run on `http://localhost:5000`

**Start Frontend:**

```bash
# From the frontend directory (in a new terminal)
cd frontend
npm start
```

The frontend will run on `http://localhost:3000`

## 📁 Project Structure

```
coinvista/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic & API integrations
│   │   ├── middleware/      # Authentication & error handling
│   │   ├── utils/           # Helper functions
│   │   ├── sockets/         # Socket.IO setup
│   │   ├── app.js           # Express app configuration
│   │   └── server.js        # Server entry point
│   ├── .env                 # Environment variables
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── assets/          # Images, logos
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page-level components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API clients & Socket.IO
│   │   ├── context/         # React contexts
│   │   ├── utils/           # Helper functions
│   │   ├── App.js           # Root app component
│   │   ├── index.js         # Entry point
│   │   └── index.css        # Global styles
│   ├── public/
│   ├── .env                 # Frontend environment variables
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── README.md
└── .gitignore
```

## 🔑 Getting CoinGecko API Key

1.  Visit [CoinGecko API](https://www.coingecko.com/en/api)
2.  Sign up for a free account
3.  Get your API key from the dashboard
4.  Add it to your backend `.env` file

## 📱 Usage

### Dashboard

-   View top cryptocurrencies with market data
-   Filter by different currencies (USD, EUR, BTC)
-   Search for specific cryptocurrencies
-   Pagination for browsing more coins

### Coin Details

-   Click on any cryptocurrency to view detailed information
-   Interactive price charts with multiple time ranges (1D, 7D, 14D, 30D, 90D, 1Y)
-   Market statistics and metrics
-   Add to watchlist
-   Set price alerts

### Watchlist

-   Add/remove cryptocurrencies from your watchlist
-   Track favorite coins in one place
-   Real-time price updates

### Price Alerts

-   Set custom price alerts (above/below target price)
-   Receive notifications when alerts are triggered
-   Manage all your alerts

## 🎨 Features in Detail

### Real-time Updates

-   Prices update every 30 seconds via Socket.IO
-   Alert checking every minute
-   Live notifications for triggered alerts

### Interactive Charts

-   Beautiful gradient fills
-   Hover tooltips with detailed information
-   Responsive design
-   Multiple time range options

### Authentication

-   Secure JWT-based authentication
-   Protected routes for authenticated users
-   User preferences (currency, theme)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

-   [CoinGecko](https://www.coingecko.com/) for the cryptocurrency data API
-   [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
-   [DaisyUI](https://daisyui.com/) for the beautiful UI components
-   [Chart.js](https://www.chartjs.org/) for the interactive charts
-   [Socket.IO](https://socket.io/) for real-time communication

## 📞 Support

If you have any questions or issues, please open an issue on GitHub.

* * *

Made with ❤️ by the CoinVista Team