from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter(prefix="/api/agent")

class BacktestRequest(BaseModel):
    strategyRules: Dict[str, Any]
    symbol: str = "BTCUSDT"
    interval: str = "1h"

@router.post("/backtest")
def run_backtest_endpoint(request: BacktestRequest):
    try:
        from strategy.backtest_engine import run_backtest
        res = run_backtest(request.strategyRules, request.symbol, request.interval)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
