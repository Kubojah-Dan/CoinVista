import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { cryptoAPI } from '../services/api';
import { useCryptoData } from '../hooks/useCryptoData';
import { formatCurrency } from '../utils/format';

const Alerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const { coins, fetchCoins } = useCryptoData();

    useEffect(() => {
        fetchCoins(1, 'usd');
    }, [fetchCoins]);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const response = await cryptoAPI.getAlerts();
            setAlerts(response.data?.alerts || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleDeleteAlert = async (id) => {
        if (!window.confirm('Delete this alert?')) {
            return;
        }
        await cryptoAPI.deleteAlert(id);
        await fetchAlerts();
    };

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-6 py-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Server-Side Price Alerts</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Alerts keep monitoring in the background and can trigger email notifications when configured.
                    </p>
                </motion.div>

                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Alerts</h2>
                    <Button onClick={() => setShowAddModal(true)}>
                        <Plus className="mr-2 h-5 w-5" />
                        Add Alert
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <span className="loading loading-spinner text-primary"></span>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="glass-card rounded-2xl bg-white p-12 text-center shadow-lg dark:bg-dark-200">
                        <Bell className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                        <p className="mb-4 text-gray-600 dark:text-gray-400">No alerts yet. Create your first alert!</p>
                        <Button onClick={() => setShowAddModal(true)}>Create Alert</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {alerts.map((alert, index) => (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200"
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            {alert.name || alert.symbol}
                                        </h3>
                                        <span className={`text-sm ${alert.triggered ? 'text-error' : 'text-success'}`}>
                                            {alert.triggered ? 'Triggered' : 'Monitoring'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteAlert(alert.id)}
                                        className="rounded-lg p-2 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
                                    >
                                        <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </button>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Target</span>
                                        <span className="font-medium">{formatCurrency(alert.targetPrice)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Condition</span>
                                        <span className="font-medium capitalize">{alert.direction}</span>
                                    </div>
                                    {alert.triggeredAt && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Triggered</span>
                                            <span className="font-medium">{new Date(alert.triggeredAt).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {showAddModal && (
                <AddAlertModal
                    coins={coins}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={async () => {
                        setShowAddModal(false);
                        await fetchAlerts();
                    }}
                />
            )}
        </div>
    );
};

const AddAlertModal = ({ coins, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        coinId: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        targetPrice: '',
        direction: 'above',
    });
    const [loading, setLoading] = useState(false);

    const handleCoinChange = (coinId) => {
        const coin = coins.find((item) => item.id === coinId);
        if (!coin) {
            return;
        }
        setFormData((current) => ({
            ...current,
            coinId: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);

        try {
            await cryptoAPI.createAlert({
                coinId: formData.coinId,
                symbol: formData.symbol,
                name: formData.name,
                targetPrice: Number.parseFloat(formData.targetPrice),
                direction: formData.direction,
            });
            await onSuccess();
        } catch (error) {
            window.alert(error.response?.data?.message || 'Failed to create alert');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-dark-200"
            >
                <h3 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Create Price Alert</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Cryptocurrency</label>
                        <select
                            className="select select-bordered w-full"
                            value={formData.coinId}
                            onChange={(event) => handleCoinChange(event.target.value)}
                        >
                            {coins.map((coin) => (
                                <option key={coin.id} value={coin.id}>
                                    {coin.name} ({coin.symbol.toUpperCase()})
                                </option>
                            ))}
                        </select>
                    </div>

                    <Input
                        type="number"
                        label="Target Price (USD)"
                        placeholder="0.00"
                        step="any"
                        value={formData.targetPrice}
                        onChange={(event) => setFormData((current) => ({ ...current, targetPrice: event.target.value }))}
                        required
                    />

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Alert When Price</label>
                        <select
                            value={formData.direction}
                            onChange={(event) => setFormData((current) => ({ ...current, direction: event.target.value }))}
                            className="select select-bordered w-full"
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
                            {loading ? 'Creating...' : 'Create Alert'}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Alerts;
