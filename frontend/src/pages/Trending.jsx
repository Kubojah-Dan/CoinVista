import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Use axios directly
import { FaFire } from 'react-icons/fa'; // Use consistent icons if possible, or revert to lucide if project prefers. The file uses Lucide? 
// Checking imports: used lucide-react. I'll stick to what was there or what works.
// Actually, earlier files used react-icons. The file I just read used lucide-react.
// To be safe and consistent with my previous Markets.jsx, I will use React Icons (FaFire).

const Trending = () => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        // Direct call to CoinGecko
        const { data } = await axios.get('https://api.coingecko.com/api/v3/search/trending');
        setTrending(data.coins);
      } catch (error) {
        console.error("Error fetching trending:", error);
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
        ) : (
          trending.map(({ item }) => (
            <div key={item.id} className="glass-card p-6 flex items-center space-x-4 hover:scale-105 transition-transform duration-200">
              <img src={item.large} alt={item.name} className="w-16 h-16 rounded-full" />
              <div>
                <h3 className="font-bold text-xl">{item.name}</h3>
                <p className="text-sm opacity-70 uppercase">{item.symbol}</p>
                <div className="mt-2 text-primary font-medium">
                  Rank #{item.market_cap_rank}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Trending;
