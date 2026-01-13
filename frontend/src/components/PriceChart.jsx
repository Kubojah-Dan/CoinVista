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
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PriceChart = ({ history, coinName = 'Bitcoin' }) => {
  // Determine color based on trend
  const isUp = history.length > 0 && history[history.length - 1] >= history[0];
  const color = isUp ? '#10B981' : '#EF4444';
  const backgroundColor = isUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  const data = {
    labels: history.map((_, i) => i),
    datasets: [
      {
        fill: true,
        label: coinName,
        data: history,
        borderColor: color,
        backgroundColor: backgroundColor,
        tension: 0.4,
        pointRadius: 0,
        hoverPointRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        display: false, // Hide x-axis labels for clean look
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          callback: function (value) {
            return '$' + value.toLocaleString();
          }
        }
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <div className="w-full h-[400px] p-4 bg-base-100 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">{coinName} Price Chart</h3>
      </div>
      <div className="h-[300px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default PriceChart;
