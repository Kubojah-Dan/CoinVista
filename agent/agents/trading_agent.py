import os
import json
import requests
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent
from analysis.ta_indicators import compute_all_indicators

# Define the base URL of the Spring Boot application
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:5000/api")

# --- Raw Python Implementations (Prevents LangChain Tool Wrapper Callback errors) ---

def get_ohlc_data_impl(coin_id: str, days: int = 30) -> list:
    try:
        url = f"{BACKEND_URL}/crypto/coins/{coin_id}/ohlcv?days={days}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return [{"error": f"Failed to fetch candlestick data: {str(e)}"}]

def get_sentiment_score_impl(coin_id: str, auth_token: str = None) -> dict:
    headers = {"Authorization": auth_token} if auth_token else {}
    try:
        url = f"{BACKEND_URL}/intelligence/{coin_id}"
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": f"Failed to fetch sentiment scores: {str(e)}"}

# --- LangChain Registered Tools ---

@tool
def get_ohlc_data(coin_id: str, days: int = 30) -> str:
    """
    Fetch historical OHLCV (Open, High, Low, Close, Volume) candle data for a coin.
    Only the most recent 5 candles are returned to prevent token limit errors.
    For longer trends, use compute_indicators.
    """
    data = get_ohlc_data_impl(coin_id, days)
    if isinstance(data, list) and len(data) > 5:
        return json.dumps(data[-5:])
    return json.dumps(data)

@tool
def compute_indicators(coin_id: str, days: int = 30) -> str:
    """
    Compute key mathematical indicators like RSI, MACD, Bollinger Bands, ATR, SMA, EMA (20/50/200), and VWAP.
    Crucial for identifying trend direction, volatility, and oversold/overbought states.
    """
    data = get_ohlc_data_impl(coin_id, days)
    if not data or "error" in data[0] if isinstance(data, list) and len(data) > 0 else False:
        return json.dumps({"error": "Cannot compute indicators due to missing candle data."})
    
    indicators = compute_all_indicators(data)
    volume_profile = indicators.get("volume_profile", [])
    peak_volume_profile = None
    if volume_profile:
        peak_volume_profile = max(volume_profile, key=lambda x: x["volume"])
        
    return json.dumps({
        "latest_indicators": indicators.get("latest"),
        "peak_volume_profile": peak_volume_profile
    })

@tool
def detect_patterns(coin_id: str, days: int = 30) -> str:
    """
    Detect standard candlestick reversal or continuation patterns such as Hammer, Doji, Engulfing, Morning/Evening Stars.
    Useful for identifying key price turning points.
    """
    data = get_ohlc_data_impl(coin_id, days)
    if not data or "error" in data[0] if isinstance(data, list) and len(data) > 0 else False:
        return json.dumps([{"error": "Cannot detect patterns due to missing candle data."}])
    
    indicators = compute_all_indicators(data)
    return json.dumps(indicators.get("detected_patterns", []))

@tool
def get_support_resistance(coin_id: str, days: int = 30) -> str:
    """
    Get support and resistance zones, Fibonacci Retracement levels, and Pivot Points.
    Used for sizing entry points, stop-losses, and profit targets.
    """
    data = get_ohlc_data_impl(coin_id, days)
    if not data or "error" in data[0] if isinstance(data, list) and len(data) > 0 else False:
        return json.dumps({"error": "Cannot compute levels due to missing candle data."})
    
    indicators = compute_all_indicators(data)
    return json.dumps({
        "support_zones": indicators.get("support_levels"),
        "resistance_zones": indicators.get("resistance_levels"),
        "fibonacci_retracements": indicators.get("fibonacci_levels"),
        "pivot_points": indicators.get("pivot_points")
    })

@tool
def get_sentiment_score(coin_id: str, config: RunnableConfig) -> str:
    """
    Get the existing Machine Learning sentiment scores, 24h z-score forecasts, and recent news drivers.
    Requires user session config context.
    """
    auth_token = config["configurable"].get("auth_token") if config else None
    data = get_sentiment_score_impl(coin_id, auth_token)
    if isinstance(data, dict) and "news" in data:
        data = data.copy()
        # Remove news list from sentiment score tool to keep prompt context size small
        data["news_count"] = len(data["news"])
        del data["news"]
    return json.dumps(data)

