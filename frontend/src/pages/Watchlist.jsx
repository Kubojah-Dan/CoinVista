import React from 'react';

const Watchlist = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
        My Watchlist
      </h2>
      <div className="glass-card p-12 text-center">
        <p className="text-xl text-gray-500 dark:text-gray-400">
          Your watchlist is empty. Add coins from the Markets page to track them here!
        </p>
        {/* Future implementation: List saved coins from local storage or backend */}
      </div>
    </div>
  );
};

export default Watchlist;