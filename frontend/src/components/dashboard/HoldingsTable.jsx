import React from "react";
import { motion } from "framer-motion";
import { Trash2, Edit } from "lucide-react";
import { formatCurrency, formatNumber, formatPercentage } from "../../utils/format";

export const HoldingsTable = ({ holdings = [], onDelete, onEdit, prices = [] }) => {
    const getPriceData = (symbol) => {
        return prices.find((p) => p.symbol === symbol) || null;
    };

    const calculateValue = (holding) => {
        const priceData = getPriceData(holding.symbol);
        return priceData ? holding.amount * priceData.currentPrice : 0;
    };

    const calculateProfit = (holding) => {
        const currentValue = calculateValue(holding);
        const investedValue = holding.amount * holding.purchasePrice;
        return currentValue - investedValue;
    };

    const calculateProfitPercentage = (holding) => {
        const profit = calculateProfit(holding);
        const investedValue = holding.amount * holding.purchasePrice;
        return investedValue > 0 ? (profit / investedValue) * 100 : 0;
    };

    if (holdings.length === 0) {
        return (
            <div className="glass-card p-12 text-center bg-white dark:bg-dark-200 rounded-2xl shadow-lg">
                <p className="text-gray-600 dark:text-gray-400">No holdings yet. Add your first cryptocurrency!</p>
            </div>
        );
    }

    return (
        <div className="glass-card overflow-hidden bg-white dark:bg-dark-200 rounded-2xl shadow-lg">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Asset</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Amount</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Price</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Value</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                                Profit/Loss
                            </th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {holdings.map((holding, index) => {
                            const priceData = getPriceData(holding.symbol);
                            const currentValue = calculateValue(holding);
                            const profit = calculateProfit(holding);
                            const profitPercentage = calculateProfitPercentage(holding);
                            const isProfit = profit >= 0;

                            return (
                                <motion.tr
                                    key={holding._id || index}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-dark-100/50"
                                >
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{holding.symbol}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">{holding.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100">
                                        {formatNumber(holding.amount, 4)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100">
                                        {priceData ? formatCurrency(priceData.currentPrice) : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-gray-100">
                                        {formatCurrency(currentValue)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={`font-medium ${isProfit ? "text-success" : "text-error"}`}>
                                            {formatCurrency(profit)}
                                        </div>
                                        <div className={`text-sm ${isProfit ? "text-success" : "text-error"}`}>
                                            {formatPercentage(profitPercentage)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => onEdit && onEdit(holding)}
                                                className="p-2 hover:bg-gray-200 dark:hover:bg-dark-100 rounded-lg transition-colors"
                                            >
                                                <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                            </button>
                                            <button
                                                onClick={() => onDelete && onDelete(holding._id)}
                                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
