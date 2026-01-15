import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCoinDetails, useCoinChart } from '../hooks/useCryptoData';
import { useWatchlist, useAlerts } from '../hooks/useCryptoData';
import { subscribeToCoin, unsubscribeFromCoin } from '../services/socket';
import { toast } from 'react-toastify';
import PriceChart from '../components/PriceChart';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ArrowLeft,
  Plus,
  Minus,
  Bell,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  Globe,
  Twitter,
  MessageCircle
} from 'lucide-react';

const CoinDetail = () => {
  const { id } = useParams();
  const { coin, loading: detailsLoading, error: detailsError } = useCoinDetails(id);
  const { chartData, loading: chartLoading, fetchChartData } = useCoinChart(id);
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { createAlert } = useAlerts();

  const [selectedDays, setSelectedDays] = useState(7);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertData, setAlertData] = useState({
    condition: 'above',
    targetPrice: ''
  });

  React.useEffect(() => {
    subscribeToCoin(id);
    return () => {
      unsubscribeFromCoin(id);
    };
  }, [id]);

  const handleDaysChange = (days) => {
    setSelectedDays(days);
    fetchChartData(id, days);
  };

  const isInWatchlist = watchlist.some(c => c.id === id);

  const handleWatchlistToggle = async () => {
    if (isInWatchlist) {
      const result = await removeFromWatchlist(id);
      if (result.success) {
        toast.success('Removed from watchlist');
      } else {
        toast.error(result.error);
      }
    } else {
      const result = await addToWatchlist(id);
      if (result.success) {
        toast.success('Added to watchlist');
      } else {
        toast.error(result.error);
      }
    }
  };

  const handleCreateAlert = async () => {
    if (!alertData.targetPrice) {
      toast.error('Please enter a target price');
      return;
    }

    const result = await createAlert({
      symbol: coin.symbol.toUpperCase(),
      direction: alertData.condition,
      targetPrice: parseFloat(alertData.targetPrice)
    });

    if (result.success) {
      toast.success('Alert created successfully');
      setShowAlertModal(false);
      setAlertData({ condition: 'above', targetPrice: '' });
    } else {
      toast.error(result.error);
    }
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: value < 1 ? 6 : 2,
      maximumFractionDigits: value < 1 ? 6 : 2,
    }).format(value);
  };

  const formatLargeNumber = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
    }).format(value);
  };

  if (detailsLoading || chartLoading) {
    return <LoadingSpinner size="lg" text="Loading coin details..." />;
  }

  if (detailsError) {
    return (
      <div className="alert alert-error max-w-md mx-auto mt-10">
        <span>{detailsError}</span>
      </div>
    );
  }

  if (!coin) {
    return <div>Coin not found</div>;
  }

  const marketData = coin.market_data;
  const priceChange24h = marketData?.price_change_percentage_24h || 0;
  const isPositive = priceChange24h >= 0;

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            className="btn btn-ghost btn-sm mb-4"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={coin.image?.large}
                alt={coin.name}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <h1 className="text-4xl font-bold">{coin.name}</h1>
                <p className="text-xl opacity-70 uppercase">{coin.symbol}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className={`btn ${isInWatchlist ? 'btn-error' : 'btn-primary'}`}
                onClick={handleWatchlistToggle}
              >
                {isInWatchlist ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowAlertModal(true)}
              >
                <Bell className="w-4 h-4 mr-2" />
                Set Alert
              </button>
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {[1, 7, 14, 30, 90, 365].map((days) => (
              <button
                key={days}
                className={`btn btn-sm ${selectedDays === days ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleDaysChange(days)}
              >
                {days === 1 ? '24H' : days === 365 ? '1Y' : `${days}D`}
              </button>
            ))}
          </div>
          <PriceChart history={chartData?.prices?.map(item => item[1]) || []} coinName={coin.name} />
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Price Information */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">
                <DollarSign className="w-6 h-6" />
                Price Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm opacity-70">Current Price</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(marketData?.current_price?.usd)}
                  </div>
                </div>
                <div>
                  <div className="text-sm opacity-70">24h Change</div>
                  <div className={`text-2xl font-bold flex items-center ${isPositive ? 'text-success' : 'text-error'}`}>
                    {isPositive ? <TrendingUp className="w-5 h-5 mr-1" /> : <TrendingDown className="w-5 h-5 mr-1" />}
                    {Math.abs(priceChange24h).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm opacity-70">24h High</div>
                  <div className="font-semibold">{formatCurrency(marketData?.high_24h?.usd)}</div>
                </div>
                <div>
                  <div className="text-sm opacity-70">24h Low</div>
                  <div className="font-semibold">{formatCurrency(marketData?.low_24h?.usd)}</div>
                </div>
                <div>
                  <div className="text-sm opacity-70">All Time High</div>
                  <div className="font-semibold">{formatCurrency(marketData?.ath?.usd)}</div>
                </div>
                <div>
                  <div className="text-sm opacity-70">All Time Low</div>
                  <div className="font-semibold">{formatCurrency(marketData?.atl?.usd)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Market Statistics */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">
                <BarChart3 className="w-6 h-6" />
                Market Statistics
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm opacity-70">Market Cap</div>
                  <div className="font-semibold">{formatLargeNumber(marketData?.market_cap?.usd)}</div>
                </div>
                <div>
                  <div className="text-sm opacity-70">Market Cap Rank</div>
                  <div className="font-semibold">#{coin.market_cap_rank}</div>
                </div>
                <div>
                  <div className="text-sm opacity-70">24h Volume</div>
                  <div className="font-semibold">{formatLargeNumber(marketData?.total_volume?.usd)}</div>
                </div>
                <div>
                  <div className="text-sm opacity-70">Circulating Supply</div>
                  <div className="font-semibold">
                    {new Intl.NumberFormat('en-US').format(marketData?.circulating_supply)} {coin.symbol.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-sm opacity-70">Total Supply</div>
                  <div className="font-semibold">
                    {marketData?.total_supply ? new Intl.NumberFormat('en-US').format(marketData.total_supply) : 'N/A'} {coin.symbol.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-sm opacity-70">Max Supply</div>
                  <div className="font-semibold">
                    {marketData?.max_supply ? new Intl.NumberFormat('en-US').format(marketData.max_supply) : '∞'} {coin.symbol.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <Activity className="w-6 h-6" />
              About {coin.name}
            </h2>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: coin.description?.en || 'No description available.' }}
            />
          </div>
        </div>

        {/* Links */}
        {coin.links?.homepage && coin.links.homepage[0] && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">
                <Globe className="w-6 h-6" />
                Official Links
              </h2>
              <a
                href={coin.links.homepage[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary"
              >
                {coin.links.homepage[0]}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Alert Modal */}
      {showAlertModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              <Bell className="w-5 h-5 inline mr-2" />
              Set Price Alert for {coin.name}
            </h3>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Condition</span>
              </label>
              <select
                className="select select-bordered"
                value={alertData.condition}
                onChange={(e) => setAlertData({ ...alertData, condition: e.target.value })}
              >
                <option value="above">Price goes above</option>
                <option value="below">Price goes below</option>
              </select>
            </div>

            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">Target Price (USD)</span>
              </label>
              <input
                type="number"
                step="any"
                className="input input-bordered"
                placeholder="Enter target price"
                value={alertData.targetPrice}
                onChange={(e) => setAlertData({ ...alertData, targetPrice: e.target.value })}
              />
              <label className="label">
                <span className="label-text-alt">Current price: {formatCurrency(marketData?.current_price?.usd)}</span>
              </label>
            </div>

            <div className="modal-action">
              <button
                className="btn"
                onClick={() => setShowAlertModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateAlert}
              >
                Create Alert
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowAlertModal(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default CoinDetail;