import React from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useTheme } from "../../context/ThemeContext";
import { formatCurrency } from "../../utils/format";

export const PortfolioChart = ({ data }) => {
    const { isDark } = useTheme();

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-card p-3 bg-white/90 dark:bg-black/80 rounded-lg shadow-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(payload[0].value)}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{payload[0].payload.date}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-card p-6 bg-white dark:bg-dark-200 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">Portfolio Value</h3>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#E5E7EB"} />
                    <XAxis dataKey="date" stroke={isDark ? "#9CA3AF" : "#6B7280"} fontSize={12} />
                    <YAxis stroke={isDark ? "#9CA3AF" : "#6B7280"} fontSize={12} tickFormatter={(value) => `$${value}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fill="url(#colorValue)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
