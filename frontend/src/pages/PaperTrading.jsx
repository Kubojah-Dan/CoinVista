import { useEffect, useMemo, useState } from 'react';
import { Repeat2, TrendingUp, Wallet, TrendingDown, Cpu, ToggleLeft, ToggleRight, Calendar, MessageSquare, Inbox, CheckSquare, AlertTriangle, FileText, Award, Sparkles, Clock } from 'lucide-react';
import { useCryptoData } from '../hooks/useCryptoData';
import { paperTradingAPI, socialAPI } from '../services/api';
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

    const [activeTab, setActiveTab] = useState('simulator'); // 'simulator' | 'inbox' | 'social'
    const [inboxMessages, setInboxMessages] = useState([]);
    const [loadingInbox, setLoadingInbox] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [generatingReview, setGeneratingReview] = useState(false);

    // Social & Copy trading states
    const [leaderboard, setLeaderboard] = useState([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [copyAllocation, setCopyAllocation] = useState(10);
    const [copyEnabled, setCopyEnabled] = useState(false);

    const loadLeaderboard = async () => {
        setLoadingLeaderboard(true);
        try {
            const res = await socialAPI.getLeaderboard();
            setLeaderboard(res.data || []);
        } catch (e) {
            console.error("Failed to load social leaderboard", e);
        } finally {
            setLoadingLeaderboard(false);
        }
    };

    const handleViewProfile = async (targetUserId) => {
        setLoadingProfile(true);
        setShowProfileModal(true);
        try {
            const res = await socialAPI.getProfile(targetUserId);
            setSelectedProfile(res.data);
            setCopyEnabled(res.data.copyTradingEnabled);
            setCopyAllocation(res.data.copyAllocationPercent || 10);
        } catch (e) {
            console.error("Failed to load public profile", e);
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleToggleFollow = async (profile) => {
        try {
            if (profile.following) {
                await socialAPI.unfollow(profile.userId);
                toast.success(`Unfollowed ${profile.name}`);
            } else {
                await socialAPI.follow(profile.userId);
                toast.success(`Followed ${profile.name}`);
            }
            // Reload profile
            const res = await socialAPI.getProfile(profile.userId);
            setSelectedProfile(res.data);
            setCopyEnabled(res.data.copyTradingEnabled);
            setCopyAllocation(res.data.copyAllocationPercent || 10);
            loadLeaderboard();
        } catch (e) {
            console.error("Failed to toggle follow status", e);
            toast.error("Failed to update follow status");
        }
    };

    const handleSaveCopyConfig = async () => {
        if (!selectedProfile) return;
        try {
            await socialAPI.updateCopyConfig({
                followingId: selectedProfile.userId,
                copyTradingEnabled: copyEnabled,
                copyAllocationPercent: parseFloat(copyAllocation)
            });
            toast.success("Copy trading configuration updated!");
            const res = await socialAPI.getProfile(selectedProfile.userId);
            setSelectedProfile(res.data);
        } catch (e) {
            console.error("Failed to update copy config", e);
            toast.error("Failed to update copy trading configuration");
        }
    };

    // Pre-trade checklist modal state
    const [checklistOpen, setChecklistOpen] = useState(false);
    const [checklist, setChecklist] = useState({
        thesis: '',
        invalidation: '',
        rnr: '1.5',
    });

    // Trade analysis modal state
    const [selectedTradeAnalysis, setSelectedTradeAnalysis] = useState(null);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [analysisModalOpen, setAnalysisModalOpen] = useState(false);

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

    const loadInbox = async () => {
        setLoadingInbox(true);
        try {
            const response = await paperTradingAPI.getInbox();
            setInboxMessages(response.data || []);
        } catch (err) {
            console.error('Failed to load inbox', err);
        } finally {
            setLoadingInbox(false);
        }
    };

    useEffect(() => {
        loadSummary();
        loadInbox();
    }, []);

    useEffect(() => {
        if (activeTab === 'inbox') {
            loadInbox();
        } else if (activeTab === 'social') {
            loadLeaderboard();
        }
    }, [activeTab]);

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

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!form.quantity || Number.parseFloat(form.quantity) <= 0) {
            toast.error('Please enter a valid quantity');
            return;
        }

        // Pre-calculate R:R and pre-populate checklist
        let calculatedRnR = 1.5;
        if (form.stopLoss && form.takeProfit) {
            const entry = selectedCoinPrice;
            const sl = Number.parseFloat(form.stopLoss);
            const tp = Number.parseFloat(form.takeProfit);
            if (form.side === 'buy') { // Long
                const risk = entry - sl;
                const reward = tp - entry;
                if (risk > 0) {
                    calculatedRnR = Number.parseFloat((reward / risk).toFixed(2));
                }
            } else { // Short
                const risk = sl - entry;
                const reward = entry - tp;
                if (risk > 0) {
                    calculatedRnR = Number.parseFloat((reward / risk).toFixed(2));
                }
            }
        }
        
        setChecklist({
            thesis: '',
            invalidation: form.stopLoss || '',
            rnr: calculatedRnR > 0 ? calculatedRnR.toString() : '1.5',
        });
        setChecklistOpen(true);
    };

    const handleConfirmTrade = async () => {
        setSubmitting(true);
        setChecklistOpen(false);

        const payload = {
            ...form,
            quantity: Number.parseFloat(form.quantity),
            stopLoss: form.stopLoss ? Number.parseFloat(form.stopLoss) : null,
            takeProfit: form.takeProfit ? Number.parseFloat(form.takeProfit) : null,
            preTradeThesis: checklist.thesis,
            preTradeInvalidation: checklist.invalidation ? Number.parseFloat(checklist.invalidation) : null,
            preTradeRnR: checklist.rnr ? Number.parseFloat(checklist.rnr) : 1.5,
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
            loadInbox();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to place trade');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReadMessage = async (msg) => {
        setSelectedMessage(msg);
        const isAlreadyRead = msg.read || msg.isRead;
        if (!isAlreadyRead) {
            try {
                await paperTradingAPI.markInboxRead(msg.id);
                setInboxMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true, isRead: true } : m));
            } catch (err) {
                console.error('Failed to mark message as read', err);
            }
        }
    };

    const handleTriggerWeeklyReview = async () => {
        setGeneratingReview(true);
        try {
            await paperTradingAPI.triggerWeeklyReview();
            toast.success('Weekly review generated! Check your inbox.');
            loadInbox();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to generate weekly review. Ensure you have closed trades in the last 7 days.');
        } finally {
            setGeneratingReview(false);
        }
    };

    const handleViewAnalysis = async (tradeId) => {
        setLoadingAnalysis(true);
        setSelectedTradeAnalysis(null);
        setAnalysisModalOpen(true);
        try {
            const response = await paperTradingAPI.getTradeAnalysis(tradeId);
            setSelectedTradeAnalysis(response.data);
        } catch (err) {
            if (err.response?.status === 404) {
                toast.info('AI is still analyzing this trade. Try again in a few seconds.');
            } else {
                toast.error('Failed to load trade analysis');
            }
            setAnalysisModalOpen(false);
        } finally {
            setLoadingAnalysis(false);
        }
    };

    const parseBold = (text) => {
        if (!text) return '';
        const parts = text.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, i) => {
            if (i % 2 === 1) {
                return <strong key={i} className="font-bold text-gray-900 dark:text-gray-100">{part}</strong>;
            }
            return part;
        });
    };

    const renderMarkdown = (text) => {
        if (!text) return null;
        const lines = text.split('\n');
        return lines.map((line, idx) => {
            let trimmed = line.trim();
            if (trimmed.startsWith('###')) {
                return <h4 key={idx} className="text-sm font-bold text-primary mt-4 mb-2 uppercase tracking-wider">{trimmed.replace('###', '').trim()}</h4>;
            }
            if (trimmed.startsWith('##')) {
                return <h3 key={idx} className="text-md font-bold text-secondary mt-5 mb-2">{trimmed.replace('##', '').trim()}</h3>;
            }
            if (trimmed.startsWith('#')) {
                return <h2 key={idx} className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-6 mb-3">{trimmed.replace('#', '').trim()}</h2>;
            }
            if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
                const content = trimmed.substring(1).trim();
                return (
                    <li key={idx} className="ml-4 list-disc text-sm text-gray-700 dark:text-gray-300 mb-1">
                        {parseBold(content)}
                    </li>
                );
            }
            if (trimmed.startsWith('>')) {
                return (
                    <blockquote key={idx} className="border-l-4 border-primary bg-base-200/50 p-3 my-2 italic rounded-r text-sm text-gray-600 dark:text-gray-400">
                        {parseBold(trimmed.substring(1).trim())}
                    </blockquote>
                );
            }
            if (trimmed === '') {
                return <div key={idx} className="h-2" />;
            }
            return <p key={idx} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">{parseBold(line)}</p>;
        });
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

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-base-300 pb-px">
                <button
                    onClick={() => setActiveTab('simulator')}
                    className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'simulator'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <Cpu className="h-4 w-4" />
                    Simulator
                </button>
                <button
                    onClick={() => setActiveTab('inbox')}
                    className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 relative ${
                        activeTab === 'inbox'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <Inbox className="h-4 w-4" />
                    AI Journal & Inbox
                    {inboxMessages.some(msg => !(msg.read || msg.isRead)) && (
                        <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary animate-ping" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('social')}
                    className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 relative ${
                        activeTab === 'social'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <Award className="h-4 w-4" />
                    Social Leaderboard
                </button>
            </div>

            {/* Simulator Tab Content */}
            {activeTab === 'simulator' && (
                <>
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
                        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Trade Log (Closed Trades)
                        </h2>
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
                                            <th className="text-center">AI Mentor</th>
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
                                                <td className="text-center">
                                                    <button
                                                        onClick={() => handleViewAnalysis(trade.id)}
                                                        className="btn btn-primary btn-xs flex items-center gap-1 mx-auto"
                                                    >
                                                        <Cpu className="h-3 w-3" />
                                                        Review
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* AI Journal & Inbox Tab Content */}
            {activeTab === 'inbox' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Performance Reports List */}
                    <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200 lg:col-span-1 border border-base-200 flex flex-col h-[600px]">
                        <div className="flex items-center justify-between border-b border-base-200 pb-4 mb-4">
                            <div className="flex items-center gap-2">
                                <Inbox className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Performance Reports</h2>
                            </div>
                            <button
                                className="btn btn-primary btn-xs flex items-center gap-1"
                                onClick={handleTriggerWeeklyReview}
                                disabled={generatingReview}
                            >
                                <Sparkles className="h-3 w-3" />
                                {generatingReview ? 'Generating...' : 'Trigger Review'}
                            </button>
                        </div>
                        
                        {loadingInbox ? (
                            <div className="flex flex-col items-center justify-center flex-1">
                                <span className="loading loading-spinner text-primary"></span>
                            </div>
                        ) : inboxMessages.length === 0 ? (
                            <div className="text-center text-gray-500 py-12 flex-1 flex flex-col items-center justify-center">
                                <Calendar className="h-10 w-10 text-gray-300 mb-2" />
                                <p className="text-sm font-semibold">No performance reports yet</p>
                                <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">
                                    AI reports compile weekly every Monday at 8 AM UTC. Click "Trigger Review" to generate one now.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                                {inboxMessages.map((msg) => {
                                    const isRead = msg.read || msg.isRead;
                                    return (
                                        <div
                                            key={msg.id}
                                            onClick={() => handleReadMessage(msg)}
                                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                                selectedMessage?.id === msg.id
                                                    ? 'bg-primary/10 border-primary'
                                                    : isRead
                                                    ? 'bg-base-200/50 border-base-300 hover:bg-base-200'
                                                    : 'bg-base-100 border-primary/30 shadow-sm hover:border-primary/50 font-semibold'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="text-sm text-gray-900 dark:text-gray-100 truncate">{msg.title}</div>
                                                {!isRead && (
                                                    <span className="badge badge-xs badge-primary">New</span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(msg.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    
                    {/* Report Detailed View */}
                    <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200 lg:col-span-2 border border-base-200 flex flex-col h-[600px]">
                        {selectedMessage ? (
                            <div className="flex flex-col h-full">
                                <div className="border-b border-base-200 pb-4 mb-4">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <FileText className="h-6 w-6 text-primary" />
                                        {selectedMessage.title}
                                    </h2>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                        Received: {new Date(selectedMessage.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                                    {renderMarkdown(selectedMessage.content)}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center flex-1 text-gray-500">
                                <FileText className="h-12 w-12 text-base-300 mb-2" />
                                <p className="text-sm font-semibold">Select a performance report</p>
                                <p className="text-xs text-gray-400 mt-1">Weekly reports evaluate win-rates, emotion profiles, and execution discipline.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Social Leaderboard Content */}
            {activeTab === 'social' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Leaderboard Table Card */}
                    <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200 lg:col-span-2 border border-base-200">
                        <div className="flex items-center justify-between border-b border-base-200 pb-4 mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Award className="h-5 w-5 text-secondary" />
                                Top Paper Trading Leaderboard
                            </h2>
                            <span className="text-xs bg-secondary/15 text-secondary px-2.5 py-1 rounded-full font-semibold">
                                Live Rankings
                            </span>
                        </div>

                        {loadingLeaderboard ? (
                            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                                <span className="loading loading-spinner loading-lg text-primary"></span>
                                <p className="text-sm text-gray-500">Loading leaderboard rankings...</p>
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No public portfolios available yet. Make sure your profile has privacy mode disabled!
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th className="w-12 text-center">Rank</th>
                                            <th>Trader</th>
                                            <th className="text-right">ROI (%)</th>
                                            <th className="text-right">Win Rate</th>
                                            <th className="text-right">Total Trades</th>
                                            <th className="text-right">Active Positions</th>
                                            <th className="text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboard.map((entry, idx) => (
                                            <tr key={entry.userId} className="hover:bg-base-200/30 transition-colors">
                                                <td className="text-center font-bold font-mono">
                                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                                </td>
                                                <td>
                                                    <button 
                                                        onClick={() => handleViewProfile(entry.userId)}
                                                        className="flex items-center gap-3 font-semibold hover:text-primary transition-colors text-left"
                                                    >
                                                        <div className="avatar placeholder">
                                                            <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center">
                                                                {entry.avatarUrl ? (
                                                                    <img src={entry.avatarUrl} alt={entry.name} />
                                                                ) : (
                                                                    entry.name.slice(0, 2).toUpperCase()
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span>{entry.name}</span>
                                                    </button>
                                                </td>
                                                <td className={`text-right font-bold ${entry.roi >= 0 ? 'text-success' : 'text-error'}`}>
                                                    {entry.roi >= 0 ? '+' : ''}{entry.roi}%
                                                </td>
                                                <td className="text-right font-mono font-semibold">{entry.winRate}%</td>
                                                <td className="text-right font-mono">{entry.totalTrades}</td>
                                                <td className="text-right font-mono">{entry.activePositionsCount}</td>
                                                <td className="text-center">
                                                    <button
                                                        onClick={() => handleViewProfile(entry.userId)}
                                                        className="btn btn-primary btn-xs"
                                                    >
                                                        View Profile
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Social Stats Sidebar */}
                    <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200 lg:col-span-1 border border-base-200 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Social & Copy Trading</h3>
                            <p className="text-xs text-gray-500">
                                Follow elite paper traders, inspect their technical thesis, and mirror their executions automatically proportional to your allocation settings.
                            </p>
                        </div>
                        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-xl border border-primary/20">
                            <h4 className="text-xs font-bold text-primary uppercase mb-1">Mirror Sizing Rule</h4>
                            <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                                When a followed trader places a trade, CoinVista scales their position size based on your allocation setting relative to your simulator balances.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Public Profile Detail Modal */}
            {showProfileModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-3xl bg-base-100 border border-base-200 shadow-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
                        {loadingProfile || !selectedProfile ? (
                            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                                <span className="loading loading-spinner loading-lg text-primary"></span>
                                <p className="text-sm text-gray-500">Loading trader profile...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Profile Header */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-base-200 pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="avatar placeholder">
                                            <div className="bg-primary/20 text-primary rounded-full w-16 h-16 flex items-center justify-center text-xl font-bold">
                                                {selectedProfile.avatarUrl ? (
                                                    <img src={selectedProfile.avatarUrl} alt={selectedProfile.name} />
                                                ) : (
                                                    selectedProfile.name.slice(0, 2).toUpperCase()
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                {selectedProfile.name}
                                            </h2>
                                            <p className="text-xs text-gray-500">Trader Profile</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleToggleFollow(selectedProfile)}
                                            className={`btn btn-sm ${
                                                selectedProfile.following ? 'btn-outline btn-secondary' : 'btn-primary'
                                            }`}
                                        >
                                            {selectedProfile.following ? 'Following' : 'Follow'}
                                        </button>
                                    </div>
                                </div>

                                {/* Metrics Summary */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="bg-base-200/50 p-4 rounded-xl text-center border border-base-300">
                                        <span className="text-xs text-gray-500 uppercase font-semibold">Total ROI</span>
                                        <div className={`text-2xl font-black mt-1 ${
                                            selectedProfile.roi >= 0 ? 'text-success' : 'text-error'
                                        }`}>
                                            {selectedProfile.roi >= 0 ? '+' : ''}{selectedProfile.roi}%
                                        </div>
                                    </div>
                                    <div className="bg-base-200/50 p-4 rounded-xl text-center border border-base-300">
                                        <span className="text-xs text-gray-500 uppercase font-semibold">Win Rate</span>
                                        <div className="text-2xl font-black mt-1 text-primary">
                                            {selectedProfile.winRate}%
                                        </div>
                                    </div>
                                    <div className="bg-base-200/50 p-4 rounded-xl text-center border border-base-300">
                                        <span className="text-xs text-gray-500 uppercase font-semibold">Followers</span>
                                        <div className="text-2xl font-black mt-1">
                                            {selectedProfile.followersCount}
                                        </div>
                                    </div>
                                    <div className="bg-base-200/50 p-4 rounded-xl text-center border border-base-300">
                                        <span className="text-xs text-gray-500 uppercase font-semibold">Total Trades</span>
                                        <div className="text-2xl font-black mt-1">
                                            {selectedProfile.totalTrades}
                                        </div>
                                    </div>
                                </div>

                                {/* Copy Trading Settings (Only visible if following) */}
                                {selectedProfile.following && (
                                    <div className="p-5 rounded-xl border border-secondary/25 bg-secondary/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-gray-950 dark:text-white text-sm">Enable Copy Trading</h3>
                                                <p className="text-[11px] text-gray-500">Automatically replicate orders proportioned to your settings</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="toggle toggle-secondary"
                                                checked={copyEnabled}
                                                onChange={(e) => setCopyEnabled(e.target.checked)}
                                            />
                                        </div>
                                        {copyEnabled && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Allocation:</span>
                                                    <span className="font-bold font-mono text-secondary">{copyAllocation}% of Position Size</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="100"
                                                    value={copyAllocation}
                                                    onChange={(e) => setCopyAllocation(e.target.value)}
                                                    className="range range-secondary range-xs"
                                                />
                                            </div>
                                        )}
                                        <div className="flex justify-end pt-2">
                                            <button 
                                                onClick={handleSaveCopyConfig}
                                                className="btn btn-secondary btn-xs"
                                            >
                                                Save Allocation Settings
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Active Positions & Trades */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">Active Positions</h3>
                                    {selectedProfile.activePositions?.length === 0 ? (
                                        <p className="text-xs text-gray-500 italic p-3 bg-base-200/30 rounded-lg">No active positions</p>
                                    ) : (
                                        <div className="overflow-x-auto border border-base-200 rounded-xl">
                                            <table className="table table-compact w-full text-xs">
                                                <thead>
                                                    <tr>
                                                        <th>Asset</th>
                                                        <th>Side</th>
                                                        <th>Quantity</th>
                                                        <th>Entry Price</th>
                                                        <th>Strategy</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedProfile.activePositions?.map((pos) => (
                                                        <tr key={pos.id}>
                                                            <td className="font-bold">{pos.symbol}</td>
                                                            <td>
                                                                <span className={`badge badge-xs uppercase font-bold p-1 ${
                                                                    pos.side === 'long' ? 'badge-success text-white' : 'badge-error text-white'
                                                                }`}>
                                                                    {pos.side}
                                                                </span>
                                                            </td>
                                                            <td>{formatNumber(pos.quantity, 4)}</td>
                                                            <td>{formatCurrency(pos.averageCost)}</td>
                                                            <td>{pos.strategy}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="modal-action mt-6 border-t border-base-200 pt-4 flex justify-end">
                            <button 
                                type="button" 
                                className="btn btn-ghost btn-sm" 
                                onClick={() => setShowProfileModal(false)}
                            >
                                Close Profile
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop bg-black/50" onClick={() => setShowProfileModal(false)}></div>
                </div>
            )}

            {/* Pre-trade Checklist Modal */}
            {checklistOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-lg bg-base-100 border border-base-200 shadow-2xl rounded-2xl">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <CheckSquare className="h-5 w-5 text-primary" />
                            Pre-Trade Checklist & Thesis
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            CoinVista's AI Mentor monitors your journaling. Write down your plan before executing.
                        </p>
                        
                        <div className="space-y-4 mt-4">
                            <label className="form-control">
                                <span className="label-text text-xs font-semibold text-gray-500 uppercase">Pre-Trade Thesis / Rationale</span>
                                <textarea
                                    className="textarea textarea-bordered h-24 text-sm mt-1 focus:textarea-primary"
                                    placeholder="Why are you taking this trade? E.g., 'Double bottom support on 4H chart with bullish RSI divergence. Retest of 50 EMA.'"
                                    value={checklist.thesis}
                                    onChange={(e) => setChecklist(prev => ({ ...prev, thesis: e.target.value }))}
                                    required
                                />
                            </label>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <label className="form-control">
                                    <span className="label-text text-xs font-semibold text-gray-500 uppercase">Invalidation Level (Price)</span>
                                    <input
                                        type="number"
                                        step="any"
                                        className="input input-bordered input-sm mt-1 focus:input-primary"
                                        placeholder="E.g., 62500"
                                        value={checklist.invalidation}
                                        onChange={(e) => setChecklist(prev => ({ ...prev, invalidation: e.target.value }))}
                                        required
                                    />
                                </label>
                                
                                <label className="form-control">
                                    <span className="label-text text-xs font-semibold text-gray-500 uppercase">Risk-to-Reward Ratio</span>
                                    <input
                                        type="number"
                                        step="any"
                                        className="input input-bordered input-sm mt-1 focus:input-primary"
                                        placeholder="E.g., 2.0"
                                        value={checklist.rnr}
                                        onChange={(e) => setChecklist(prev => ({ ...prev, rnr: e.target.value }))}
                                        required
                                    />
                                </label>
                            </div>
                            
                            {Number.parseFloat(checklist.rnr) < 1.5 && (
                                <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="font-bold">Risk Management Warning:</span> R:R ratio is below 1.5. A healthy strategy usually targets at least 1.5 R:R to ensure long-term profitability.
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="modal-action flex justify-between gap-2 mt-6">
                            <button 
                                type="button" 
                                className="btn btn-ghost btn-sm" 
                                onClick={() => setChecklistOpen(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-primary btn-sm" 
                                onClick={handleConfirmTrade}
                                disabled={!checklist.thesis || !checklist.invalidation || !checklist.rnr}
                            >
                                Confirm & Execute Order
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop bg-black/50" onClick={() => setChecklistOpen(false)}></div>
                </div>
            )}

            {/* AI Analysis Modal */}
            {analysisModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl bg-base-100 border border-base-200 shadow-2xl rounded-2xl overflow-y-auto max-h-[85vh]">
                        <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b border-base-200 pb-3">
                            <Cpu className="h-6 w-6 text-primary" />
                            AI Trade Performance Review
                        </h3>
                        
                        {loadingAnalysis ? (
                            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                                <span className="loading loading-spinner loading-lg text-primary"></span>
                                <p className="text-sm text-gray-500">Retrieving Llama 3.3 70B analysis...</p>
                            </div>
                        ) : selectedTradeAnalysis ? (
                            <div className="space-y-6 mt-4">
                                {/* Execution Score & Strategy */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-base-200/50 p-4 rounded-xl border border-base-300 flex flex-col items-center justify-center text-center">
                                        <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 justify-center">
                                            <Award className="h-4.5 w-4.5 text-secondary animate-bounce" />
                                            Execution Score
                                        </span>
                                        <div className={`text-4xl font-extrabold mt-1 ${
                                            selectedTradeAnalysis.executionScore >= 80 ? 'text-success' :
                                            selectedTradeAnalysis.executionScore >= 50 ? 'text-warning' :
                                            'text-error'
                                        }`}>
                                            {selectedTradeAnalysis.executionScore}/100
                                        </div>
                                    </div>
                                    
                                    <div className="bg-base-200/50 p-4 rounded-xl border border-base-300 flex flex-col items-center justify-center text-center">
                                        <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 justify-center">
                                            <TrendingUp className="h-4.5 w-4.5 text-primary" />
                                            Strategy
                                        </span>
                                        <span className="text-lg font-bold text-primary mt-1">
                                            {selectedTradeAnalysis.strategy || 'Manual'}
                                        </span>
                                    </div>
                                    
                                    <div className="bg-base-200/50 p-4 rounded-xl border border-base-300 flex flex-col items-center justify-center text-center">
                                        <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 justify-center">
                                            <MessageSquare className="h-4.5 w-4.5 text-info" />
                                            Emotions
                                        </span>
                                        <div className="flex flex-wrap gap-1 justify-center mt-2">
                                            {selectedTradeAnalysis.emotions && selectedTradeAnalysis.emotions.length > 0 ? (
                                                selectedTradeAnalysis.emotions.map((emotion, i) => (
                                                    <span key={i} className="badge badge-sm badge-outline badge-secondary">
                                                        {emotion}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-gray-500">None detected</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Detailed AI Report */}
                                <div className="bg-base-100 p-5 rounded-xl border border-base-200 shadow-inner max-h-96 overflow-y-auto space-y-2">
                                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                                        Mentor Feedback
                                    </h4>
                                    {renderMarkdown(selectedTradeAnalysis.aiReport)}
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                Could not find analysis for this trade.
                            </div>
                        )}
                        
                        <div className="modal-action mt-6 border-t border-base-200 pt-4 flex justify-end">
                            <button 
                                type="button" 
                                className="btn btn-primary btn-sm" 
                                onClick={() => setAnalysisModalOpen(false)}
                            >
                                Close Review
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop bg-black/50" onClick={() => setAnalysisModalOpen(false)}></div>
                </div>
            )}
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
