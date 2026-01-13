import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { cryptoAPI } from '../services/api';

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (searchQuery) => {
    setQuery(searchQuery);
    
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    try {
      setLoading(true);
      const response = await cryptoAPI.searchCoins(searchQuery);
      setResults(response.data.results.coins || []);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCoinSelect = (coinId) => {
    navigate(`/coin/${coinId}`);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    }
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit}>
        <div className="form-control">
          <div className="input-group">
            <input
              type="text"
              placeholder="Search cryptocurrencies..."
              className="input input-bordered w-full"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => query.trim().length >= 2 && setShowResults(true)}
            />
            <button className="btn btn-square btn-primary">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </form>

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-base-100 shadow-xl rounded-xl border border-base-300 overflow-hidden">
          <ul className="menu menu-compact">
            {results.map((coin) => (
              <li key={coin.id}>
                <button
                  onClick={() => handleCoinSelect(coin.id)}
                  className="flex items-center gap-3 py-3"
                >
                  <img
                    src={coin.thumb}
                    alt={coin.name}
                    className="w-6 h-6 rounded-full"
                  />
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{coin.name}</div>
                    <div className="text-xs opacity-70 uppercase">{coin.symbol}</div>
                  </div>
                  <div className="text-xs opacity-50">Rank #{coin.market_cap_rank || 'N/A'}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading && (
        <div className="absolute z-50 w-full mt-2 bg-base-100 shadow-xl rounded-xl p-4 flex justify-center">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      )}
    </div>
  );
};

export default SearchBar;