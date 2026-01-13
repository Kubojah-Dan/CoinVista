import { useState, useEffect } from "react";
import axios from "axios";

// Using CoinGecko API for "socket" simulation since we don't have a real WebSocket server set up yet for live prices
const COINGECKO_API_URL = "https://api.coingecko.com/api/v3";

export const useSocket = () => {
    const [prices, setPrices] = useState([]);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const response = await axios.get(`${COINGECKO_API_URL}/coins/markets`, {
                    params: {
                        vs_currency: "usd",
                        order: "market_cap_desc",
                        per_page: 20,
                        page: 1,
                        sparkline: false,
                        price_change_percentage: "24h"
                    }
                });

                // Transform data on the fly if needed to match expected shape
                const formattedPrices = response.data.map(coin => ({
                    symbol: coin.symbol.toUpperCase(),
                    name: coin.name,
                    currentPrice: coin.current_price,
                    priceChangePercentage24h: coin.price_change_percentage_24h,
                    image: coin.image,
                    id: coin.id
                }));

                setPrices(formattedPrices);
                setConnected(true);
            } catch (error) {
                console.error("Error fetching prices:", error);
                setConnected(false);
            }
        };

        // Initial fetch
        fetchPrices();

        // Poll every 60 seconds to respect API limits
        const interval = setInterval(fetchPrices, 60000);

        return () => clearInterval(interval);
    }, []);

    return { prices, connected };
};
