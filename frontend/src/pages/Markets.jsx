import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSearch } from 'react-icons/fa';

const Markets = () => {
    const [coins, setCoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchMarkets = async () => {
            try {
                // Using Coingecko public API directly for frontend demo to ensure data
                // In production, should proxy through backend
                const { data } = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                    params: {
                        vs_currency: 'usd',
                        order: 'market_cap_desc',
                        per_page: 50,
                        page: 1,
                        sparkline: false
                    }
                });
                setCoins(data);
            } catch (error) {
                console.error("Error fetching markets:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMarkets();
    }, []);

    const filteredCoins = coins.filter(coin =>
        coin.name.toLowerCase().includes(search.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    Crypto Markets
                </h2>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search coins..."
                        className="input input-bordered w-full max-w-xs pl-10 bg-white/50 dark:bg-dark-100/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th>Rank</th>
                                <th>Coin</th>
                                <th>Price</th>
                                <th>24h Change</th>
                                <th>Market Cap</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-4">Loading markets...</td></tr>
                            ) : (
                                filteredCoins.map((coin) => (
                                    <tr key={coin.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-200/50 transition-colors">
                                        <td>{coin.market_cap_rank}</td>
                                        <td>
                                            <div className="flex items-center space-x-3">
                                                <img src={coin.image} alt={coin.name} className="w-8 h-8" />
                                                <div>
                                                    <div className="font-bold">{coin.name}</div>
                                                    <div className="text-sm opacity-50 uppercase">{coin.symbol}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>${coin.current_price.toLocaleString()}</td>
                                        <td className={coin.price_change_percentage_24h > 0 ? 'text-success' : 'text-error'}>
                                            {coin.price_change_percentage_24h?.toFixed(2)}%
                                        </td>
                                        <td>${coin.market_cap.toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Markets;
