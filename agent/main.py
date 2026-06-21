import os
import json
import asyncio
from typing import List, Dict, Optional
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Import agent and indicators logic
from agents.trading_agent import get_trading_agent
from analysis.ta_indicators import compute_all_indicators
import requests

# Load root .env or local .env
load_dotenv(dotenv_path="../.env")
load_dotenv()

app = FastAPI(title="CoinVista AI Agent Service")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Frontend and Spring Boot
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from strategy.routes import router as strategy_router
app.include_router(strategy_router)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []

# Helper to format message history
def format_history(history: List[Dict[str, str]]):
    from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
    
    messages = [
        SystemMessage(content=(
            "You are the CoinVista Senior Quantitative Data Analyst and Trading Assistant. "
            "You have access to real-time blockchain indicators, historical price series, sentiment feeds, and paper trading execution engines. "
            "Your objective is to provide high-fidelity, data-driven financial analysis, education, and trading support.\n\n"
            "TRADER PERSONAS & INTERACTION:\n"
            "- Beginners: If a user is asking basic questions or appears to be a beginner, explain indicators (like RSI, MACD, Bollinger Bands), risk management (stop-loss, take-profit, risk-to-reward), and support/resistance zones using simple analogies and intuitive, step-by-step reasoning.\n"
            "- Professional/Experienced Traders: Offer high-fidelity quantitative metrics, statistical analysis, mathematical logic, and precise level sizing.\n\n"
            "WORKFLOW FOR ASSET ANALYSIS:\n"
            "1. Data Retrieval: Call `get_ohlc_data`, `compute_indicators`, or `get_support_resistance` to gather raw metrics.\n"
            "2. Macro & Sentiment Review: Call `get_sentiment_score` or `get_news_feed` to assess market sentiment drivers.\n"
            "3. Technical Preprocessing: Review trend indicators (EMA 20/50/200, SMA, VWAP), momentum (RSI, MACD), and volatility (ATR, Bollinger Bands).\n"
            "4. Level Sizing: Identify key Fibonacci retracement levels, pivot points, and support/resistance zones for sizing entries and risk bounds.\n"
            "5. Reporting: Formulate a clear report containing an Executive Summary, core technical insights, and a structured Trade Plan.\n\n"
            "SAFETY & HUMAN-IN-THE-LOOP APPROVAL GATE:\n"
            "- You MUST obtain explicit approval from the user BEFORE executing any paper trade (calling `execute_paper_trade`).\n"
            "- When a user requests a trade (e.g. 'buy 0.5 ETH' or 'sell BTC'), you must FIRST calculate/retrieve relevant prices, formulate the trade setup (including entry, stop-loss, take-profit, size, and strategy), present it to the user, and ask: 'Do you approve executing this trade? Please reply with \"Approve\" to execute.' Do NOT invoke `execute_paper_trade` in this turn.\n"
            "- ONLY invoke the `execute_paper_trade` tool in a turn where the user has explicitly confirmed approval (e.g., they replied 'Approve', 'Yes', 'Execute', or the original prompt already explicitly stated 'I approve executing this trade right now').\n"
            "- Always verify user balance using `get_portfolio_state` before proposing or executing any trades.\n"
            "- State that paper trading is active before calling `execute_paper_trade`.\n"
            "- Calculate stop-loss (SL) and take-profit (TP) levels mathematically using ATR-based methods or key support/resistance zones.\n"
            "- If any tool call returns an error or failure message, DO NOT retry calling the same tool or call other tools repeatedly. Report the error to the user and proceed with the analysis using the remaining available data.\n\n"
            "Be precise, mathematical, objective, and concise. Avoid vague generalizations."
        ))
    ]
    
    # Limit message history to the last 6 messages (3 turns) to stay within token limits
    for msg in history[-6:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))
            
    return messages

async def stream_agent_events(message: str, history: List[Dict[str, str]], auth_header: str):
    from langchain_core.messages import HumanMessage
    
    if not GROQ_API_KEY:
        yield f"data: {json.dumps({'type': 'error', 'content': 'GROQ_API_KEY environment variable is not configured.'})}\n\n"
        return
        
    try:
        agent = get_trading_agent(GROQ_API_KEY)
        history_msgs = format_history(history)
        inputs = {"messages": history_msgs + [HumanMessage(content=message)]}
        config = {"configurable": {"auth_token": auth_header}}
        
        # Stream events token-by-token and tool-by-tool
        async for event in agent.astream_events(inputs, config, version="v2"):
            kind = event["event"]
            
            # Streaming LLM tokens
            if kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
                    
            # Tool invocation status updates
            elif kind == "on_tool_start":
                tool_name = event["name"]
                yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool_name})}\n\n"
            elif kind == "on_tool_end":
                tool_name = event["name"]
                yield f"data: {json.dumps({'type': 'tool_end', 'tool': tool_name})}\n\n"
                
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': f'Agent execution failed: {str(e)}'})}\n\n"

