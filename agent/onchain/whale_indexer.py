import asyncio
import json
import random
import time
from typing import Dict, Any

class WhaleIndexer:
    def __init__(self):
        self.whales = [
            "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", # Binance Cold Wallet
            "0x28C6c06298d514Db089934071355E5743bf21d60", # Binance 14
            "0x50382897693f3d357d762e5b60098f98ec436a5a", # Kraken Wallet
            "0xab7c8803962c0f2f5bbbe3fa769948937e26852d", # Uniswap Router
        ]

    async def generate_whale_alert(self) -> Dict[str, Any]:
        address = random.choice(self.whales)
        coins = ["BTC", "ETH", "USDT", "LINK", "SOL"]
        coin = random.choice(coins)
        amount = round(random.uniform(500, 15000), 2)
        price_multipliers = {"BTC": 65000, "ETH": 3500, "USDT": 1, "LINK": 15, "SOL": 140}
        value_usd = amount * price_multipliers[coin]
        
        # Only report whale alerts over $100,000 equivalent
        if value_usd < 100000:
            value_usd = 100000 + random.uniform(5000, 500000)
            amount = value_usd / price_multipliers[coin]

        destinations = ["Binance", "Coinbase", "Kraken", "Uniswap Pool", "Unknown Wallet"]
        source = "Private Whale Wallet"
        destination = random.choice(destinations)

        return {
            "address": address,
            "coin": coin,
            "amount": round(amount, 4),
            "valueUsd": round(value_usd, 2),
            "source": source,
            "destination": destination,
            "timestamp": int(time.time() * 1000)
        }
