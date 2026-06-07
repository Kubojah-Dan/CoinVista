import numpy as np
import pandas as pd

def compute_all_indicators(ohlcv_data: list) -> dict:
    """
    Computes all trend, momentum, volatility, volume, levels, and patterns from OHLCV list.
    Expected format: list of dicts with 'time' (ms), 'open', 'high', 'low', 'close', 'volume'.
    """
    if not ohlcv_data or len(ohlcv_data) < 5:
        return {}

    df = pd.DataFrame(ohlcv_data)
    df = df.sort_values('time').reset_index(drop=True)

    # Convert numeric types
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Drop NaNs
    df = df.dropna(subset=['open', 'high', 'low', 'close', 'volume']).reset_index(drop=True)
    if len(df) < 5:
        return {}

    # --- Trend Indicators ---
    df['ema_20'] = df['close'].ewm(span=20, adjust=False).mean()
    df['ema_50'] = df['close'].ewm(span=50, adjust=False).mean()
    df['ema_200'] = df['close'].ewm(span=200, adjust=False).mean()
    df['sma'] = df['close'].rolling(window=20).mean()

    # VWAP
    typical_price = (df['high'] + df['low'] + df['close']) / 3.0
    cum_vol = df['volume'].cumsum()
    df['vwap'] = (typical_price * df['volume']).cumsum() / np.where(cum_vol == 0, 1.0, cum_vol)

    # --- Momentum Indicators ---
    # RSI 14
    delta = df['close'].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=13, adjust=False).mean()
    avg_loss = loss.ewm(com=13, adjust=False).mean()
    rs = avg_gain / np.where(avg_loss == 0, 0.00001, avg_loss)
    df['rsi'] = 100 - (100 / (1 + rs))

    # MACD (12, 26, 9)
    ema_12 = df['close'].ewm(span=12, adjust=False).mean()
    ema_26 = df['close'].ewm(span=26, adjust=False).mean()
    df['macd_line'] = ema_12 - ema_26
    df['macd_signal'] = df['macd_line'].ewm(span=9, adjust=False).mean()
    df['macd_hist'] = df['macd_line'] - df['macd_signal']

    # Stochastic (14, 3, 3)
    low_14 = df['low'].rolling(window=14).min()
    high_14 = df['high'].rolling(window=14).max()
    denom = high_14 - low_14
    df['stoch_k'] = 100 * ((df['close'] - low_14) / np.where(denom == 0, 1.0, denom))
    df['stoch_d'] = df['stoch_k'].rolling(window=3).mean()

    # --- Volatility Indicators ---
    # Bollinger Bands
    std_20 = df['close'].rolling(window=20).std()
    df['bb_middle'] = df['sma']
    df['bb_upper'] = df['sma'] + (std_20 * 2.0)
    df['bb_lower'] = df['sma'] - (std_20 * 2.0)

    # ATR 14
    h_l = df['high'] - df['low']
    h_pc = (df['high'] - df['close'].shift(1)).abs()
    l_pc = (df['low'] - df['close'].shift(1)).abs()
    tr = pd.concat([h_l, h_pc, l_pc], axis=1).max(axis=1)
    df['atr'] = tr.rolling(window=14).mean()

    # --- Volume Indicators ---
    # OBV
    obv_values = [0.0]
    closes = df['close'].values
    volumes = df['volume'].values
    for i in range(1, len(df)):
        if closes[i] > closes[i-1]:
            obv_values.append(obv_values[-1] + volumes[i])
        elif closes[i] < closes[i-1]:
            obv_values.append(obv_values[-1] - volumes[i])
        else:
            obv_values.append(obv_values[-1])
    df['obv'] = obv_values

    # Volume Profile (Horizontal bins)
    price_min = float(df['low'].min())
    price_max = float(df['high'].max())
    bins_count = 15
    price_bins = np.linspace(price_min, price_max, bins_count + 1)
    profile_volumes = np.zeros(bins_count)
    for i in range(len(df)):
        p = closes[i]
        v = volumes[i]
        bin_idx = np.digitize(p, price_bins) - 1
        bin_idx = min(max(bin_idx, 0), bins_count - 1)
        profile_volumes[bin_idx] += v
    
    volume_profile = []
    for b in range(bins_count):
        volume_profile.append({
            "price_level": float(price_bins[b] + price_bins[b+1]) / 2.0,
            "volume": float(profile_volumes[b])
        })

    # --- Level Calculations ---
    # Support & Resistance Zones (using rolling local extrema)
    window = 10
    df['local_min'] = df['low'].rolling(window=window*2+1, center=True).min()
    df['local_max'] = df['high'].rolling(window=window*2+1, center=True).max()
    
    support_levels = df[df['low'] == df['local_min']]['low'].unique().tolist()
    resistance_levels = df[df['high'] == df['local_max']]['high'].unique().tolist()
    
    # Take last 5 levels of each
    support_levels = sorted([float(s) for s in support_levels if not np.isnan(s)])[-5:]
    resistance_levels = sorted([float(r) for r in resistance_levels if not np.isnan(r)])[-5:]

    # Fibonacci Retracement on the highest high & lowest low in the range
    max_idx = df['high'].idxmax()
    min_idx = df['low'].idxmin()
    high_val = float(df['high'].max())
    low_val = float(df['low'].min())
    diff = high_val - low_val
    fib_levels = {
        "0.0": high_val,
        "0.236": high_val - 0.236 * diff,
        "0.382": high_val - 0.382 * diff,
        "0.500": high_val - 0.500 * diff,
        "0.618": high_val - 0.618 * diff,
        "0.786": high_val - 0.786 * diff,
        "1.000": low_val
    }

    # Pivot Points (using overall high, low, close of the series)
    pp_high = float(df['high'].max())
    pp_low = float(df['low'].min())
    pp_close = float(df['close'].iloc[-1])
    pp = (pp_high + pp_low + pp_close) / 3.0
    pivot_points = {
        "PP": pp,
        "R1": 2.0 * pp - pp_low,
        "S1": 2.0 * pp - pp_high,
        "R2": pp + (pp_high - pp_low),
        "S2": pp - (pp_high - pp_low),
        "R3": pp_high + 2.0 * (pp - pp_low),
        "S3": pp_low - 2.0 * (pp_high - pp)
    }

    # --- Candlestick Patterns ---
    patterns = []
    
    # We evaluate patterns on the last 3 candles
    for i in range(len(df) - 3, len(df)):
        if i < 2:
            continue
        c = df.iloc[i]
        prev = df.iloc[i-1]
        prev_2 = df.iloc[i-2]
        
        c_body = abs(c['close'] - c['open'])
        c_range = c['high'] - c['low']
        prev_body = abs(prev['close'] - prev['open'])
        
        # 1. Doji
        if c_range > 0 and c_body / c_range < 0.1:
            patterns.append({"candle_index": int(i), "time": int(c['time']), "pattern": "Doji"})
            
        # 2. Hammer
        lower_wick = min(c['open'], c['close']) - c['low']
        upper_wick = c['high'] - max(c['open'], c['close'])
        if c_body > 0 and lower_wick / c_body >= 2.0 and upper_wick / c_body <= 0.5:
            patterns.append({"candle_index": int(i), "time": int(c['time']), "pattern": "Hammer"})
            
        # 3. Engulfing
        if prev_body > 0 and c_body > prev_body:
            if c['close'] > c['open'] and prev['close'] < prev['open'] and c['open'] <= prev['close'] and c['close'] >= prev['open']:
                patterns.append({"candle_index": int(i), "time": int(c['time']), "pattern": "Bullish Engulfing"})
            elif c['close'] < c['open'] and prev['close'] > prev['open'] and c['open'] >= prev['close'] and c['close'] <= prev['open']:
                patterns.append({"candle_index": int(i), "time": int(c['time']), "pattern": "Bearish Engulfing"})
                
        # 4. Morning Star
        if prev_2['close'] < prev_2['open'] and abs(prev['close'] - prev['open']) / (prev['high'] - prev['low'] + 0.0001) < 0.2 and c['close'] > c['open'] and c['close'] > (prev_2['open'] + prev_2['close'])/2:
            patterns.append({"candle_index": int(i), "time": int(c['time']), "pattern": "Morning Star"})

        # 5. Evening Star
        if prev_2['close'] > prev_2['open'] and abs(prev['close'] - prev['open']) / (prev['high'] - prev['low'] + 0.0001) < 0.2 and c['close'] < c['open'] and c['close'] < (prev_2['open'] + prev_2['close'])/2:
            patterns.append({"candle_index": int(i), "time": int(c['time']), "pattern": "Evening Star"})

    # Return structured dict
    latest = df.iloc[-1]
    
    return {
        "latest": {
            "time": int(latest['time']),
            "open": float(latest['open']),
            "high": float(latest['high']),
            "low": float(latest['low']),
            "close": float(latest['close']),
            "volume": float(latest['volume']),
            "ema_20": float(latest['ema_20']) if not np.isnan(latest['ema_20']) else None,
            "ema_50": float(latest['ema_50']) if not np.isnan(latest['ema_50']) else None,
            "ema_200": float(latest['ema_200']) if not np.isnan(latest['ema_200']) else None,
            "sma": float(latest['sma']) if not np.isnan(latest['sma']) else None,
            "vwap": float(latest['vwap']) if not np.isnan(latest['vwap']) else None,
            "rsi": float(latest['rsi']) if not np.isnan(latest['rsi']) else None,
            "macd": float(latest['macd_line']) if not np.isnan(latest['macd_line']) else None,
            "macd_signal": float(latest['macd_signal']) if not np.isnan(latest['macd_signal']) else None,
            "macd_hist": float(latest['macd_hist']) if not np.isnan(latest['macd_hist']) else None,
            "stoch_k": float(latest['stoch_k']) if not np.isnan(latest['stoch_k']) else None,
            "stoch_d": float(latest['stoch_d']) if not np.isnan(latest['stoch_d']) else None,
            "bb_upper": float(latest['bb_upper']) if not np.isnan(latest['bb_upper']) else None,
            "bb_middle": float(latest['bb_middle']) if not np.isnan(latest['bb_middle']) else None,
            "bb_lower": float(latest['bb_lower']) if not np.isnan(latest['bb_lower']) else None,
            "atr": float(latest['atr']) if not np.isnan(latest['atr']) else None,
            "obv": float(latest['obv']) if not np.isnan(latest['obv']) else None,
        },
        "volume_profile": volume_profile,
        "support_levels": support_levels,
        "resistance_levels": resistance_levels,
        "fibonacci_levels": fib_levels,
        "pivot_points": pivot_points,
        "detected_patterns": patterns
    }
