import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, TrendingUp, DollarSign, Wallet } from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { PriceCard } from "../components/dashboard/PriceCard";
import { PortfolioChart } from "../components/dashboard/PortfolioChart";
import { AllocationChart } from "../components/dashboard/AllocationChart";
import { HoldingsTable } from "../components/dashboard/HoldingsTable";
import { AddHoldingModal } from "../components/dashboard/AddHoldingModal";
import { formatCurrency, formatPercentage } from "../utils/format";

const Dashboard = () => {
    const { prices, connected } = useSocket();
    const { user } = useAuth();
    const [holdings, setHoldings] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Mock data removed. Using real API.

    useEffect(() => {
        const fetchHoldings = async () => {
            try {
                const response = await api.get("/holdings");
                setHoldings(response.data);
            } catch (error) {
                console.error("Failed to fetch holdings:", error);
                setHoldings([]);
            } finally {
                setLoading(false);
            }
        };
        fetchHoldings();
    }, []);

    const handleAddHolding = async (holdingData) => {
        try {
            const response = await api.post("/holdings", holdingData);
            setHoldings([...holdings, response.data]);
            setShowAddModal(false);
        } catch (error) {
            console.error("Failed to add holding:", error);
            alert("Failed to add holding");
        }
    };

    const handleDeleteHolding = async (id) => {
        if (!window.confirm("Are you sure you want to delete this holding?")) return;

        try {
            await api.delete(`/holdings/${id}`);
            setHoldings(holdings.filter(h => h._id !== id));
        } catch (error) {
            console.error("Failed to delete holding:", error);
            alert("Failed to delete holding");
        }
    };

    // Calculate portfolio stats
    const calculatePortfolioValue = () => {
        return holdings.reduce((total, holding) => {
            const priceData = prices.find((p) => p.symbol === holding.symbol);
            // Use purchase price as fallback if socket price not yet available
            const price = priceData ? priceData.currentPrice : holding.purchasePrice;
            return total + (holding.amount * price);
        }, 0);
    };

    const calculateTotalInvested = () => {
        return holdings.reduce((total, holding) => {
            return total + holding.amount * holding.purchasePrice;
        }, 0);
    };

    const portfolioValue = calculatePortfolioValue();
    const totalInvested = calculateTotalInvested();
    const totalProfit = portfolioValue - totalInvested;
    const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    // Generate chart data (mocked for visualization)
    const chartData = [
        { date: "Mon", value: totalInvested * 0.95 },
        { date: "Tue", value: totalInvested * 0.98 },
        { date: "Wed", value: totalInvested * 1.02 },
        { date: "Thu", value: totalInvested * 1.01 },
        { date: "Fri", value: totalInvested * 1.05 },
        { date: "Sat", value: portfolioValue * 0.98 },
        { date: "Sun", value: portfolioValue },
    ];

    const allocationData = holdings.map((holding) => {
        const priceData = prices.find((p) => p.symbol === holding.symbol);
        const price = priceData ? priceData.currentPrice : holding.purchasePrice;
        const value = holding.amount * price;
        const percentage = portfolioValue > 0 ? ((value / portfolioValue) * 100).toFixed(1) : 0;
        return {
            name: holding.symbol,
            value: value,
            percentage: percentage,
        };
    });

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-6 py-8">
                {/* Welcome Section */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Welcome back, {user?.name || "User"}!
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Track your crypto portfolio in real-time
                        {connected && <span className="ml-2 text-success">● Live</span>}
                    </p>
                </motion.div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-6 bg-white dark:bg-dark-200 rounded-2xl shadow-lg"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600 dark:text-gray-400">Total Value</span>
                            <DollarSign className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(portfolioValue)}</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-6 bg-white dark:bg-dark-200 rounded-2xl shadow-lg"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600 dark:text-gray-400">Total Profit/Loss</span>
                            <TrendingUp className={`w-5 h-5 ${totalProfit >= 0 ? "text-success" : "text-error"}`} />
                        </div>
                        <div className={`text-3xl font-bold ${totalProfit >= 0 ? "text-success" : "text-error"}`}>
                            {formatCurrency(totalProfit)}
                        </div>
                        <div className={`text-sm ${totalProfit >= 0 ? "text-success" : "text-error"}`}>
                            {formatPercentage(profitPercentage)}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass-card p-6 bg-white dark:bg-dark-200 rounded-2xl shadow-lg"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600 dark:text-gray-400">Holdings</span>
                            <Wallet className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{holdings.length}</div>
                    </motion.div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <PortfolioChart data={chartData} />
                    <AllocationChart data={allocationData} />
                </div>

                {/* Live Prices */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-8">
                    <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Live Cryptocurrency Prices</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {prices.slice(0, 8).map((coin, index) => (
                            <PriceCard key={coin.symbol} coin={coin} index={index} />
                        ))}
                    </div>
                </motion.div>

                {/* Holdings Section */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Holdings</h2>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-xl hover:shadow-lg transition-shadow"
                        >
                            <Plus className="w-5 h-5" />
                            Add Holding
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-12">
                            <span className="loading loading-spinner text-primary"></span>
                        </div>
                    ) : (
                        <HoldingsTable holdings={holdings} onDelete={handleDeleteHolding} onEdit={() => { }} prices={prices} />
                    )}
                </motion.div>
            </div>

            {/* Add Holding Modal */}
            {showAddModal && (
                <AddHoldingModal onClose={() => setShowAddModal(false)} onSubmit={handleAddHolding} prices={prices} />
            )}
        </div>
    );
};

export default Dashboard;
