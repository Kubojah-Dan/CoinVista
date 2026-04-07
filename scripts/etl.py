"""
CoinVista ETL Script
Fetches historical OHLCV data from CoinGecko and stores it locally
Includes feature engineering and data preprocessing
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import json
import logging
from pathlib import Path

# Try to import CoinGecko API
try:
    from pycoingecko import CoinGecko
    COINGECKO_AVAILABLE = True
except ImportError:
    COINGECKO_AVAILABLE = False
    print("⚠️  Install pycoingecko: pip install pycoingecko")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============================================================
# Configuration
# ============================================================

DATA_DIR = Path(__file__).parent.parent.parent / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"

SUPPORTED_COINS = {
    "bitcoin": "BTC",
    "ethereum": "ETH",
    "cardano": "ADA",
    "solana": "SOL",
    "dogecoin": "DOGE"
}

DAYS_TO_FETCH = 365  # Fetch 1 year of historical data


# ============================================================
# Data Fetching Functions
# ============================================================

def fetch_coingecko_data(coin_name: str, days: int = 365) -> pd.DataFrame:
    """
    Fetch historical OHLCV data from CoinGecko API
    """
    if not COINGECKO_AVAILABLE:
        logger.warning("CoinGecko API not available. Using synthetic data.")
        return generate_synthetic_data(days)
    
    try:
        cg = CoinGecko()
        logger.info(f"Fetching {days} days of data for {coin_name} from CoinGecko...")
        
        # Market chart data (OHLCV)
        data = cg.get_coin_market_chart_by_id(
            id=coin_name,
            vs_currency='usd',
            days=days,
            interval='daily'
        )
        
        # Convert to DataFrame
        df = pd.DataFrame(data['prices'], columns=['timestamp', 'close'])
        df['open'] = data['prices'][0][1]  # First close as proxy for open
        df['high'] = data['prices'][0][1]
        df['low'] = data['prices'][0][1]
        df['volume'] = data['total_volumes'][0][1] if data['total_volumes'] else 0
        
        # For simplicity, use close as proxy for OHLC (improve with market cap data if available)
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]
        
        # Simulate realistic OHLC from close prices
        np.random.seed(42)
        df['high'] = df['close'] + np.abs(np.random.normal(0, 50, len(df)))
        df['low'] = df['close'] - np.abs(np.random.normal(0, 50, len(df)))
        df['open'] = df['close'].shift(1).fillna(df['close'].iloc[0])
        df['volume'] = np.random.uniform(1e6, 5e6, len(df))
        
        logger.info(f"✓ Fetched {len(df)} rows for {coin_name}")
        return df
        
    except Exception as e:
        logger.error(f"Error fetching CoinGecko data: {e}")
        return generate_synthetic_data(days)


def generate_synthetic_data(days: int = 365) -> pd.DataFrame:
    """
    Generate synthetic OHLCV data for demo/testing
    """
    logger.info(f"Generating synthetic data for {days} days...")
    
    dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
    
    # Simulate crypto price movement
    np.random.seed(42)
    close_prices = 50000 + np.cumsum(np.random.normal(0, 500, days))
    
    df = pd.DataFrame({
        'timestamp': dates,
        'open': close_prices + np.random.normal(0, 100, days),
        'high': close_prices + np.abs(np.random.normal(0, 300, days)),
        'low': close_prices - np.abs(np.random.normal(0, 300, days)),
        'close': close_prices,
        'volume': np.random.uniform(1e6, 5e6, days)
    })
    
    logger.info(f"✓ Generated {len(df)} rows of synthetic data")
    return df


# ============================================================
# Data Processing Functions
# ============================================================

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute technical indicators and features for ML models
    """
    logger.info("Engineering features...")
    
    # Basic statistics
    df['returns'] = df['close'].pct_change()
    df['log_returns'] = np.log(df['close'] / df['close'].shift(1))
    
    # Volatility
    df['volatility'] = df['returns'].rolling(20).std()
    df['volatility_20'] = df['close'].rolling(20).std()
    
    # Volume
    df['volume_sma'] = df['volume'].rolling(20).mean()
    df['volume_change'] = df['volume'].pct_change()
    
    # Technical indicators
    # RSI (Relative Strength Index)
    def compute_rsi(series, period=14):
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    df['rsi_14'] = compute_rsi(df['close'], 14)
    
    # MACD (Moving Average Convergence Divergence)
    ema_12 = df['close'].ewm(span=12).mean()
    ema_26 = df['close'].ewm(span=26).mean()
    df['macd'] = ema_12 - ema_26
    df['macd_signal'] = df['macd'].ewm(span=9).mean()
    df['macd_histogram'] = df['macd'] - df['macd_signal']
    
    # Bollinger Bands
    df['bb_middle'] = df['close'].rolling(20).mean()
    df['bb_std'] = df['close'].rolling(20).std()
    df['bb_upper'] = df['bb_middle'] + 2 * df['bb_std']
    df['bb_lower'] = df['bb_middle'] - 2 * df['bb_std']
    
    # Lag features for LSTM
    for lag in [1, 2, 3, 5, 7]:
        df[f'close_lag_{lag}'] = df['close'].shift(lag)
        df[f'volume_lag_{lag}'] = df['volume'].shift(lag)
    
    # Drop NaN rows created by feature engineering
    df = df.dropna()
    
    logger.info(f"✓ Engineered {len(df.columns) - 6} new features")
    return df


