import { useEffect, useMemo, useState } from 'react';
import { Repeat2, TrendingUp, Wallet, TrendingDown, Cpu, ToggleLeft, ToggleRight } from 'lucide-react';
import { useCryptoData } from '../hooks/useCryptoData';
import { paperTradingAPI } from '../services/api';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/format';
import { toast } from 'react-toastify';

const STRATEGIES = [
    'Manual',
    'Trend Following',
    'Mean Reversion',
    'Breakout',
    'Scalping',
    'Swing',
    'DCA',
    'RSI Divergence'
];

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
        paperTradingEnabled: true,
        liveTradingEnabled: false,
        positions: [],
        trades: [],
        performance: [],
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [form, setForm] = useState({
        coinId: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        side: 'buy', // buy (open long/cover short) | sell (open short/close long)
        quantity: '',
        stopLoss: '',
        takeProfit: '',
        strategy: 'Manual',
    });

    useEffect(() => {
        fetchCoins(1, 'usd');
    }, [fetchCoins]);

    const loadSummary = async () => {
        setLoading(true);
        try {
            const response = await paperTradingAPI.getSummary();
            setSummary(response.data);
        } catch (err) {
            toast.error('Failed to load paper trading summary');
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

    const handleToggleAgent = async () => {
        setToggling(true);
        try {
            const newPaperMode = !summary.paperTradingEnabled;
            const response = await paperTradingAPI.toggle(newPaperMode, summary.liveTradingEnabled);
            setSummary(response.data);
            toast.success(`Agent autonomous execution ${newPaperMode ? 'enabled' : 'disabled'}`);
        } catch (err) {
            toast.error('Failed to toggle agent execution');
        } finally {
            setToggling(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);

        const payload = {
            ...form,
            quantity: Number.parseFloat(form.quantity),
            stopLoss: form.stopLoss ? Number.parseFloat(form.stopLoss) : null,
            takeProfit: form.takeProfit ? Number.parseFloat(form.takeProfit) : null,
        };

        try {
            const response = await paperTradingAPI.placeTrade(payload);
            setSummary(response.data);
            setForm((current) => ({
                ...current,
                quantity: '',
                stopLoss: '',
                takeProfit: '',
                strategy: 'Manual',
            }));
            toast.success('Trade executed successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to place trade');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClosePosition = async (position) => {
        if (!window.confirm(`Close your entire ${position.side} position on ${position.name}?`)) {
            return;
        }
        setSubmitting(true);
        try {
            const response = await paperTradingAPI.placeTrade({
                coinId: position.coinId,
                symbol: position.symbol,
                name: position.name,
                side: position.side === 'long' ? 'sell' : 'buy', // reverse side to close
                quantity: position.quantity,
                strategy: position.strategy,
            });
            setSummary(response.data);
            toast.success(`Position on ${position.name} closed`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to close position');
        } finally {
            setSubmitting(false);
        }
    };

    const resetSimulator = async () => {
        if (!window.confirm('Reset the simulator? This deletes all positions, logs, and strategy stats.')) {
            return;
        }
        try {
            const response = await paperTradingAPI.reset();
            setSummary(response.data);
            toast.success('Simulator reset completed');
        } catch (err) {
            toast.error('Failed to reset simulator');
        }
    };

    const totalPnlPositive = summary.totalPnl >= 0;
    const selectedCoinPrice = useMemo(() => {
        const coin = coins.find((item) => item.id === form.coinId);
        return coin?.current_price || 0;
    }, [coins, form.coinId]);
    const requestedQuantity = Number.parseFloat(form.quantity) || 0;
    const maxAffordableQuantity = selectedCoinPrice > 0 ? summary.cashBalance / selectedCoinPrice : 0;
    const insufficientCash = form.side === 'buy' && requestedQuantity > 0 && selectedCoinPrice > 0 && (requestedQuantity * selectedCoinPrice) > summary.cashBalance;
    const totalPnlPercentage = summary.startingBalance > 0 ? (summary.totalPnl / summary.startingBalance) * 100 : 0;

    return (
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-base-300 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Cpu className="h-8 w-8 text-primary" />
                        Paper Trading Simulator
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Practice allocation, margin, and order limits with a virtual $10,000 balance and AI support.
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    {/* Agent Control center */}
                    <div className="flex items-center gap-2 bg-base-100 px-4 py-2 rounded-xl shadow-sm border border-base-200">
                        <span className="text-sm font-semibold text-gray-500">Autonomous Agent:</span>
                        <button
                            onClick={handleToggleAgent}
                            disabled={toggling}
                            className="btn btn-ghost btn-sm p-0 flex items-center justify-center"
                        >
                            {summary.paperTradingEnabled ? (
                                <ToggleRight className="h-8 w-8 text-success" />
                            ) : (
                                <ToggleLeft className="h-8 w-8 text-gray-400" />
                            )}
                        </button>
                        <span className={`text-xs font-bold ${summary.paperTradingEnabled ? 'text-success' : 'text-gray-400'}`}>
                            {summary.paperTradingEnabled ? 'ON' : 'OFF'}
                        </span>
                    </div>

                    <button className="btn btn-outline btn-error btn-sm" onClick={resetSimulator}>
                        <Repeat2 className="h-4 w-4" />
                        Reset
                    </button>
                </div>
            </div>

            {/* Account Metrics Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                <StatBox title="Starting Balance" value={formatCurrency(summary.startingBalance)} icon={<Wallet className="h-5 w-5 text-primary" />} />
                <StatBox title="Collateral Cash" value={formatCurrency(summary.cashBalance)} icon={<Wallet className="h-5 w-5 text-secondary" />} />
                <StatBox title="Open Position Value" value={formatCurrency(summary.marketValue)} icon={<TrendingUp className="h-5 w-5 text-info" />} />
                <StatBox
                    title="Net PnL"
                    value={formatCurrency(summary.totalPnl)}
                    subtitle={formatPercentage(totalPnlPercentage)}
                    accent={totalPnlPositive ? 'text-success' : 'text-error'}
                    icon={totalPnlPositive ? <TrendingUp className="h-5 w-5 text-success" /> : <TrendingDown className="h-5 w-5 text-error" />}
                />
            </div>

            {/* Strategy Performance Dashboard */}
            <div className="glass-card rounded-2xl bg-base-100 p-6 shadow-lg border border-base-200">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Strategy Performance Dashboard
                </h2>
                {summary.performance.length === 0 ? (
                    <p className="text-sm text-gray-500">Autonomous strategy metrics will appear here after the agent completes trades.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {summary.performance.map((perf) => (
                            <div key={perf.strategy} className="p-4 bg-base-200/50 rounded-xl border border-base-300 space-y-2">
                                <div className="font-bold text-sm text-primary">{perf.strategy}</div>
                                <div className="grid grid-cols-2 text-xs gap-y-1">
                                    <span className="text-gray-500">Trades:</span>
                                    <span className="font-semibold text-right">{perf.totalTrades}</span>
                                    <span className="text-gray-500">Win Rate:</span>
                                    <span className="font-semibold text-right text-success">{perf.winRate}%</span>
                                    <span className="text-gray-500">Sharpe:</span>
                                    <span className="font-semibold text-right">{perf.sharpeRatio}</span>
                                    <span className="text-gray-500">Max DD:</span>
                                    <span className="font-semibold text-right text-error">-{perf.maxDrawdown}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Order execution */}
                <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200 lg:col-span-1 border border-base-200">
                    <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Simulate Order</h2>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <label className="form-control">
                            <span className="label-text mb-1 text-xs font-semibold text-gray-500 uppercase">Asset</span>
                            <select className="select select-bordered select-sm" value={form.coinId} onChange={handleCoinChange}>
                                {coins.map((coin) => (
                                    <option key={coin.id} value={coin.id}>
                                        {coin.name} ({coin.symbol.toUpperCase()})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="grid grid-cols-2 gap-4">
                            <label className="form-control">
                                <span className="label-text mb-1 text-xs font-semibold text-gray-500 uppercase">Side</span>
                                <select
                                    className="select select-bordered select-sm"
                                    value={form.side}
                                    onChange={(event) => setForm((current) => ({ ...current, side: event.target.value }))}
                                >
                                    <option value="buy">Buy (Long / Cover)</option>
                                    <option value="sell">Sell (Short / Close)</option>
                                </select>
                            </label>

                            <label className="form-control">
                                <span className="label-text mb-1 text-xs font-semibold text-gray-500 uppercase">Strategy Tag</span>
                                <select
                                    className="select select-bordered select-sm"
                                    value={form.strategy}
                                    onChange={(event) => setForm((current) => ({ ...current, strategy: event.target.value }))}
                                >
                                    {STRATEGIES.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <label className="form-control">
                            <span className="label-text mb-1 text-xs font-semibold text-gray-500 uppercase">Quantity</span>
                            <input
                                type="number"
                                step="any"
                                value={form.quantity}
                                onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                                className="input input-bordered input-sm"
                                placeholder="0.5"
                                required
                            />
                        </label>

                        <div className="grid grid-cols-2 gap-4">
                            <label className="form-control">
                                <span className="label-text mb-1 text-xs font-semibold text-gray-500 uppercase">Stop Loss (Price)</span>
                                <input
                                    type="number"
                                    step="any"
                                    value={form.stopLoss}
                                    onChange={(event) => setForm((current) => ({ ...current, stopLoss: event.target.value }))}
                                    className="input input-bordered input-sm"
                                    placeholder="Optional"
                                />
                            </label>

                            <label className="form-control">
                                <span className="label-text mb-1 text-xs font-semibold text-gray-500 uppercase">Take Profit (Price)</span>
                                <input
                                    type="number"
                                    step="any"
                                    value={form.takeProfit}
                                    onChange={(event) => setForm((current) => ({ ...current, takeProfit: event.target.value }))}
                                    className="input input-bordered input-sm"
                                    placeholder="Optional"
                                />
                            </label>
                        </div>

                        <div className="rounded-xl bg-base-200 p-4 text-xs dark:bg-dark-100 space-y-1">
                            <div>Execution Price: <span className="font-semibold">{formatCurrency(selectedCoinPrice)}</span></div>
                            <div>Available Collateral: <span className="font-semibold">{formatCurrency(summary.cashBalance)}</span></div>
                            {selectedCoinPrice > 0 && (
                                <div>Max size: <span className="font-semibold">{formatNumber(maxAffordableQuantity, 4)}</span></div>
                            )}
                        </div>

                        {insufficientCash && (
                            <div className="rounded-xl border border-error/30 bg-error/10 p-3 text-xs text-error">
                                Order value exceeds your available virtual balance.
                            </div>
                        )}

                        <button className="btn btn-primary btn-sm w-full" type="submit" disabled={submitting || insufficientCash}>
                            {submitting ? 'Submitting...' : 'Execute Order'}
                        </button>
                    </form>
                </div>

                {/* Open Positions */}
                <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200 lg:col-span-2 border border-base-200">
                    <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Open Positions</h2>
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <span className="loading loading-spinner text-primary"></span>
                        </div>
                    ) : summary.positions.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
                            No active positions. Open a trade to populate your portfolio.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-xs md:table-sm">
                                <thead>
                                    <tr>
                                        <th>Asset</th>
                                        <th>Side</th>
                                        <th>Qty</th>
                                        <th>Entry Price</th>
                                        <th>SL / TP limits</th>
                                        <th>Strategy</th>
                                        <th>Unrealized P&L</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.positions.map((position) => (
                                        <tr key={position.id || position.coinId}>
                                            <td>
                                                <div className="font-bold">{position.name}</div>
                                                <div className="text-xs uppercase text-gray-500">{position.symbol}</div>
                                            </td>
                                            <td>
                                                <span className={`badge badge-xs uppercase font-bold p-1.5 ${position.side === 'long' ? 'badge-success text-white' : 'badge-error text-white'}`}>
                                                    {position.side}
                                                </span>
                                            </td>
                                            <td>{formatNumber(position.quantity, 4)}</td>
                                            <td>{formatCurrency(position.averageCost)}</td>
                                            <td className="text-xs">
                                                <div>SL: <span className="font-semibold">{position.stopLoss ? formatCurrency(position.stopLoss) : 'None'}</span></div>
                                                <div>TP: <span className="font-semibold">{position.takeProfit ? formatCurrency(position.takeProfit) : 'None'}</span></div>
                                            </td>
                                            <td className="text-xs font-semibold text-primary">{position.strategy}</td>
                                            <td className={`font-semibold ${position.unrealizedPnl >= 0 ? 'text-success' : 'text-error'}`}>
                                                {formatCurrency(position.unrealizedPnl)} ({formatPercentage(position.roi)})
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => handleClosePosition(position)}
                                                    className="btn btn-outline btn-error btn-xs"
                                                >
                                                    Close
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Trade Log */}
            <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200 border border-base-200">
                <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Trade Log (Closed Trades)</h2>
                {summary.trades.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Trade transaction ledger will appear here.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table table-xs">
                            <thead>
                                <tr>
                                    <th>Closed Time</th>
                                    <th>Side</th>
                                    <th>Asset</th>
                                    <th>Size</th>
                                    <th>Entry Price</th>
                                    <th>Exit Price</th>
                                    <th>Strategy</th>
                                    <th>PnL ($ / %)</th>
                                    <th>Exit Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.trades.map((trade) => (
                                    <tr key={trade.id}>
                                        <td>{new Date(trade.closedAt).toLocaleString()}</td>
                                        <td>
                                            <span className={`badge badge-xs uppercase font-bold p-1.5 ${trade.side === 'long' ? 'badge-success text-white' : 'badge-error text-white'}`}>
                                                {trade.side}
                                            </span>
                                        </td>
                                        <td>{trade.symbol}</td>
                                        <td>{formatNumber(trade.quantity, 4)}</td>
                                        <td>{formatCurrency(trade.entryPrice)}</td>
                                        <td>{formatCurrency(trade.exitPrice)}</td>
                                        <td className="font-semibold text-primary">{trade.strategy}</td>
                                        <td className={`font-bold ${trade.realizedPnl >= 0 ? 'text-success' : 'text-error'}`}>
                                            {formatCurrency(trade.realizedPnl)} ({formatPercentage(trade.pnlPercent)})
                                        </td>
                                        <td>
                                            <span className={`badge badge-xs font-mono py-1.5 uppercase ${
                                                trade.closeReason === 'stop_loss' ? 'badge-error text-white' :
                                                trade.closeReason === 'take_profit' ? 'badge-success text-white' :
                                                'badge-neutral'
                                            }`}>
                                                {trade.closeReason.replace('_', ' ')}
                                            </span>
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
    <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200 border border-base-200">
        <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">{title}</span>
            {icon}
        </div>
        <div className={`text-3xl font-bold text-gray-900 dark:text-gray-100 ${accent}`}>{value}</div>
        {subtitle && <div className={`mt-1 text-sm ${accent}`}>{subtitle}</div>}
    </div>
);

export default PaperTrading;
