import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Bell } from "lucide-react";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import api from "../services/api";
import { formatCurrency } from "../utils/format";

export const Alerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const response = await api.get("/alerts");
                setAlerts(response.data);
            } catch (error) {
                console.error("Failed to fetch alerts:", error);
                // Fallback for demo purposes if backend fails, or just show error
            } finally {
                setLoading(false);
            }
        };
        fetchAlerts();
    }, []);

    const handleDeleteAlert = async (id) => {
        if (!window.confirm("Are you sure you want to delete this alert?")) return;

        try {
            await api.delete(`/alerts/${id}`);
            setAlerts(alerts.filter(a => a._id !== id));
        } catch (error) {
            console.error("Failed to delete alert:", error);
            alert("Failed to delete alert");
        }
    };

    const handleAddAlert = (alertData) => {
        setAlerts([...alerts, { ...alertData, _id: Date.now().toString(), isActive: true }]);
    };

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-6 py-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Price Alerts</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Get notified when cryptocurrencies reach your target prices
                    </p>
                </motion.div>

                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Alerts</h2>
                    <Button onClick={() => setShowAddModal(true)}>
                        <Plus className="w-5 h-5 mr-2" />
                        Add Alert
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <span className="loading loading-spinner text-primary"></span>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="glass-card p-12 text-center bg-white dark:bg-dark-200 rounded-2xl shadow-lg">
                        <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 mb-4">No alerts yet. Create your first alert!</p>
                        <Button onClick={() => setShowAddModal(true)}>Create Alert</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {alerts.map((alert, index) => (
                            <motion.div
                                key={alert._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="glass-card p-6 hover:shadow-2xl transition-shadow bg-white dark:bg-dark-200 rounded-2xl shadow-lg"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                                            <Bell className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{alert.symbol}</h3>
                                            <span
                                                className={`text-sm ${alert.isActive ? "text-success" : "text-gray-500 dark:text-gray-400"}`}
                                            >
                                                {alert.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteAlert(alert._id)}
                                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Target Price:</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                            {formatCurrency(alert.targetPrice)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Condition:</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{alert.direction}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {showAddModal && <AddAlertModal onClose={() => setShowAddModal(false)} onSuccess={handleAddAlert} />}
        </div>
    );
};

const AddAlertModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        symbol: "BTC",
        targetPrice: "",
        direction: "above",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await api.post("/alerts", {
                symbol: formData.symbol,
                targetPrice: Number.parseFloat(formData.targetPrice),
                direction: formData.direction,
            });
            onSuccess(response.data);
            onClose();
        } catch (error) {
            console.error("Failed to create alert:", error);
            alert("Failed to create alert");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-8 max-w-md w-full bg-white dark:bg-dark-200 rounded-2xl shadow-xl"
            >
                <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Create Price Alert</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="text"
                        label="Cryptocurrency Symbol"
                        placeholder="BTC"
                        value={formData.symbol}
                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                        required
                    />

                    <Input
                        type="number"
                        label="Target Price (USD)"
                        placeholder="0.00"
                        step="any"
                        value={formData.targetPrice}
                        onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Alert When Price</label>
                        <select
                            value={formData.direction}
                            onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl glass-card border-2 border-transparent focus:border-primary bg-white/50 dark:bg-dark-100/50 text-gray-900 dark:text-gray-100 focus:outline-none"
                        >
                            <option value="above">Goes Above</option>
                            <option value="below">Goes Below</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? "Creating..." : "Create Alert"}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Alerts;
