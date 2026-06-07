import React from 'react';
import { formatPercentage, toSafeNumber } from '../utils/format';

const CryptoCard = ({ coin }) => {
  const priceChange24h = toSafeNumber(coin.price_change_percentage_24h);
  const priceChangeColor = priceChange24h > 0 ? 'text-success' : 'text-error';

  const prices = coin.sparkline_in_7d?.price || [];
  const min = prices.length > 0 ? Math.min(...prices) : 0;
  const max = prices.length > 0 ? Math.max(...prices) : 100;
  const range = max - min === 0 ? 1 : max - min;

  // Scale coordinates to fit a 100x40 viewBox with a 2px vertical padding
  const points = prices.map((price, index) => {
    const x = (index / Math.max(1, prices.length - 1)) * 100;
    const y = 38 - ((price - min) / range) * 36;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const pathD = points.length > 0 ? `M ${points.join(' L ')}` : '';

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="card-body p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <img src={coin.image} alt={coin.name} className="w-10 h-10" />
            <div>
              <h3 className="card-title text-lg">{coin.name}</h3>
              <span className="uppercase text-sm text-gray-500">{coin.symbol}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">${toSafeNumber(coin.current_price).toLocaleString()}</div>
            <div className={`text-sm ${priceChangeColor}`}>
              {formatPercentage(priceChange24h)}
            </div>
          </div>
        </div>
        <div className="h-16 w-full overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={priceChange24h > 0 ? '#10B981' : '#EF4444'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default CryptoCard;