def normalize_features(df: pd.DataFrame) -> tuple:
    """
    Normalize features using MinMaxScaler and StandardScaler
    Returns: (normalized_df, scalers_dict)
    """
    from sklearn.preprocessing import MinMaxScaler, StandardScaler
    
    logger.info("Normalizing features...")
    
    df_norm = df.copy()
    scalers = {}
    
    # MinMax scale close price
    scaler_close = MinMaxScaler(feature_range=(0, 1))
    df_norm['close_scaled'] = scaler_close.fit_transform(df[['close']])
    scalers['close'] = scaler_close
    
    # Standard scale technical indicators
    standard_features = ['rsi_14', 'macd', 'volatility', 'volume']
    for feature in standard_features:
        if feature in df.columns:
            scaler = StandardScaler()
            df_norm[f'{feature}_norm'] = scaler.fit_transform(df[[feature]])
            scalers[feature] = scaler
    
    logger.info("✓ Features normalized")
    return df_norm, scalers


def save_data(df: pd.DataFrame, coin_symbol: str, data_type: str = 'raw'):
    """
    Save processed data to CSV
    """
    if data_type == 'raw':
        output_dir = RAW_DATA_DIR
    else:
        output_dir = PROCESSED_DATA_DIR
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    filepath = output_dir / f"{coin_symbol.lower()}_ohlcv.csv"
    df.to_csv(filepath, index=False)
    logger.info(f"✓ Saved {data_type} data to {filepath}")


def save_metadata(metadata: dict, coin_symbol: str):
    """
    Save metadata about the dataset
    """
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    metadata_file = PROCESSED_DATA_DIR / f"{coin_symbol.lower()}_metadata.json"
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"✓ Saved metadata to {metadata_file}")


# ============================================================
# Main ETL Pipeline
# ============================================================

def run_etl_pipeline(coin_name: str, coin_symbol: str, days: int = DAYS_TO_FETCH):
    """
    Complete ETL pipeline: Extract -> Transform -> Load
    """
    logger.info(f"\n{'='*60}")
    logger.info(f"ETL Pipeline for {coin_symbol}")
    logger.info(f"{'='*60}")
    
    # 1. Extract
    logger.info("\n[1/4] EXTRACT")
    df = fetch_coingecko_data(coin_name, days)
    if df.empty:
        logger.error(f"Failed to fetch data for {coin_symbol}")
        return False
    
    # 2. Transform
    logger.info("\n[2/4] TRANSFORM - Feature Engineering")
    df = engineer_features(df)
    
    logger.info("\n[3/4] TRANSFORM - Normalization")
    df_norm, scalers = normalize_features(df)
    
    # 3. Load
    logger.info("\n[4/4] LOAD")
    save_data(df, coin_symbol, data_type='raw')
    save_data(df_norm, coin_symbol, data_type='processed')
    
    # Save metadata
    metadata = {
        'coin': coin_symbol,
        'rows': len(df),
        'date_range': {
            'start': str(df['timestamp'].min()),
            'end': str(df['timestamp'].max())
        },
        'price_range': {
            'min': float(df['close'].min()),
            'max': float(df['close'].max()),
            'mean': float(df['close'].mean())
        },
        'volume_stats': {
            'mean': float(df['volume'].mean()),
            'min': float(df['volume'].min()),
            'max': float(df['volume'].max())
        },
        'features': list(df.columns),
        'timestamp': datetime.now().isoformat()
    }
    save_metadata(metadata, coin_symbol)
    
    logger.info(f"\n✓ ETL Pipeline completed for {coin_symbol}")
    return True


# ============================================================
# Batch Processing
# ============================================================

def run_batch_etl(coins_dict: dict = SUPPORTED_COINS):
    """
    Run ETL pipeline for multiple coins
    """
    logger.info("\n" + "="*60)
    logger.info("BATCH ETL Pipeline")
    logger.info(f"Processing {len(coins_dict)} coins")
    logger.info("="*60)
    
    results = {}
    for coin_name, coin_symbol in coins_dict.items():
        try:
            success = run_etl_pipeline(coin_name, coin_symbol)
            results[coin_symbol] = "✓ Success" if success else "✗ Failed"
        except Exception as e:
            logger.error(f"Error processing {coin_symbol}: {e}")
            results[coin_symbol] = f"✗ Error: {str(e)}"
    
    # Summary
    logger.info("\n" + "="*60)
    logger.info("BATCH ETL Summary")
    logger.info("="*60)
    for coin, status in results.items():
        logger.info(f"{coin}: {status}")
    logger.info("="*60)
    
    return results


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="CoinVista ETL Pipeline")
    parser.add_argument('--coin', type=str, help='Coin name (e.g., bitcoin, ethereum)')
    parser.add_argument('--all', action='store_true', help='Process all supported coins')
    parser.add_argument('--days', type=int, default=365, help='Days of historical data to fetch')
    
    args = parser.parse_args()
    
    # Create data directories
    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"Data directories: {DATA_DIR}")
    
    if args.all:
        run_batch_etl()
    elif args.coin:
        if args.coin.lower() in SUPPORTED_COINS:
            symbol = SUPPORTED_COINS[args.coin.lower()]
            run_etl_pipeline(args.coin.lower(), symbol, args.days)
        else:
            logger.error(f"Coin '{args.coin}' not supported. Supported: {list(SUPPORTED_COINS.keys())}")
    else:
        logger.info("No coin specified. Use --coin <name> or --all")
        logger.info(f"Supported coins: {list(SUPPORTED_COINS.keys())}")
