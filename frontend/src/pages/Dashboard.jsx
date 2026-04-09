import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    BellRing,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Download,
    Eye,
    EyeOff,
    LineChart,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import { useCryptoData } from '../hooks/useCryptoData';
import { paperTradingAPI, portfolioAPI } from '../services/api';
import { PortfolioChart } from '../components/dashboard/PortfolioChart';
import { AllocationChart } from '../components/dashboard/AllocationChart';
import { HoldingsTable } from '../components/dashboard/HoldingsTable';
import { AddHoldingModal } from '../components/dashboard/AddHoldingModal';
import { formatCurrency, formatNumber, formatPercentage, toSafeNumber } from '../utils/format';

const maskCurrency = (value, hidden) => (hidden ? '••••••' : formatCurrency(value));

const Dashboard = () => {
    const navigate = useNavigate();
    const { prices, connected } = useSocket();
    const { user, updateSettings, refreshUser } = useAuth();
    const [portfolioSummary, setPortfolioSummary] = useState({
        holdings: [],
        allocation: [],
        totalInvested: 0,
        totalValue: 0,
        profitLoss: 0,
        roi: 0,
        diversificationScore: 0,
        holdingCount: 0,
    });
    const [paperSummary, setPaperSummary] = useState({
        totalValue: 0,
        totalPnl: 0,
        positions: [],
        cashBalance: 0,
    });
    const [loadingPortfolio, setLoadingPortfolio] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [downloadingReport, setDownloadingReport] = useState(false);
    const [walletBalance, setWalletBalance] = useState(null);

    const [currency, setCurrency] = useState('usd');
    const { coins, loading: coinsLoading, page, fetchCoins, nextPage, prevPage } = useCryptoData();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchCoins(1, currency);
    }, [currency, fetchCoins]);

    const loadPortfolio = async () => {
        setLoadingPortfolio(true);
        try {
            const response = await portfolioAPI.getSummary();
            setPortfolioSummary(response.data);
        } catch (error) {
            setPortfolioSummary({
                holdings: [],
                allocation: [],
                totalInvested: 0,
                totalValue: 0,
                profitLoss: 0,
                roi: 0,
                diversificationScore: 0,
                holdingCount: 0,
            });
        } finally {
            setLoadingPortfolio(false);
        }
    };

    const loadPaperSummary = async () => {
        try {
            const response = await paperTradingAPI.getSummary();
            setPaperSummary(response.data);
        } catch (error) {
            setPaperSummary({ totalValue: 0, totalPnl: 0, positions: [], cashBalance: 0 });
        }
    };

    useEffect(() => {
        loadPortfolio();
        loadPaperSummary();
    }, []);

    const fetchWalletBalance = async (address) => {
        if (!window.ethereum || !address) {
            return;
        }

        try {
            const balanceHex = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [address, 'latest'],
            });
            const balance = Number.parseInt(balanceHex, 16) / 1e18;
            setWalletBalance(balance);
        } catch (error) {
            setWalletBalance(null);
        }
    };

    useEffect(() => {
        if (user?.walletAddress) {
            fetchWalletBalance(user.walletAddress);
        }
    }, [user?.walletAddress]);

    const filteredCoins = useMemo(() => {
        if (!searchQuery) {
            return coins;
        }
        return coins.filter((coin) =>
            coin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            coin.symbol?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [coins, searchQuery]);

    const portfolioTrendData = useMemo(() => {
        const invested = toSafeNumber(portfolioSummary.totalInvested);
        const current = toSafeNumber(portfolioSummary.totalValue);
        return [
            { date: 'Entry', value: invested * 0.92 },
            { date: 'Build', value: invested * 0.97 },
            { date: 'Review', value: invested * 1.01 },
            { date: 'Risk', value: current * 0.96 },
            { date: 'Now', value: current },
        ];
    }, [portfolioSummary.totalInvested, portfolioSummary.totalValue]);

    const allocationData = useMemo(() => (
        portfolioSummary.allocation?.map((slice) => ({
            name: slice.symbol || slice.name,
            value: slice.value,
            percentage: slice.percentage,
        })) || []
    ), [portfolioSummary.allocation]);

    const handleAddHolding = async (holdingData) => {
        try {
            await portfolioAPI.createHolding(holdingData);
            setShowAddModal(false);
            await loadPortfolio();
        } catch (error) {
            window.alert(error.response?.data?.message || 'Failed to add holding');
        }
    };

    const handleDeleteHolding = async (id) => {
        if (!window.confirm('Remove this holding from your portfolio?')) {
            return;
        }

        try {
            await portfolioAPI.deleteHolding(id);
            await loadPortfolio();
        } catch (error) {
            window.alert(error.response?.data?.message || 'Failed to delete holding');
        }
    };

    const togglePrivacyMode = async () => {
        await updateSettings({ privacyModeEnabled: !user?.privacyModeEnabled });
        await refreshUser();
    };

    const connectWallet = async () => {
        if (!window.ethereum) {
            window.alert('MetaMask or another EVM wallet is required for wallet connection.');
            return;
        }

        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const address = accounts?.[0];
            if (address) {
                await updateSettings({ walletAddress: address });
                await refreshUser();
                await fetchWalletBalance(address);
            }
        } catch (error) {
            window.alert('Wallet connection was cancelled or failed.');
        }
    };

    const downloadPortfolioReport = async () => {
        setDownloadingReport(true);
        try {
            const response = await portfolioAPI.exportCsv();
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'coinvista-portfolio-report.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } finally {
            setDownloadingReport(false);
        }
    };

    const hidden = Boolean(user?.privacyModeEnabled);
    const paperPositive = toSafeNumber(paperSummary.totalPnl) >= 0;
    const portfolioPositive = toSafeNumber(portfolioSummary.profitLoss) >= 0;

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-6 py-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                                Welcome back, {user?.name || 'Analyst'}.
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                CoinVista now blends portfolio analytics, alerting, simulation, and live market intelligence.
                                {connected && <span className="ml-2 text-success">● Live</span>}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button className="btn btn-outline btn-sm" onClick={togglePrivacyMode}>
                                {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                {hidden ? 'Show balances' : 'Hide balances'}
                            </button>
                            <button className="btn btn-outline btn-sm" onClick={connectWallet}>
                                <Wallet className="h-4 w-4" />
                                {user?.walletAddress ? 'Reconnect wallet' : 'Connect wallet'}
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={downloadPortfolioReport} disabled={downloadingReport}>
                                <Download className="h-4 w-4" />
                                {downloadingReport ? 'Exporting...' : 'Export CSV'}
                            </button>
                        </div>
                    </div>
                </motion.div>

                <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Live Portfolio Value"
                        value={maskCurrency(portfolioSummary.totalValue, hidden)}
                        subtitle={`${portfolioSummary.holdingCount || 0} holdings`}
                        icon={<DollarSign className="h-5 w-5 text-primary" />}
                    />
                    <StatCard
                        title="Profit / Loss"
                        value={maskCurrency(portfolioSummary.profitLoss, hidden)}
                        subtitle={hidden ? '••••' : formatPercentage(portfolioSummary.roi)}
                        icon={<LineChart className={`h-5 w-5 ${portfolioPositive ? 'text-success' : 'text-error'}`} />}
                        accent={portfolioPositive ? 'text-success' : 'text-error'}
                    />
                    <StatCard
                        title="Diversification Score"
                        value={`${formatNumber(portfolioSummary.diversificationScore || 0, 0)}/100`}
                        subtitle="Lower concentration, stronger balance"
                        icon={<Sparkles className="h-5 w-5 text-secondary" />}
                    />
                    <StatCard
                        title="Paper Trading"
                        value={maskCurrency(paperSummary.totalValue, hidden)}
                        subtitle={hidden ? '••••' : `${paperPositive ? '+' : ''}${formatCurrency(paperSummary.totalPnl)}`}
                        icon={<BellRing className={`h-5 w-5 ${paperPositive ? 'text-success' : 'text-error'}`} />}
                        accent={paperPositive ? 'text-success' : 'text-error'}
                    />
                </div>

                <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <PortfolioChart data={portfolioTrendData} />
                    </div>
                    <div className="space-y-6">
                        <AllocationChart data={allocationData} />
                        <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200">
                            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Wallet & On-Ramp</h3>
                            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                                <p>
                                    Wallet: {user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'Not connected'}
                                </p>
                                <p>Native balance: {walletBalance == null ? 'Connect wallet' : `${formatNumber(walletBalance, 4)} ETH`}</p>
                                <p>Paper trading cash: {hidden ? '••••' : formatCurrency(paperSummary.cashBalance)}</p>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-3">
                                {process.env.REACT_APP_MOONPAY_URL && (
                                    <a className="btn btn-sm btn-outline" href={process.env.REACT_APP_MOONPAY_URL} target="_blank" rel="noreferrer">
                                        MoonPay Sandbox
                                    </a>
                                )}
                                {process.env.REACT_APP_TRANSAK_URL && (
                                    <a className="btn btn-sm btn-outline" href={process.env.REACT_APP_TRANSAK_URL} target="_blank" rel="noreferrer">
                                        Transak Sandbox
                                    </a>
                                )}
                                <Link className="btn btn-sm btn-primary" to="/simulator">
                                    Open Simulator
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Holdings Section ─────────────────────────────────── */}
                <div className="mb-8">
                    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Portfolio Holdings</h2>
                        <div className="flex gap-2">
                            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                                + Add Holding
                            </button>
                            <button className="btn btn-outline btn-sm" onClick={downloadPortfolioReport} disabled={downloadingReport}>
                                <Download className="h-4 w-4" />
                                {downloadingReport ? 'Exporting...' : 'Export CSV'}
                            </button>
                        </div>
                    </div>
                    <HoldingsTable
                        holdings={portfolioSummary.holdings}
                        prices={coins}
                        onDelete={handleDeleteHolding}
                    />
                </div>

                {/* ── Market Overview ───────────────────────────────────── */}
                <div className="mb-8">
                    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Market Overview</h2>

                        <div className="flex gap-3 flex-wrap">
                            <div className="join">
                                {['usd', 'eur', 'btc'].map((unit) => (
                                    <button
                                        key={unit}
                                        className={`btn btn-sm join-item ${currency === unit ? 'btn-primary' : ''}`}
                                        onClick={() => setCurrency(unit)}
                                    >
                                        {unit.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder="Search coins..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input input-bordered input-sm w-full max-w-xs"
                            />
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-dark-200">
                        <div className="overflow-x-auto">
                            {coinsLoading ? (
                                <div className="flex items-center justify-center py-16">
                                    <span className="loading loading-spinner loading-lg text-primary" />
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 text-sm font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                            <th className="px-4 py-3 text-left w-10">#</th>
                                            <th className="px-4 py-3 text-left">Coin</th>
                                            <th className="px-4 py-3 text-right">Price</th>
                                            <th className="px-4 py-3 text-right">24h Change</th>
                                            <th className="px-4 py-3 text-right hidden md:table-cell">Market Cap</th>
                                            <th className="px-4 py-3 text-right hidden lg:table-cell">24h Volume</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCoins.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-gray-500 dark:text-gray-400">
                                                    {searchQuery ? `No coins match "${searchQuery}"` : 'No market data available'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredCoins.map((coin, index) => {
                                                const change = coin.price_change_percentage_24h ?? 0;
                                                const isUp = change >= 0;
                                                const priceStr = currency === 'btc'
                                                    ? `₿${(coin.current_price ?? 0).toFixed(8)}`
                                                    : formatCurrency(coin.current_price ?? 0);
                                                return (
                                                    <motion.tr
                                                        key={coin.id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: index * 0.02 }}
                                                        onClick={() => navigate(`/coin/${coin.id}`)}
                                                        className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-primary/5 dark:border-gray-700/50 dark:hover:bg-primary/10"
                                                    >
                                                        <td className="px-4 py-3 text-sm text-gray-400">
                                                            {coin.market_cap_rank ?? page * 50 - 50 + index + 1}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                {coin.image && (
                                                                    <img src={coin.image} alt={coin.name} className="h-8 w-8 rounded-full" />
                                                                )}
                                                                <div>
                                                                    <div className="font-semibold text-gray-900 dark:text-gray-100">{coin.name}</div>
                                                                    <div className="text-xs uppercase text-gray-500 dark:text-gray-400">{coin.symbol}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                                                            {priceStr}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={`inline-flex items-center gap-1 font-medium ${
                                                                isUp ? 'text-success' : 'text-error'
                                                            }`}>
                                                                {isUp
                                                                    ? <TrendingUp className="h-3.5 w-3.5" />
                                                                    : <TrendingDown className="h-3.5 w-3.5" />}
                                                                {Math.abs(change).toFixed(2)}%
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300 hidden md:table-cell">
                                                            {coin.market_cap
                                                                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(coin.market_cap)
                                                                : 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300 hidden lg:table-cell">
                                                            {coin.total_volume
                                                                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(coin.total_volume)
                                                                : 'N/A'}
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Page {page}</span>
                            <div className="flex gap-2">
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={prevPage}
                                    disabled={page === 1 || coinsLoading}
                                >
                                    <ChevronLeft className="h-4 w-4" /> Prev
                                </button>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={nextPage}
                                    disabled={coinsLoading}
                                >
                                    Next <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {showAddModal && (
                    <AddHoldingModal
                        onClose={() => setShowAddModal(false)}
                        onSubmit={handleAddHolding}
                        prices={coins}
                    />
                )}
            </div>
        </div>
    );
};

const StatCard = ({ title, value, subtitle, icon, accent = 'text-gray-500' }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200"
    >
        <div className="mb-2 flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">{title}</span>
            {icon}
        </div>
        <div className={`text-3xl font-bold text-gray-900 dark:text-gray-100 ${accent}`}>{value}</div>
        {subtitle && <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</div>}
    </motion.div>
);

export default Dashboard;
