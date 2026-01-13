import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const CryptoCard = ({ coin }) => {
  const priceChangeColor = coin.price_change_percentage_24h > 0 ? 'text-success' : 'text-error';

  const chartData = {
    labels: coin.sparkline_in_7d.price.map((_, i) => i),
    datasets: [
      {
        data: coin.sparkline_in_7d.price,
        borderColor: coin.price_change_percentage_24h > 0 ? '#10B981' : '#EF4444',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

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
            <div className="text-lg font-bold">${coin.current_price.toLocaleString()}</div>
            <div className={`text-sm ${priceChangeColor}`}>
              {coin.price_change_percentage_24h.toFixed(2)}%
            </div>
          </div>
        </div>
        <div className="h-16 w-full">
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
};

export default CryptoCard;
