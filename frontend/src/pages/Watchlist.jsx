import { Link } from "react-router-dom";
import { Trash2, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { useWatchlist } from "../hooks/useCryptoData";
import { formatCurrency } from "../utils/format";

const Watchlist = () => {
  const { watchlist, loading, removeFromWatchlist } = useWatchlist();

  const handleRemove = async (e, id) => {
    e.preventDefault(); // Prevent navigation if clicking delete inside a link
    await removeFromWatchlist(id);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <span className="loading loading-spinner text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 container mx-auto px-6 py-8">
      <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
        My Watchlist
      </h2>

      {watchlist.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-xl text-gray-500 dark:text-gray-400 mb-4">
            Your watchlist is empty. Add coins from the Markets page to track them here!
          </p>
          <Link to="/dashboard" className="btn btn-primary">
            Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {watchlist.map((coin) => (
            <Link to={`/coin/${coin.id}`} key={coin.id} className="block">
              <div className="glass-card p-6 hover:shadow-xl transition-all bg-white dark:bg-dark-200 rounded-2xl relative group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{coin.name}</h3>
                      <span className="text-sm text-gray-500 uppercase">{coin.symbol}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleRemove(e, coin.id)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from watchlist"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Current Price</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(coin.current_price)}
                    </div>
                  </div>
                  <div className={`flex items-center ${coin.price_change_percentage_24h >= 0 ? "text-success" : "text-error"}`}>
                    {coin.price_change_percentage_24h >= 0 ?
                      <TrendingUp className="w-4 h-4 mr-1" /> :
                      <TrendingDown className="w-4 h-4 mr-1" />
                    }
                    <span className="font-bold">{Math.abs(coin.price_change_percentage_24h).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Watchlist;