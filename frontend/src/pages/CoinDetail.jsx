import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    Activity,
    ArrowLeft,
    BarChart3,
    Bell,
    Globe,
    Minus,
    Newspaper,
    Plus,
    Radar,
    ShieldAlert,
    Sparkles,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import PriceChart from '../components/PriceChart';
import { useCoinChart, useCoinDetails, useCryptoData, useWatchlist, useAlerts } from '../hooks/useCryptoData';
import { cryptoAPI, intelligenceAPI } from '../services/api';
import { subscribeToCoin, unsubscribeFromCoin } from '../services/socket';

const CoinDetail = () => {
    const { id } = useParams();
    const { coin, loading: detailsLoading, error: detailsError } = useCoinDetails(id);
    const { chartData, loading: chartLoading, fetchChartData } = useCoinChart(id);
    const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
    const { createAlert } = useAlerts();
    const { coins, fetchCoins } = useCryptoData();

    const [selectedDays, setSelectedDays] = useState(7);
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [alertData, setAlertData] = useState({
        condition: 'above',
        targetPrice: '',
    });
    const [insights, setInsights] = useState(null);
    const [comparisonCoinId, setComparisonCoinId] = useState('');
    const [comparisonChart, setComparisonChart] = useState([]);
    const [comparisonLabel, setComparisonLabel] = useState('');

    useEffect(() => {
        fetchCoins(1, 'usd');
    }, [fetchCoins]);

    useEffect(() => {
        subscribeToCoin(id);
        return () => {
            unsubscribeFromCoin(id);
        };
    }, [id]);

    useEffect(() => {
        const loadInsights = async () => {
            try {
                const response = await intelligenceAPI.getInsights(id);
                setInsights(response.data);
            } catch (error) {
                setInsights(null);
            }
        };

        loadInsights();
    }, [id]);

    useEffect(() => {
        const loadComparisonChart = async () => {
            if (!comparisonCoinId) {
                setComparisonChart([]);
                setComparisonLabel('');
                return;
            }

            try {
                const response = await cryptoAPI.getCoinChart(comparisonCoinId, { days: selectedDays, currency: 'usd' });
                setComparisonChart(response.data?.chartData?.prices?.map((item) => item[1]) || []);
                const comparisonCoin = coins.find((item) => item.id === comparisonCoinId);
                setComparisonLabel(comparisonCoin?.name || comparisonCoinId);
            } catch (error) {
                setComparisonChart([]);
                setComparisonLabel('');
            }
        };

        loadComparisonChart();
    }, [comparisonCoinId, selectedDays, coins]);

    const handleDaysChange = (days) => {
        setSelectedDays(days);
        fetchChartData(id, days);
    };

    const isInWatchlist = watchlist.some((item) => item.id === id);

    const handleWatchlistToggle = async () => {
        if (isInWatchlist) {
            const result = await removeFromWatchlist(id);
            result.success ? toast.success('Removed from watchlist') : toast.error(result.error);
        } else {
            const result = await addToWatchlist(id);
            result.success ? toast.success('Added to watchlist') : toast.error(result.error);
        }
    };

    const handleCreateAlert = async () => {
        if (!alertData.targetPrice) {
            toast.error('Please enter a target price');
            return;
        }

        const result = await createAlert({
            coinId: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            direction: alertData.condition,
            targetPrice: parseFloat(alertData.targetPrice),
        });

        if (result.success) {
            toast.success('Alert created successfully');
            setShowAlertModal(false);
            setAlertData({ condition: 'above', targetPrice: '' });
        } else {
            toast.error(result.error);
        }
    };

    const comparisonOptions = useMemo(
        () => coins.filter((item) => item.id !== id).slice(0, 20),
        [coins, id]
    );

    const formatCurrency = (value) => {
        if (value === undefined || value === null) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: value < 1 ? 4 : 2,
            maximumFractionDigits: value < 1 ? 4 : 2,
        }).format(value);
    };

    const formatLargeNumber = (value) => {
        if (value === undefined || value === null) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
        }).format(value);
    };

    if (detailsLoading || chartLoading) {
        return <LoadingSpinner size="lg" text="Loading coin details..." />;
    }

    if (detailsError) {
        return (
            <div className="alert alert-error mx-auto mt-10 max-w-md">
                <span>{detailsError}</span>
            </div>
        );
    }

    if (!coin) {
        return <div>Coin not found</div>;
    }

    const marketData = coin.market_data;
    const priceChange24h = marketData?.price_change_percentage_24h || 0;
    const isPositive = priceChange24h >= 0;

    return (
        <div className="min-h-screen bg-base-200">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <button className="btn btn-ghost btn-sm mb-4" onClick={() => window.history.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </button>

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                            <img src={coin.image?.large} alt={coin.name} className="h-16 w-16 rounded-full" />
                            <div>
                                <h1 className="text-4xl font-bold">{coin.name}</h1>
                                <p className="text-xl uppercase opacity-70">{coin.symbol}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button className={`btn ${isInWatchlist ? 'btn-error' : 'btn-primary'}`} onClick={handleWatchlistToggle}>
                                {isInWatchlist ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowAlertModal(true)}>
                                <Bell className="mr-2 h-4 w-4" />
                                Set Alert
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-4">
                    <SignalCard
                        title="24h Forecast"
                        icon={<Sparkles className="h-5 w-5 text-primary" />}
                        main={formatCurrency(insights?.prediction?.predictedPrice)}
                        subtitle={`${insights?.prediction?.expectedReturn >= 0 ? '+' : ''}${insights?.prediction?.expectedReturn || 0}% expected move`}
                    />
                    <SignalCard
                        title="Sentiment Score"
                        icon={<Radar className="h-5 w-5 text-secondary" />}
                        main={insights?.sentiment ? `${insights.sentiment.score}/100` : 'N/A'}
                        subtitle={insights?.sentiment?.label || 'Unavailable'}
                    />
                    <SignalCard
                        title="Anomaly Detection"
                        icon={<ShieldAlert className="h-5 w-5 text-warning" />}
                        main={insights?.anomaly?.detected ? insights.anomaly.severity.toUpperCase() : 'Normal'}
                        subtitle={insights?.anomaly?.message || 'Awaiting insight data'}
                    />
                    <SignalCard
                        title="Model Source"
                        icon={<BarChart3 className="h-5 w-5 text-info" />}
                        main={insights?.localModelDataAvailable ? 'Local ML data ready' : 'Heuristic mode'}
                        subtitle={insights?.prediction?.modelLabel || 'Trend/volatility baseline'}
                    />
                </div>

                <div className="mb-8 rounded-2xl border border-primary/10 bg-white/50 p-4 text-sm text-gray-600 shadow-sm dark:bg-dark-200">
                    {insights?.prediction?.disclaimer || 'Experimental research-only signals. Not financial advice.'}
                </div>

                <div className="mb-8">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        {[1, 7, 14, 30, 90, 365].map((days) => (
                            <button
                                key={days}
                                className={`btn btn-sm ${selectedDays === days ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => handleDaysChange(days)}
                            >
                                {days === 1 ? '24H' : days === 365 ? '1Y' : `${days}D`}
                            </button>
                        ))}

                        <select
                            className="select select-bordered select-sm ml-auto"
                            value={comparisonCoinId}
                            onChange={(event) => setComparisonCoinId(event.target.value)}
                        >
                            <option value="">Compare with...</option>
                            {comparisonOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.name} ({option.symbol.toUpperCase()})
                                </option>
                            ))}
                        </select>
                    </div>

                    <PriceChart
                        history={chartData?.prices?.map((item) => item[1]) || []}
                        coinName={coin.name}
                        comparisonHistory={comparisonChart}
                        comparisonName={comparisonLabel}
                    />
                </div>

                <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
                    <InfoCard title="Price Information" icon={<TrendingUp className="h-6 w-6" />}>
                        <StatRow label="Current Price" value={formatCurrency(marketData?.current_price?.usd)} />
                        <StatRow
                            label="24h Change"
                            value={
                                <span className={`flex items-center ${isPositive ? 'text-success' : 'text-error'}`}>
                                    {isPositive ? <TrendingUp className="mr-1 h-4 w-4" /> : <TrendingDown className="mr-1 h-4 w-4" />}
                                    {Math.abs(priceChange24h).toFixed(2)}%
                                </span>
                            }
                        />
                        <StatRow label="24h High" value={formatCurrency(marketData?.high_24h?.usd)} />
                        <StatRow label="24h Low" value={formatCurrency(marketData?.low_24h?.usd)} />
                        <StatRow label="All Time High" value={formatCurrency(marketData?.ath?.usd)} />
                        <StatRow label="All Time Low" value={formatCurrency(marketData?.atl?.usd)} />
                    </InfoCard>

                    <InfoCard title="Market Statistics" icon={<BarChart3 className="h-6 w-6" />}>
                        <StatRow label="Market Cap" value={formatLargeNumber(marketData?.market_cap?.usd)} />
                        <StatRow label="Market Cap Rank" value={`#${coin.market_cap_rank}`} />
                        <StatRow label="24h Volume" value={formatLargeNumber(marketData?.total_volume?.usd)} />
                        <StatRow label="Circulating Supply" value={`${new Intl.NumberFormat('en-US').format(marketData?.circulating_supply)} ${coin.symbol.toUpperCase()}`} />
                        <StatRow label="Total Supply" value={`${marketData?.total_supply ? new Intl.NumberFormat('en-US').format(marketData.total_supply) : 'N/A'} ${coin.symbol.toUpperCase()}`} />
                        <StatRow label="Max Supply" value={`${marketData?.max_supply ? new Intl.NumberFormat('en-US').format(marketData.max_supply) : '∞'} ${coin.symbol.toUpperCase()}`} />
                    </InfoCard>
                </div>

                <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title mb-3">
                                <Newspaper className="h-6 w-6" />
                                News & Sentiment Drivers
                            </h2>
                            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                                {insights?.sentiment?.summary || insights?.dataSourceNote || 'No live news feed is configured yet.'}
                            </p>
                            <div className="space-y-4">
                                {(insights?.news || []).length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                        Add `CRYPTOPANIC_API_KEY` or `GNEWS_API_KEY` to populate this feed.
                                    </div>
                                ) : (
                                    insights.news.map((article) => (
                                        <a
                                            key={`${article.url}-${article.publishedAt}`}
                                            href={article.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block rounded-xl border border-base-300 p-4 transition hover:border-primary/40 hover:bg-base-200/50"
                                        >
                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                <span className="badge badge-outline capitalize">{article.sentimentLabel}</span>
                                                <span className="text-xs text-gray-500">
                                                    {article.publishedAt ? new Date(article.publishedAt).toLocaleString() : ''}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{article.title}</h3>
                                            <p className="mt-1 text-sm text-gray-500">{article.source}</p>
                                        </a>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title mb-3">
                                <Activity className="h-6 w-6" />
                                About {coin.name}
                            </h2>
                            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: coin.description?.en || 'No description available.' }} />
                        </div>
                    </div>
                </div>

                {coin.links?.homepage && coin.links.homepage[0] && (
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title mb-4">
                                <Globe className="h-6 w-6" />
                                Official Links
                            </h2>
                            <a
                                href={coin.links.homepage[0]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link link-primary"
                            >
                                {coin.links.homepage[0]}
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {showAlertModal && (
                <dialog className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="mb-4 text-lg font-bold">
                            <Bell className="mr-2 inline h-5 w-5" />
                            Set Price Alert for {coin.name}
                        </h3>

                        <div className="form-control mb-4">
                            <label className="label">
                                <span className="label-text">Condition</span>
                            </label>
                            <select
                                className="select select-bordered"
                                value={alertData.condition}
                                onChange={(event) => setAlertData({ ...alertData, condition: event.target.value })}
                            >
                                <option value="above">Price goes above</option>
                                <option value="below">Price goes below</option>
                            </select>
                        </div>

                        <div className="form-control mb-6">
                            <label className="label">
                                <span className="label-text">Target Price (USD)</span>
                            </label>
                            <input
                                type="number"
                                step="any"
                                className="input input-bordered"
                                placeholder="Enter target price"
                                value={alertData.targetPrice}
                                onChange={(event) => setAlertData({ ...alertData, targetPrice: event.target.value })}
                            />
                            <label className="label">
                                <span className="label-text-alt">Current price: {formatCurrency(Number(marketData?.current_price?.usd ?? 0))}</span>
                            </label>
                        </div>

                        <div className="modal-action">
                            <button className="btn" onClick={() => setShowAlertModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreateAlert}>Create Alert</button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => setShowAlertModal(false)}>close</button>
                    </form>
                </dialog>
            )}
        </div>
    );
};

const SignalCard = ({ title, icon, main, subtitle }) => (
    <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200">
        <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
            {icon}
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{main}</div>
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</div>
    </div>
);

const InfoCard = ({ title, icon, children }) => (
    <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
            <h2 className="card-title mb-4">
                {icon}
                {title}
            </h2>
            <div className="space-y-3">{children}</div>
        </div>
    </div>
);

const StatRow = ({ label, value }) => (
    <div className="flex justify-between gap-4">
        <span className="text-sm opacity-70">{label}</span>
        <span className="font-semibold text-right">{value}</span>
    </div>
);

export default CoinDetail;
