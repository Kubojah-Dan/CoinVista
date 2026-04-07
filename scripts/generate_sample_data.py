"""
Quick data generator for CoinVista evaluation
Creates sample processed data files for testing
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

# Create directories
os.makedirs('data/raw', exist_ok=True)
os.makedirs('data/processed', exist_ok=True)

def generate_realistic_crypto_data(days=1095, start_price=45000):
    """Generate realistic-looking crypto price data"""
    np.random.seed(42)
    
    dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
    
    # Generate price with trend and volatility
    trend = np.linspace(0, 0.3, days)  # 30% upward trend over period
    volatility = 0.02  # 2% daily volatility
    
    returns = np.random.normal(trend/days, volatility, days)
    prices = start_price * np.exp(np.cumsum(returns))
    
    # Create OHLCV
    df = pd.DataFrame({
        'timestamp': dates,
        'close': prices,
        'open': prices * (1 + np.random.normal(0, 0.005, days)),
        'high': prices * (1 + np.abs(np.random.normal(0, 0.015, days))),
        'low': prices * (1 - np.abs(np.random.normal(0, 0.015, days))),
        'volume': np.random.uniform(1e9, 5e9, days)
    })
    
    return df

def add_technical_indicators(df):
    """Add technical indicators"""
    # Returns
    df['returns'] = df['close'].pct_change()
    df['log_returns'] = np.log(df['close'] / df['close'].shift(1))
    
    # RSI
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / (loss + 1e-8)
    df['rsi_14'] = 100 - (100 / (1 + rs))
    
    # MACD
    ema12 = df['close'].ewm(span=12).mean()
    ema26 = df['close'].ewm(span=26).mean()
    df['macd'] = ema12 - ema26
    df['macd_signal'] = df['macd'].ewm(span=9).mean()
    
    # Bollinger Bands
    df['bb_middle'] = df['close'].rolling(20).mean()
    df['bb_std'] = df['close'].rolling(20).std()
    df['bb_upper'] = df['bb_middle'] + 2 * df['bb_std']
    df['bb_lower'] = df['bb_middle'] - 2 * df['bb_std']
    
    # Volatility
    df['volatility'] = df['returns'].rolling(20).std()
    
    # Volume
    df['volume_sma'] = df['volume'].rolling(20).mean()
    
    # Lag features
    for lag in [1, 2, 3, 5, 7]:
        df[f'close_lag_{lag}'] = df['close'].shift(lag)
        df[f'volume_lag_{lag}'] = df['volume'].shift(lag)
    
    # Drop NaN
    df = df.dropna()
    
    return df

# Generate data for BTC
print("Generating BTC data...")
df_btc = generate_realistic_crypto_data(days=1095, start_price=45000)

# Save raw
df_btc.to_csv('data/raw/btc_ohlcv.csv', index=False)
print(f"✓ Saved raw data: data/raw/btc_ohlcv.csv ({len(df_btc)} rows)")

# Add features
df_btc_processed = add_technical_indicators(df_btc)

# Normalize close price (simple min-max)
df_btc_processed['close_scaled'] = (df_btc_processed['close'] - df_btc_processed['close'].min()) / (df_btc_processed['close'].max() - df_btc_processed['close'].min())

# Save processed
df_btc_processed.to_csv('data/processed/btc_ohlcv.csv', index=False)
print(f"✓ Saved processed data: data/processed/btc_ohlcv.csv ({len(df_btc_processed)} rows)")

# Generate for other coins
for coin, start_price in [('eth', 3000), ('ada', 0.5), ('sol', 100), ('doge', 0.08)]:
    print(f"\nGenerating {coin.upper()} data...")
    df = generate_realistic_crypto_data(days=1095, start_price=start_price)
    df.to_csv(f'data/raw/{coin}_ohlcv.csv', index=False)
    
    df_processed = add_technical_indicators(df)
    df_processed['close_scaled'] = (df_processed['close'] - df_processed['close'].min()) / (df_processed['close'].max() - df_processed['close'].min())
    df_processed.to_csv(f'data/processed/{coin}_ohlcv.csv', index=False)
    print(f"✓ Saved {coin.upper()} data ({len(df_processed)} rows)")

print("\n" + "="*60)
print("✓ All sample data generated successfully!")
print("="*60)
print("\nYou can now continue with your local analysis or model evaluation workflow.")
