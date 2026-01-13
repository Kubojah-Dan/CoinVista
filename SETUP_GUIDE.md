# CoinVista Setup Guide

This guide will walk you through the complete setup process for CoinVista.

## Prerequisites Checklist

-   [ ]  Node.js (v14 or higher) installed
-   [ ]  MongoDB running locally or MongoDB Atlas account
-   [ ]  CoinGecko API key (free)
-   [ ]  Git (for cloning the repository)
-   [ ]  A code editor (VS Code recommended)

## Step-by-Step Setup

### Step 1: Get Your CoinGecko API Key

1.  Go to [https://www.coingecko.com/en/api](https://www.coingecko.com/en/api)
2.  Click on "Get Started" or "Sign Up"
3.  Create a free account
4.  Navigate to your API dashboard
5.  Copy your API key
6.  **Keep this key safe - you'll need it later**

### Step 2: Set Up MongoDB

#### Option A: Local MongoDB Installation

**For macOS:**

```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**For Windows:**

1.  Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2.  Run the installer
3.  MongoDB will start automatically

**For Linux (Ubuntu/Debian):**

```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

#### Option B: MongoDB Atlas (Cloud)

1.  Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2.  Sign up for a free account
3.  Create a new cluster (free tier is available)
4.  Set up database user and password
5.  Get your connection string
6.  The connection string will look like:
    
    ```
    mongodb+srv://<username>:<password>@cluster.mongodb.net/coinvista
    ```
    

### Step 3: Clone and Setup the Project

```bash
# Navigate to your workspace
cd /workspace

# The project should already be cloned, but if not:
# git clone <repository-url>
cd coinvista
```

### Step 4: Backend Configuration

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install
```

**Configure Backend Environment Variables:**

Edit `backend/.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/coinvista
# OR use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/coinvista

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
COINGECKO_API_KEY=your_actual_coingecko_api_key_here
NODE_ENV=development
```

**Important Security Notes:**

-   Generate a strong JWT secret (use: `openssl rand -base64 32`)
-   Replace `your_actual_coingecko_api_key_here` with your actual CoinGecko API key
-   Never commit the `.env` file to version control

### Step 5: Frontend Configuration

```bash
# Navigate to frontend
cd ../frontend

# Install dependencies
npm install
```

**Configure Frontend Environment Variables:**

Edit `frontend/.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### Step 6: Start the Application

**Start MongoDB** (if not already running):

```bash
# For local MongoDB
mongod

# Or check status
sudo systemctl status mongodb  # Linux
brew services list              # macOS
```

**Start Backend Server:**

Open a new terminal window:

```bash
cd /workspace/coinvista/backend
npm run dev
```

You should see:

```
Connected to MongoDB
Server running on port 5000
Environment: development
```

**Start Frontend Development Server:**

Open another new terminal window:

```bash
cd /workspace/coinvista/frontend
npm start
```

The browser will automatically open `http://localhost:3000`

### Step 7: Test the Application

1.  **Open the application** in your browser at `http://localhost:3000`
2.  **Register a new account:**
    -   Click "Register"
    -   Enter username, email, and password
    -   Click "Create Account"
3.  **Explore the Dashboard:**
    -   View top cryptocurrencies
    -   Check the price charts
    -   Search for specific coins
4.  **Test Watchlist:**
    -   Click "Add to Watchlist" on any coin
    -   Navigate to "Watchlist" page
    -   Verify the coin appears there
5.  **Test Price Alerts:**
    -   Click on a coin
    -   Click "Set Alert"
    -   Enter target price
    -   Create alert
    -   Wait for the alert to trigger (price checks every minute)
6.  **Test Theme Toggle:**
    -   Click the sun/moon icon in the navbar
    -   Verify the theme changes between light and dark

## Troubleshooting

### Backend Issues

**MongoDB Connection Error:**

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

-   Solution: Make sure MongoDB is running
-   Check MongoDB status: `sudo systemctl status mongodb`

**CoinGecko API Error:**

```
Error: Failed to fetch cryptocurrency data
```

-   Solution: Verify your CoinGecko API key is correct in `.env`
-   Check if you've exceeded API rate limits (free tier: 50 calls/minute)

### Frontend Issues

**API Connection Error:**

```
Network Error
```

-   Solution: Make sure backend server is running on port 5000
-   Check `REACT_APP_API_URL` in `frontend/.env`

**Socket Connection Error:**

```
Socket connection error
```

-   Solution: Verify `REACT_APP_SOCKET_URL` is correct
-   Check if backend is running

### Port Already in Use

**If port 5000 is already in use:**

```bash
# Find the process
lsof -i :5000

# Kill the process
kill -9 <PID>
```

**If port 3000 is already in use:**

```bash
# Find the process
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

## Development Tips

### Hot Reloading

-   Both frontend and backend have hot reloading enabled
-   Changes to frontend code will automatically refresh the browser
-   Changes to backend code will automatically restart the server

### Debugging

**Backend Debugging:**

```bash
# Run with debug logs
DEBUG=* npm run dev
```

**Frontend Debugging:**

-   Open browser DevTools (F12)
-   Check Console tab for errors
-   Use React DevTools for component inspection

### Testing APIs

You can test the backend APIs using tools like Postman or curl:

```bash
# Health check
curl http://localhost:5000/health

# Get top coins
curl http://localhost:5000/api/crypto/coins/top
```

## Production Deployment

### Backend Deployment

1.  Set `NODE_ENV=production` in `.env`
2.  Use a production MongoDB instance
3.  Set up SSL/HTTPS
4.  Configure a proper domain
5.  Use a process manager like PM2:
    
    ```bash
    npm install -g pm2
    pm2 start backend/src/server.js --name coinvista-backend
    ```
    

### Frontend Deployment

1.  Build the production version:
    
    ```bash
    cd frontend
    npm run build
    ```
    
2.  Deploy the `build` folder to:
    -   Vercel
    -   Netlify
    -   AWS S3 + CloudFront
    -   Your own server
3.  Update environment variables for production

## Next Steps

-   Customize the UI colors in `tailwind.config.js`
-   Add more chart types and indicators
-   Implement portfolio tracking
-   Add more coin comparisons
-   Create a mobile app using React Native
-   Set up automated testing

## Support

If you encounter any issues:

1.  Check the [README.md](README.md) for additional information
2.  Review the troubleshooting section above
3.  Check browser console and terminal logs
4.  Open an issue on GitHub

* * *

Happy coding! 🚀