import { useState, useEffect } from "react";
import { cryptoAPI } from "../services/api";
import { connectSocket, disconnectSocket, onPriceUpdates } from "../services/socket";
import { toSafeNumber } from "../utils/format";

const normalizePrice = (coin) => ({
    id: coin?.id || "",
    symbol: coin?.symbol ? coin.symbol.toUpperCase() : "",
    name: coin?.name || "",
    currentPrice: toSafeNumber(coin?.currentPrice ?? coin?.current_price),
    priceChangePercentage24h: toSafeNumber(
        coin?.priceChangePercentage24h ?? coin?.price_change_percentage_24h
    ),
    image: coin?.image || "",
});

export const useSocket = () => {
    const [prices, setPrices] = useState([]);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        let subscription;
        let isMounted = true;

        const fetchPrices = async () => {
            try {
                const response = await cryptoAPI.getTopCoins({ page: 1, perPage: 20, currency: "usd" });
                if (isMounted) {
                    const initialPrices = Array.isArray(response.data?.coins) ? response.data.coins : [];
                    setPrices(initialPrices.map(normalizePrice));
                }
            } catch (error) {
                console.error("Error fetching prices:", error);
            }
        };

        fetchPrices();
        connectSocket({
            onConnect: () => {
                if (!isMounted) return;
                setConnected(true);
                subscription = onPriceUpdates((incomingPrices) => {
                    if (!isMounted) return;
                    const livePrices = Array.isArray(incomingPrices) ? incomingPrices : [];
                    setPrices(livePrices.map(normalizePrice));
                });
            },
            onDisconnect: () => {
                if (isMounted) {
                    setConnected(false);
                }
            },
            onError: () => {
                if (isMounted) {
                    setConnected(false);
                }
            },
        });

        return () => {
            isMounted = false;
            subscription?.unsubscribe();
            disconnectSocket();
        };
    }, []);

    return { prices, connected };
};
