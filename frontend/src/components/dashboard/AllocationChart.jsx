import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "../../utils/format";

const COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899", "#6366F1"];

export const AllocationChart = ({ data }) => {
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-card p-3 bg-white/90 dark:bg-black/80 rounded-lg shadow-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{payload[0].name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{formatCurrency(payload[0].value)}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{payload[0].payload.percentage}%</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-card p-6 bg-white dark:bg-dark-200 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">Portfolio Allocation</h3>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_240px] xl:items-center">
                <div className="h-[300px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
                                innerRadius={54}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    {data.map((entry, index) => (
                        <div key={`${entry.symbol}-${index}`} className="flex items-start gap-3 rounded-xl bg-base-200/70 p-3 dark:bg-dark-100/80">
                            <span
                                className="mt-1 h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{entry.name}</div>
                                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">{entry.symbol}</div>
                                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                    {formatCurrency(entry.value)} · {entry.percentage}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
