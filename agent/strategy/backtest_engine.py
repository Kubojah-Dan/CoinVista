import pandas as pd
import numpy as np
import requests

def fetch_binance_klines(symbol: str, interval: str, limit: int = 500) -> pd.DataFrame:
    # E.g. BTCUSDT, ETHUSDT
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}"
    res = requests.get(url).json()
    if not isinstance(res, list):
        raise ValueError(f"Binance API returned invalid format: {res}")
    df = pd.DataFrame(res, columns=[
        'timestamp', 'open', 'high', 'low', 'close', 'volume',
        'close_time', 'quote_asset_volume', 'number_of_trades',
        'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
    ])
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = df[col].astype(float)
    return df

def run_backtest(strategy_rules: dict, symbol: str, interval: str) -> dict:
    df = fetch_binance_klines(symbol, interval)
    
    # Compute basic indicators (SMA, EMA, RSI)
    df['SMA_20'] = df['close'].rolling(window=20).mean()
    df['SMA_50'] = df['close'].rolling(window=50).mean()
    df['EMA_14'] = df['close'].ewm(span=14, adjust=False).mean()
    
    # RSI calculation
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI_14'] = 100 - (100 / (1 + rs))
    
    # Fill NaNs with defaults to avoid indexing issues
    df.fillna(method='bfill', inplace=True)
    
    # Default parameters
    balance = 10000.0
    initial_balance = balance
    in_position = False
    entry_price = 0.0
    entry_time = ""
    trades = []
    equity_curve = []
    
    buy_indicator = strategy_rules.get("buyIndicator", "EMA_14")
    buy_threshold_indicator = strategy_rules.get("buyThresholdIndicator", "SMA_50")
    sell_indicator = strategy_rules.get("sellIndicator", "RSI_14")
    sell_value = float(strategy_rules.get("sellValue", 70.0))
    
    # Ensure columns exist
    for col in [buy_indicator, buy_threshold_indicator, sell_indicator]:
        if col not in df.columns:
            # Fallback to close price if column not found
            df[col] = df['close']
            
    for i in range(50, len(df)):
        current_row = df.iloc[i]
        price = current_row['close']
        time_str = current_row['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
        
        # Check signals
        if not in_position:
            # Buy signal: Indicator 1 crosses above Indicator 2
            prev_row = df.iloc[i - 1]
            buy_condition = (prev_row[buy_indicator] <= prev_row[buy_threshold_indicator]) and (current_row[buy_indicator] > current_row[buy_threshold_indicator])
            if buy_condition:
                in_position = True
                entry_price = price
                entry_time = time_str
        else:
            # Sell signal: RSI above threshold or Stop Loss / Take Profit hits
            sell_condition = (current_row[sell_indicator] >= sell_value)
            
            # Simple 2% SL / 5% TP logic
            stop_loss_hit = price <= entry_price * 0.98
            take_profit_hit = price >= entry_price * 1.05
            
            if sell_condition or stop_loss_hit or take_profit_hit:
                pnl_percent = (price - entry_price) / entry_price
                exit_reason = "Signal"
                if stop_loss_hit:
                    pnl_percent = -0.02
                    price = entry_price * 0.98
                    exit_reason = "Stop Loss"
                elif take_profit_hit:
                    pnl_percent = 0.05
                    price = entry_price * 1.05
                    exit_reason = "Take Profit"
                    
                trade_pnl = balance * pnl_percent
                balance += trade_pnl
                in_position = False
                
                trades.append({
                    "entryTime": entry_time,
                    "exitTime": time_str,
                    "entryPrice": entry_price,
                    "exitPrice": price,
                    "pnl": trade_pnl,
                    "pnlPercent": pnl_percent * 100,
                    "type": exit_reason
                })
                
        equity_curve.append({
            "time": time_str,
            "balance": balance
        })
        
    # Calculate performance metrics
    total_trades = len(trades)
    winning_trades = sum(1 for t in trades if t['pnl'] > 0)
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    total_return = ((balance - initial_balance) / initial_balance) * 100
    
    # Calculate Sharpe ratio (basic approximation)
    returns = pd.Series([t['pnlPercent'] for t in trades]) if total_trades > 0 else pd.Series(dtype=float)
    sharpe = float(np.sqrt(total_trades) * (returns.mean() / returns.std())) if total_trades > 1 and returns.std() > 0 else 0.0
    
    return {
        "totalReturn": total_return,
        "winRate": win_rate,
        "totalTrades": total_trades,
        "sharpeRatio": sharpe,
        "finalBalance": balance,
        "trades": trades,
        "equityCurve": equity_curve
    }
