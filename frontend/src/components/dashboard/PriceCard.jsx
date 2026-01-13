import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatPercentage } from "../../utils/format";

export const PriceCard = ({ coin, index }) => {
    const isPositive = coin.priceChangePercentage24h >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="glass-card p-6 hover:shadow-2xl transition-all cursor-pointer bg-white dark:bg-dark-200 rounded-2xl shadow-lg"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    {coin.image && (
                        <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
                    )}
                    <div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{coin.symbol}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{coin.name}</p>
                    </div>
                </div>
                {isPositive ? (
                    <TrendingUp className="w-6 h-6 text-success" />
                ) : (
                    <TrendingDown className="w-6 h-6 text-error" />
                )}
            </div>

            <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(coin.currentPrice)}</div>
                <div className={`text-sm font-medium ${isPositive ? "text-success" : "text-error"}`}>
                    {formatPercentage(coin.priceChangePercentage24h)} (24h)
                </div>
            </div>
        </motion.div>
    );
};