@app.post("/api/agent/chat")
async def chat_endpoint(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """
    Exposes the streaming AI Agent assistant route.
    """
    print(f"DEBUG: Incoming Authorization header: {repr(authorization)}")
    
    # ── Quota Check ───────────────────────────────────────────────────────────
    try:
        quota_url = "http://127.0.0.1:5000/api/billing/quota/use-ai"
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        response = requests.post(quota_url, headers=headers, timeout=5)
        if response.status_code in [401, 403]:
            raise HTTPException(status_code=response.status_code, detail="Authentication failed with backend")
        
        if response.status_code == 200:
            res_data = response.json()
            if not res_data.get("allowed", True):
                raise HTTPException(
                    status_code=402,
                    detail="AI Query quota exceeded. Please upgrade your subscription tier in the Settings page to continue."
                )
        else:
            print(f"WARNING: Quota check backend returned status {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Backend connection failed during quota check: {str(e)}")
        # Proceed in case of backend communication breakdown to keep app resilient
    
    return StreamingResponse(
        stream_agent_events(request.message, request.history, authorization),
        media_type="text/event-stream"
    )

@app.get("/api/ta/indicators")
async def get_indicators_endpoint(coinId: str = Query(...), days: int = Query(30)):
    """
    Fetch raw combined OHLCV and compute indicators server-side.
    """
    try:
        url = f"http://127.0.0.1:5000/api/crypto/coins/{coinId}/ohlcv?days={days}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        ohlcv_data = response.json()
        
        computed = compute_all_indicators(ohlcv_data)
        return computed
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TA indicator calculation failed: {str(e)}")

class AnalyzeTradeRequest(BaseModel):
    tradeId: str
    coinId: str
    symbol: str
    name: str
    side: str
    entryPrice: float
    exitPrice: float
    size: float
    stopLoss: Optional[float] = None
    takeProfit: Optional[float] = None
    pnl: float
    pnlPercent: float
    strategy: Optional[str] = None
    closeReason: Optional[str] = None
    preTradeThesis: Optional[str] = None
    preTradeInvalidation: Optional[str] = None
    preTradeRnR: Optional[float] = None

@app.post("/api/agent/analyze-trade")
def analyze_trade_endpoint(request: AnalyzeTradeRequest):
    """
    Invokes LLM quantitative trading mentor to analyze a completed trade.
    """
    from journal.trade_analyzer import analyze_completed_trade
    
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY environment variable is not configured.")
        
    analysis = analyze_completed_trade(request.model_dump(), GROQ_API_KEY)
    return analysis

class WeeklyReviewRequest(BaseModel):
    trades: List[Dict]
    userEmail: str

@app.post("/api/agent/generate-weekly-review")
def generate_weekly_review_endpoint(request: WeeklyReviewRequest):
    """
    Invokes LLM quantitative trading mentor to generate a weekly performance review.
    """
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY environment variable is not configured.")
        
    llm = ChatGroq(
        model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        temperature=0.3,
        groq_api_key=GROQ_API_KEY
    )
    
    system_prompt = (
        "You are an expert quantitative trading psychologist and portfolio manager.\n"
        "Your task is to write a highly professional, constructive, and detailed Weekly Performance Review "
        "in Markdown format based on the user's completed trades from the past week.\n\n"
        "The review must include:\n"
        "1. **Weekly Executive Summary**: Analysis of overall profitability, win rate, and total trades.\n"
        "2. **Strategy Performance**: Evaluation of which strategies performed best/worst (e.g. Breakout vs Mean Reversion).\n"
        "3. **Execution & Risk Management**: Feedback on stop-loss discipline, average risk-to-reward ratios, and whether the trader adhered to their initial theses.\n"
        "4. **Psychological & Emotional Insights**: Observations on patience, greed, or fear based on trade holding times and close reasons.\n"
        "5. **Actionable Recommendations**: 3 concrete, mathematical suggestions for the upcoming week.\n\n"
        "Be encouraging, quantitative, and precise. Use professional trading terminology."
    )
    
    human_prompt = f"Here is the user's completed trades list for the past week:\n{json.dumps(request.trades, indent=2)}"
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt)
    ]
    
    try:
        response = llm.invoke(messages)
        return {"report": response.content}
    except Exception as e:
        print(f"ERROR: Weekly review generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

async def run_whale_indexer():
    import random
    from onchain.whale_indexer import WhaleIndexer
    indexer = WhaleIndexer()
    while True:
        try:
            if manager.active_connections:
                alert = await indexer.generate_whale_alert()
                await manager.broadcast(json.dumps(alert))
        except Exception as e:
            print(f"Error in whale indexer: {e}")
        await asyncio.sleep(random.uniform(6.0, 12.0))

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(run_whale_indexer())

@app.websocket("/api/agent/ws/whale-alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
