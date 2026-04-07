import React, { useState, useEffect } from 'react';
import { FaFire } from 'react-icons/fa';
import { cryptoAPI } from '../services/api';

const normalizeTrending = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.coins)) {
    return payload.coins;
  }

  return [];
};

const Trending = () => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const { data } = await cryptoAPI.getTrendingCoins();
        setTrending(normalizeTrending(data?.trending));
      } catch (error) {
        console.error("Error fetching trending:", error);
        setTrending([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold flex items-center gap-2">
        <FaFire className="text-orange-500" />
        <span className="bg-gradient-primary bg-clip-text text-transparent">Trending Coins</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-10">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-2 text-gray-500">Loading trending coins...</p>
          </div>
        ) : trending.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Trending data is temporarily unavailable. Please try again in a moment.
          </div>
        ) : (
          trending.map((entry) => {
            const item = entry?.item || entry;
            if (!item?.id) {
              return null;
            }

            return (
            <div key={item.id} className="glass-card p-6 flex items-center space-x-4 hover:scale-105 transition-transform duration-200">
              <img src={item.large || item.thumb} alt={item.name} className="w-16 h-16 rounded-full" />
              <div>
                <h3 className="font-bold text-xl">{item.name}</h3>
                <p className="text-sm opacity-70 uppercase">{item.symbol}</p>
                <div className="mt-2 text-primary font-medium">
                  Rank #{item.market_cap_rank || 'N/A'}
                </div>
              </div>
            </div>
          )})
        )}
      </div>
    </div>
  );
};

export default Trending;
