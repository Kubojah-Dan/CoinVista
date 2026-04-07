import { useEffect, useMemo, useState } from 'react';
import { Repeat2, TrendingUp, Wallet } from 'lucide-react';
import { useCryptoData } from '../hooks/useCryptoData';
import { paperTradingAPI } from '../services/api';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/format';

const PaperTrading = () => {
    const { coins, fetchCoins } = useCryptoData();
    const [summary, setSummary] = useState({
        startingBalance: 10000,
        cashBalance: 0,
        marketValue: 0,
        totalValue: 0,
        realizedPnl: 0,
        unrealizedPnl: 0,
        totalPnl: 0,
        positions: [],
        trades: [],
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        coinId: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        side: 'buy',
        quantity: '',
    });

    useEffect(() => {
        fetchCoins(1, 'usd');
    }, [fetchCoins]);

    const loadSummary = async () => {
        setLoading(true);
        try {
            const response = await paperTradingAPI.getSummary();
            setSummary(response.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSummary();
    }, []);

    const handleCoinChange = (event) => {
        const selected = coins.find((coin) => coin.id === event.target.value);
        if (!selected) {
            return;
        }
        setForm((current) => ({
            ...current,
            coinId: selected.id,
            symbol: selected.symbol.toUpperCase(),
            name: selected.name,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        try {
            const response = await paperTradingAPI.placeTrade({
                ...form,
                quantity: Number.parseFloat(form.quantity),
            });
            setSummary(response.data);
            setForm((current) => ({ ...current, quantity: '' }));
        } catch (error) {
            window.alert(error.response?.data?.message || 'Failed to place simulator trade');
        } finally {
            setSubmitting(false);
        }
    };

    const resetSimulator = async () => {
        if (!window.confirm('Reset the simulator back to the starting balance?')) {
            return;
        }
        const response = await paperTradingAPI.reset();
        setSummary(response.data);
    };

    const totalPnlPositive = summary.totalPnl >= 0;
    const selectedCoinPrice = useMemo(() => {
        const coin = coins.find((item) => item.id === form.coinId);
        return coin?.current_price || 0;
    }, [coins, form.coinId]);
    const requestedQuantity = Number.parseFloat(form.quantity) || 0;
    const maxAffordableQuantity = selectedCoinPrice > 0
        ? summary.cashBalance / selectedCoinPrice
        : 0;
    const insufficientCash = form.side === 'buy'
        && requestedQuantity > 0
        && selectedCoinPrice > 0
        && (requestedQuantity * selectedCoinPrice) > summary.cashBalance;
    const totalPnlPercentage = summary.startingBalance > 0
        ? (summary.totalPnl / summary.startingBalance) * 100
        : 0;

    return (
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Paper Trading Simulator</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Practice allocation, risk management, and trade execution with a safe $10,000 virtual balance.
                    </p>
                </div>
                <button className="btn btn-outline" onClick={resetSimulator}>
                    <Repeat2 className="h-4 w-4" />
                    Reset simulator
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                <StatBox title="Starting Balance" value={formatCurrency(summary.startingBalance)} icon={<Wallet className="h-5 w-5 text-primary" />} />
                <StatBox title="Cash" value={formatCurrency(summary.cashBalance)} icon={<Wallet className="h-5 w-5 text-secondary" />} />
                <StatBox title="Market Value" value={formatCurrency(summary.marketValue)} icon={<TrendingUp className="h-5 w-5 text-success" />} />
                <StatBox
                    title="Total PnL"
                    value={formatCurrency(summary.totalPnl)}
                    subtitle={formatPercentage(totalPnlPercentage)}
                    accent={totalPnlPositive ? 'text-success' : 'text-error'}
                    icon={<TrendingUp className={`h-5 w-5 ${totalPnlPositive ? 'text-success' : 'text-error'}`} />}
                />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200 lg:col-span-1">
                    <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Place Simulator Trade</h2>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <label className="form-control">
                            <span className="label-text mb-2">Asset</span>
                            <select className="select select-bordered" value={form.coinId} onChange={handleCoinChange}>
                                {coins.map((coin) => (
                                    <option key={coin.id} value={coin.id}>
                                        {coin.name} ({coin.symbol.toUpperCase()})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="form-control">
                            <span className="label-text mb-2">Side</span>
                            <select
                                className="select select-bordered"
                                value={form.side}
                                onChange={(event) => setForm((current) => ({ ...current, side: event.target.value }))}
                            >
                                <option value="buy">Buy</option>
                                <option value="sell">Sell</option>
                            </select>
                        </label>

                        <label className="form-control">
                            <span className="label-text mb-2">Quantity</span>
                            <input
                                type="number"
                                step="any"
                                value={form.quantity}
                                onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                                className="input input-bordered"
                                placeholder="0.50"
                                required
                            />
                        </label>

                        <div className="rounded-xl bg-base-200 p-4 text-sm dark:bg-dark-100">
                            <div>Estimated execution price: {formatCurrency(selectedCoinPrice)}</div>
                            <div className="mt-1">Available cash: {formatCurrency(summary.cashBalance)}</div>
                            {form.side === 'buy' && selectedCoinPrice > 0 && (
                                <div className="mt-1">
                                    Max buy size at this price: {formatNumber(maxAffordableQuantity, 6)}
                                </div>
                            )}
                        </div>

                        {insufficientCash && (
                            <div className="rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error">
                                This order is larger than your available simulator cash. Reduce the quantity or reset the simulator.
                            </div>
                        )}

                        <button className="btn btn-primary w-full" type="submit" disabled={submitting || insufficientCash}>
                            {submitting ? 'Submitting...' : 'Execute trade'}
                        </button>
                    </form>
                </div>

                <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200 lg:col-span-2">
                    <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Open Positions</h2>
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <span className="loading loading-spinner text-primary"></span>
                        </div>
                    ) : summary.positions.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
                            No simulator positions yet. Place a trade to start building a paper portfolio.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Asset</th>
                                        <th>Quantity</th>
                                        <th>Avg Cost</th>
                                        <th>Current</th>
                                        <th>Value</th>
                                        <th>Unrealized</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.positions.map((position) => (
                                        <tr key={position.coinId}>
                                            <td>
                                                <div className="font-semibold">{position.name}</div>
                                                <div className="text-xs uppercase text-gray-500">{position.symbol}</div>
                                            </td>
                                            <td>{formatNumber(position.quantity, 4)}</td>
                                            <td>{formatCurrency(position.averageCost)}</td>
                                            <td>{formatCurrency(position.currentPrice)}</td>
                                            <td>{formatCurrency(position.marketValue)}</td>
                                            <td className={position.unrealizedPnl >= 0 ? 'text-success' : 'text-error'}>
                                                {formatCurrency(position.unrealizedPnl)} ({formatPercentage(position.roi)})
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200">
                <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Trade Log</h2>
                {summary.trades.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Your paper trades will appear here after the first execution.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>When</th>
                                    <th>Side</th>
                                    <th>Asset</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                    <th>Realized PnL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.trades.map((trade) => (
                                    <tr key={trade.id}>
                                        <td>{new Date(trade.createdAt).toLocaleString()}</td>
                                        <td className="uppercase">{trade.side}</td>
                                        <td>{trade.symbol}</td>
                                        <td>{formatNumber(trade.quantity, 4)}</td>
                                        <td>{formatCurrency(trade.executedPrice)}</td>
                                        <td>{formatCurrency(trade.totalValue)}</td>
                                        <td className={trade.realizedPnl >= 0 ? 'text-success' : 'text-error'}>
                                            {formatCurrency(trade.realizedPnl)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatBox = ({ title, value, subtitle, icon, accent = '' }) => (
    <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200">
        <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">{title}</span>
            {icon}
        </div>
        <div className={`text-3xl font-bold text-gray-900 dark:text-gray-100 ${accent}`}>{value}</div>
        {subtitle && <div className={`mt-1 text-sm ${accent}`}>{subtitle}</div>}
    </div>
);

export default PaperTrading;
