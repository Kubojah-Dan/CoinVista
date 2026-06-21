import React, { useEffect, useState, useRef } from 'react';
import { Radio } from 'lucide-react';

const WhaleAlertMarquee = () => {
    const [alerts, setAlerts] = useState([
        {
            address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
            coin: 'BTC',
            amount: 145.2,
            valueUsd: 9438000,
            source: 'Private Whale Wallet',
            destination: 'Binance',
            timestamp: Date.now() - 50000
        },
        {
            address: '0x28C6c06298d514Db089934071355E5743bf21d60',
            coin: 'ETH',
            amount: 2800.0,
            valueUsd: 9800000,
            source: 'Kraken Wallet',
            destination: 'Private Whale Wallet',
            timestamp: Date.now() - 120000
        },
        {
            address: '0xab7c8803962c0f2f5bbbe3fa769948937e26852d',
            coin: 'SOL',
            amount: 32000.0,
            valueUsd: 4480000,
            source: 'Private Whale Wallet',
            destination: 'Uniswap Pool',
            timestamp: Date.now() - 250000
        }
    ]);
    const socketRef = useRef(null);

    useEffect(() => {
        // Connect to FastAPI agent websocket
        const wsUrl = 'ws://localhost:8000/api/agent/ws/whale-alerts';
        let ws;
        let reconnectTimeout;
        
        const connect = () => {
            ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data && data.address) {
                        setAlerts(prev => {
                            // Keep only unique last 10 alerts
                            const isDuplicate = prev.some(a => a.timestamp === data.timestamp);
                            if (isDuplicate) return prev;
                            const newAlerts = [data, ...prev];
                            return newAlerts.slice(0, 10);
                        });
                    }
                } catch (e) {
                    console.error('Error parsing whale alert', e);
                }
            };

            ws.onerror = (err) => {
                console.warn('Whale alert websocket error, closing...', err);
                ws.close();
            };

            ws.onclose = () => {
                reconnectTimeout = setTimeout(connect, 5000); // Reconnect in 5s
            };
        };

        connect();

        return () => {
            if (ws) ws.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, []);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val);
    };

    // Duplicate alerts list for seamless scrolling
    const list = [...alerts, ...alerts];

    return (
        <div className="relative w-full overflow-hidden bg-gradient-to-r from-red-500/10 via-amber-500/5 to-blue-500/10 border border-red-500/20 py-2 mb-6 backdrop-blur-md rounded-xl flex items-center gap-3">
            <div className="flex-shrink-0 flex items-center gap-1.5 bg-red-600 text-white font-extrabold px-3 py-1.5 text-xs uppercase tracking-wider rounded-r-md shadow-lg border-r border-red-400">
                <Radio className="h-3 w-3 animate-pulse" />
                Live Whale Alerts
            </div>
            
            <div className="flex-1 overflow-hidden">
                <div className="animate-marquee-slow flex whitespace-nowrap gap-12 text-sm">
                    {list.map((alert, idx) => (
                        <div key={idx} className="flex-shrink-0 flex items-center gap-3 bg-white/5 dark:bg-black/20 border border-white/10 dark:border-white/5 px-4 py-1.5 rounded-full shadow-sm text-gray-700 dark:text-gray-300">
                            <span className="font-bold text-red-500 flex items-center gap-1 animate-pulse">
                                🚨 WHALE TRANSFER
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {alert.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {alert.coin}
                            </span>
                            <span className="text-gray-400 text-xs">
                                ({formatCurrency(alert.valueUsd)})
                            </span>
                            <span className="text-gray-500">
                                from <span className="font-medium text-blue-500">{alert.source}</span> to <span className="font-medium text-purple-500">{alert.destination}</span>
                            </span>
                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono">
                                {alert.address.slice(0, 6)}...{alert.address.slice(-4)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WhaleAlertMarquee;
