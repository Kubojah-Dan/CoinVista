import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../common/Button";
import { Input } from "../common/Input";

export const AddHoldingModal = ({ onClose, onSubmit, prices = [] }) => {
    const [formData, setFormData] = useState({
        coinId: "",
        symbol: "",
        name: "",
        amount: "",
        purchasePrice: "",
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const next = { ...prev, [name]: value };

            if (name === "symbol") {
                const coin = prices.find((p) => p.symbol === value);
                if (coin) {
                    const purchasePrice = coin.currentPrice ?? coin.current_price ?? "";
                    next.coinId = coin.id || "";
                    next.symbol = coin.symbol || value;
                    next.name = coin.name || "";
                    if (!prev.purchasePrice) {
                        next.purchasePrice = purchasePrice.toString();
                    }
                } else {
                    next.coinId = "";
                }
            }

            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const amount = Number.parseFloat(formData.amount);
        const purchasePrice = Number.parseFloat(formData.purchasePrice);

        if (!formData.symbol || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(purchasePrice) || purchasePrice <= 0) {
            window.alert("Please select a coin and enter valid positive values for amount and purchase price.");
            setLoading(false);
            return;
        }

        try {
            await onSubmit({
                coinId: formData.coinId,
                symbol: formData.symbol.toUpperCase(),
                name: formData.name,
                amount,
                purchasePrice,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-card p-8 max-w-md w-full bg-white dark:bg-dark-200 rounded-2xl shadow-xl"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add Holding</h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-dark-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Cryptocurrency</label>
                            <select
                                name="symbol"
                                value={formData.symbol}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 rounded-xl glass-card border-2 border-transparent focus:border-primary bg-white/50 dark:bg-dark-100/50 text-gray-900 dark:text-gray-100 focus:outline-none cursor-pointer"
                            >
                                <option value="">Select cryptocurrency</option>
                                {prices.map((coin, index) => (
                                    <option key={`${coin.id}-${index}`} value={coin.symbol}>
                                        {coin.name} ({coin.symbol?.toUpperCase()})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <Input
                            type="number"
                            name="amount"
                            label="Amount"
                            placeholder="0.00"
                            step="any"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                        />

                        <Input
                            type="number"
                            name="purchasePrice"
                            label="Purchase Price (USD)"
                            placeholder="0.00"
                            step="any"
                            value={formData.purchasePrice}
                            onChange={handleChange}
                            required
                        />

                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading || !formData.symbol || !formData.amount || !formData.purchasePrice}
                                className="flex-1"
                            >
                                {loading ? "Adding..." : "Add Holding"}
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