@tool
def get_news_feed(coin_id: str, config: RunnableConfig) -> str:
    """
    Fetch a list of recent crypto news headlines and their sentiment labels (bullish/bearish) for the given asset.
    Requires user session config context.
    """
    auth_token = config["configurable"].get("auth_token") if config else None
    sentiment_data = get_sentiment_score_impl(coin_id, auth_token)
    if "error" in sentiment_data:
        return json.dumps([sentiment_data])
    
    news_list = sentiment_data.get("news", [])
    compressed_news = []
    for art in news_list:
        title = art.get("title", "")
        source = art.get("source", "Unknown")
        sentiment = art.get("sentimentLabel", "neutral")
        compressed_news.append(f"Headline: {title} | Source: {source} | Sentiment: {sentiment}")
    return "\n".join(compressed_news[:5]) if compressed_news else "No recent news articles found."

@tool
def get_portfolio_state(config: RunnableConfig, account_type: str = "paper") -> str:
    """
    Fetch the user's paper trading portfolio summary, cash balances, and current open positions.
    Essential to evaluate buying power and size trades. Requires user session config context.

    Parameters:
    - account_type: The account type to fetch, defaults to 'paper'.
    """
    auth_token = config["configurable"].get("auth_token") if config else None
    headers = {"Authorization": auth_token} if auth_token else {}
    
    try:
        url = f"{BACKEND_URL}/paper-trading/summary"
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return json.dumps(response.json())
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch portfolio state: {str(e)}"})

@tool
def execute_paper_trade(
    coin_id: str,
    symbol: str,
    name: str,
    side: str,
    quantity: float,
    stop_loss: float = None,
    take_profit: float = None,
    strategy: str = None,
    config: RunnableConfig = None
) -> str:
    """
    Execute a paper trade (long or short) with optional stop-loss (SL) and take-profit (TP) values,
    and associate it with a specific trading strategy.
    
    Parameters:
    - coin_id: e.g., 'bitcoin' or 'ethereum'
    - symbol: e.g., 'BTC' or 'ETH'
    - name: e.g., 'Bitcoin' or 'Ethereum'
    - side: 'buy' (open long / close short) or 'sell' (open short / close long)
    - quantity: decimal size of the order
    - stop_loss: optional exit price trigger to cut losses
    - take_profit: optional exit price trigger to take profits
    - strategy: name of the strategy (e.g., 'Trend Following', 'Mean Reversion', 'Breakout', etc.)
    """
    auth_token = config["configurable"].get("auth_token") if config else None
    headers = {"Authorization": auth_token} if auth_token else {}
    
    payload = {
        "coinId": coin_id,
        "symbol": symbol.upper(),
        "name": name,
        "side": side.lower(),
        "quantity": float(quantity)
    }
    
    if stop_loss is not None:
        payload["stopLoss"] = float(stop_loss)
    if take_profit is not None:
        payload["takeProfit"] = float(take_profit)
    if strategy:
        payload["strategy"] = strategy

    try:
        url = f"{BACKEND_URL}/paper-trading/trades"
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        return json.dumps(response.json())
    except Exception as e:
        return json.dumps({"error": f"Failed to execute paper trade: {str(e)}"})

def get_trading_agent(api_key: str):
    """
    Initializes and returns the LangGraph react agent with the ChatGroq model.
    """
    import os
    model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    llm = ChatGroq(
        model=model_name, 
        temperature=0,
        groq_api_key=api_key
    )
    
    tools = [
        get_ohlc_data,
        compute_indicators,
        detect_patterns,
        get_support_resistance,
        get_sentiment_score,
        get_news_feed,
        get_portfolio_state,
        execute_paper_trade
    ]
    
    return create_react_agent(llm, tools)
