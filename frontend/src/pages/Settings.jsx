import { useState, useEffect } from 'react';
import { Copy, ShieldCheck, Trash2, Wallet, AlertTriangle, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { liveTradingAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const Settings = () => {
    const {
        user,
        updateSettings,
        setupTwoFactor,
        verifyTwoFactor,
        disableTwoFactor,
        deleteAccount,
    } = useAuth();
    const [saving, setSaving] = useState(false);
    const [twoFactorSetup, setTwoFactorSetup] = useState(null);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [disableCode, setDisableCode] = useState('');
    const [eligibility, setEligibility] = useState({ eligible: false, totalTrades: 0, winRate: 0, message: '' });
    const [loadingEligibility, setLoadingEligibility] = useState(true);
    const [liveExchange, setLiveExchange] = useState('binance');
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [acceptedRisk, setAcceptedRisk] = useState(false);
    const [submittingLive, setSubmittingLive] = useState(false);

    const [walletBalance, setWalletBalance] = useState(null);
    const [connectingWallet, setConnectingWallet] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');

    useEffect(() => {
        if (user?.phoneNumber) {
            setPhoneNumber(user.phoneNumber);
        } else {
            setPhoneNumber('');
        }
    }, [user?.phoneNumber]);

    const handleSavePhoneNumber = async () => {
        setSaving(true);
        try {
            await updateSettings({ phoneNumber: phoneNumber.trim() });
        } finally {
            setSaving(false);
        }
    };

    const fetchWalletBalance = async (address) => {
        if (!window.ethereum || !address) {
            setWalletBalance(null);
            return;
        }

        try {
            const balanceHex = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [address, 'latest'],
            });
            const balance = parseInt(balanceHex, 16) / 1e18;
            setWalletBalance(balance);
        } catch (error) {
            setWalletBalance(null);
        }
    };

    useEffect(() => {
        if (user?.walletAddress) {
            fetchWalletBalance(user.walletAddress);
        } else {
            setWalletBalance(null);
        }
    }, [user?.walletAddress]);

    const connectWallet = async () => {
        if (!window.ethereum) {
            toast.error('MetaMask or another EVM wallet is required for wallet connection.');
            return;
        }

        setConnectingWallet(true);
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const address = accounts?.[0];
            if (address) {
                const res = await updateSettings({ walletAddress: address });
                if (res.success) {
                    toast.success('Wallet connected successfully!');
                    fetchWalletBalance(address);
                }
            }
        } catch (error) {
            toast.error('Wallet connection was cancelled or failed.');
        } finally {
            setConnectingWallet(false);
        }
    };

    const disconnectWallet = async () => {
        if (!window.confirm('Are you sure you want to disconnect your wallet?')) {
            return;
        }

        setSaving(true);
        try {
            const res = await updateSettings({ walletAddress: '' });
            if (res.success) {
                toast.success('Wallet disconnected successfully.');
                setWalletBalance(null);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (field, value) => {
        setSaving(true);
        try {
            await updateSettings({ [field]: value });
        } finally {
            setSaving(false);
        }
    };

    const beginTwoFactorSetup = async () => {
        const setup = await setupTwoFactor();
        setTwoFactorSetup(setup);
        setTwoFactorCode('');
    };

    const confirmTwoFactor = async () => {
        const result = await verifyTwoFactor(twoFactorCode);
        if (result.success) {
            setTwoFactorSetup(null);
            setTwoFactorCode('');
        }
    };

    const removeTwoFactor = async () => {
        const result = await disableTwoFactor(disableCode);
        if (result.success) {
            setDisableCode('');
        }
    };

    const destroyAccount = async () => {
        if (!window.confirm('Delete your CoinVista account and all saved data? This cannot be undone.')) {
            return;
        }
        const result = await deleteAccount();
        if (result.success) {
            window.location.href = '/';
        }
    };

    useEffect(() => {
        const fetchEligibility = async () => {
            try {
                const response = await liveTradingAPI.getEligibility();
                setEligibility(response.data);
            } catch (err) {
                console.error("Failed to load live trading eligibility:", err);
            } finally {
                setLoadingEligibility(false);
            }
        };
        if (user) {
            fetchEligibility();
        }
    }, [user?.liveTradingEnabled, user]);

    const handleEnableLive = async (e) => {
        e.preventDefault();
        if (!acceptedRisk) {
            toast.error("You must accept the risk disclosure statement.");
            return;
        }
        setSubmittingLive(true);
        try {
            await liveTradingAPI.enable(true, liveExchange, apiKey, apiSecret);
            toast.success("Live trading successfully activated!");
            window.location.reload();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to activate live trading.");
        } finally {
            setSubmittingLive(false);
        }
    };

    const handleDisableLive = async () => {
        if (!window.confirm("Are you sure you want to deactivate live trading? This locks live ordering.")) {
            return;
        }
        setSubmittingLive(true);
        try {
            await liveTradingAPI.enable(false, '', '', '');
            toast.success("Live trading deactivated.");
            window.location.reload();
        } catch (err) {
            toast.error("Failed to deactivate live trading.");
        } finally {
            setSubmittingLive(false);
        }
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Security & Privacy Settings</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Manage privacy mode, simulator-safe sessions, authenticator-based 2FA, and wallet metadata.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <SettingsCard
                    title="Privacy Mode"
                    description="Blur balances across the dashboard when you are working in public spaces."
                    action={(
                        <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={Boolean(user?.privacyModeEnabled)}
                            onChange={(event) => handleToggle('privacyModeEnabled', event.target.checked)}
                            disabled={saving}
                        />
                    )}
                />

                <SettingsCard
                    title="Email Alerts"
                    description="Allow server-side price alerts to email you when thresholds trigger while you are offline."
                    action={(
                        <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={Boolean(user?.emailNotificationsEnabled)}
                            onChange={(event) => handleToggle('emailNotificationsEnabled', event.target.checked)}
                            disabled={saving}
                        />
                    )}
                />

                <SettingsCard
                    title="WhatsApp Alerts"
                    description="Allow server-side price alerts to send you WhatsApp alerts when thresholds trigger."
                    action={(
                        <input
                            type="checkbox"
                            className="toggle toggle-primary"
                            checked={Boolean(user?.whatsAppNotificationsEnabled)}
                            onChange={(event) => handleToggle('whatsAppNotificationsEnabled', event.target.checked)}
                            disabled={saving}
                        />
                    )}
                />
            </div>

            {/* WhatsApp Phone Number Card */}
            <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200">
                <div className="mb-4 flex items-center gap-3">
                    <div className="h-6 w-6 text-primary flex items-center justify-center text-lg font-bold">📞</div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-sans">WhatsApp Alert Phone Number</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Set your phone number in international format (e.g. +14155238886) to receive WhatsApp notifications.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        className="input input-bordered w-full max-w-md"
                        placeholder="+14155238886"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={saving}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleSavePhoneNumber}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Phone Number'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200">
                    <div className="mb-4 flex items-center gap-3">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Two-Factor Authentication</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {user?.twoFactorEnabled ? 'Authenticator protection is active.' : 'Add a TOTP authenticator for login verification.'}
                            </p>
                        </div>
                    </div>

                    {!user?.twoFactorEnabled && !twoFactorSetup && (
                        <button className="btn btn-primary" onClick={beginTwoFactorSetup}>
                            Enable 2FA
                        </button>
                    )}

                    {!user?.twoFactorEnabled && twoFactorSetup && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Secret key</p>
                                <div className="mt-1 flex items-center justify-between gap-3">
                                    <code className="break-all text-sm">{twoFactorSetup.secret}</code>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => navigator.clipboard.writeText(twoFactorSetup.secret)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                </div>
                                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                    Add this key manually to Google Authenticator/Authy, then enter the 6-digit code below.
                                </p>
                            </div>

                            <label className="form-control">
                                <span className="label-text mb-2">Authenticator code</span>
                                <input
                                    type="text"
                                    maxLength={6}
                                    inputMode="numeric"
                                    value={twoFactorCode}
                                    onChange={(event) => setTwoFactorCode(event.target.value)}
                                    className="input input-bordered"
                                    placeholder="123456"
                                />
                            </label>

                            <div className="flex gap-3">
                                <button className="btn btn-primary" onClick={confirmTwoFactor}>
                                    Verify & Enable
                                </button>
                                <button className="btn btn-ghost" onClick={() => setTwoFactorSetup(null)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {user?.twoFactorEnabled && (
                        <div className="space-y-4">
                            <label className="form-control">
                                <span className="label-text mb-2">Authenticator code to disable</span>
                                <input
                                    type="text"
                                    maxLength={6}
                                    inputMode="numeric"
                                    value={disableCode}
                                    onChange={(event) => setDisableCode(event.target.value)}
                                    className="input input-bordered"
                                    placeholder="123456"
                                />
                            </label>
                            <button className="btn btn-outline" onClick={removeTwoFactor}>
                                Disable 2FA
                            </button>
                        </div>
                    )}
                </div>

                <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200">
                    <div className="mb-4 flex items-center gap-3">
                        <Wallet className="h-6 w-6 text-secondary" />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Connected Wallet</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                CoinVista stores only the public wallet address you choose to connect.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl bg-base-200 p-4 text-sm dark:bg-dark-100">
                        {user?.walletAddress ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                    <span className="font-semibold text-gray-600 dark:text-gray-400">Address</span>
                                    <code className="break-all font-mono bg-base-300 dark:bg-dark-200 px-2 py-0.5 rounded text-primary">{user.walletAddress}</code>
                                </div>
                                {walletBalance !== null && (
                                    <div className="flex items-center justify-between border-t border-base-300 dark:border-dark-200 pt-2 mt-1">
                                        <span className="font-semibold text-gray-600 dark:text-gray-400">Native Balance</span>
                                        <span className="font-bold text-gray-900 dark:text-gray-100">{walletBalance.toFixed(4)} ETH</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400">No Web3 wallet linked yet. Link your MetaMask to enable native chain analysis.</p>
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm">
                        <div className="text-gray-500 dark:text-gray-400">
                            Auth provider: <span className="font-semibold text-gray-800 dark:text-gray-100">{user?.authProvider || 'local'}</span>
                        </div>
                        <div className="flex gap-2">
                            {user?.walletAddress ? (
                                <>
                                    <button 
                                        className="btn btn-sm btn-outline btn-secondary" 
                                        onClick={connectWallet}
                                        disabled={connectingWallet}
                                    >
                                        Change Wallet
                                    </button>
                                    <button 
                                        className="btn btn-sm btn-ghost text-error hover:bg-error/10" 
                                        onClick={disconnectWallet}
                                        disabled={saving}
                                    >
                                        Disconnect
                                    </button>
                                </>
                            ) : (
                                <button 
                                    className="btn btn-sm btn-primary" 
                                    onClick={connectWallet}
                                    disabled={connectingWallet}
                                >
                                    {connectingWallet ? (
                                        <>
                                            <span className="loading loading-spinner loading-xs"></span>
                                            Connecting...
                                        </>
                                    ) : (
                                        'Connect MetaMask'
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Trading Credentials Safety Card */}
            <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200">
                <div className="mb-4 flex items-center gap-3">
                    <Key className="h-6 w-6 text-primary" />
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-sans">Live Trading Credentials</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Connect your live exchange account securely. Gated by performance track record checks.
                        </p>
                    </div>
                </div>

                {user?.liveTradingEnabled ? (
                    <div className="space-y-4">
                        <div className="alert alert-success bg-success/15 border border-success/30 text-success text-sm rounded-xl">
                            <span>Live trading is currently active on your account via <b>{user.activeExchange?.toUpperCase()}</b>.</span>
                        </div>
                        <button
                            onClick={handleDisableLive}
                            disabled={submittingLive}
                            className="btn btn-outline btn-error btn-sm"
                        >
                            Deactivate Live Trading
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {loadingEligibility ? (
                            <span className="loading loading-spinner text-primary"></span>
                        ) : !eligibility.eligible ? (
                            <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl space-y-3">
                                <div className="flex items-center gap-2 text-warning font-bold text-sm">
                                    <AlertTriangle className="h-5 w-5" />
                                    Live Trading Gated & Locked
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    To protect users, live trading is locked until you complete at least <b>30 paper trades</b> with a <b>win rate &gt; 50%</b>.
                                </p>
                                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                    <div className="bg-base-200 p-2 rounded-lg">
                                        <span className="text-gray-500">Completed Trades:</span>
                                        <div className="font-bold text-sm text-primary">{eligibility.totalTrades}/30</div>
                                    </div>
                                    <div className="bg-base-200 p-2 rounded-lg">
                                        <span className="text-gray-500">Win Rate:</span>
                                        <div className="font-bold text-sm text-primary">{eligibility.winRate}%/50%</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleEnableLive} className="space-y-4 border-t border-base-200 pt-4">
                                <div className="alert alert-success bg-success/10 border border-success/30 text-success text-sm rounded-xl py-2 px-3">
                                    <span>🎉 Safety requirements met! Enter your exchange API details.</span>
                                </div>

                                <div className="form-control">
                                    <label className="label text-xs font-semibold text-gray-500 uppercase">Active Exchange</label>
                                    <select
                                        value={liveExchange}
                                        onChange={(e) => setLiveExchange(e.target.value)}
                                        className="select select-bordered select-sm w-full"
                                    >
                                        <option value="binance">Binance (Sandbox/Testnet)</option>
                                        <option value="coinbase">Coinbase Pro (Sandbox/Testnet)</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="form-control">
                                        <label className="label text-xs font-semibold text-gray-500 uppercase">API Key</label>
                                        <input
                                            type="text"
                                            required
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            className="input input-bordered input-sm"
                                            placeholder="Enter API Key"
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label text-xs font-semibold text-gray-500 uppercase">API Secret</label>
                                        <input
                                            type="password"
                                            required
                                            value={apiSecret}
                                            onChange={(e) => setApiSecret(e.target.value)}
                                            className="input input-bordered input-sm"
                                            placeholder="Enter API Secret"
                                        />
                                    </div>
                                </div>

                                <label className="flex items-start gap-2 cursor-pointer select-none border border-base-300 p-3 rounded-xl bg-base-200/50">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary checkbox-xs mt-1"
                                        checked={acceptedRisk}
                                        onChange={(e) => setAcceptedRisk(e.target.checked)}
                                    />
                                    <span className="text-[11px] text-gray-600 dark:text-gray-400 leading-normal font-sans">
                                        I accept the <b>Risk Disclosure Statement</b>: I understand that live trading crypto assets involves a high risk of capital loss. I authorize CoinVista and the autonomous agent tools to route trades on my behalf.
                                    </span>
                                </label>

                                <button
                                    type="submit"
                                    disabled={submittingLive}
                                    className="btn btn-primary btn-sm w-full font-semibold"
                                >
                                    Activate Live Trading
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>

            <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200">
                <div className="mb-3 flex items-center gap-3 text-red-500">
                    <Trash2 className="h-5 w-5" />
                    <h2 className="text-xl font-bold">Delete Account</h2>
                </div>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    This removes your stored holdings, alerts, paper-trading history, and refresh sessions.
                </p>
                <button className="btn btn-error" onClick={destroyAccount}>
                    Delete My Account
                </button>
            </div>
        </div>
    );
};

const SettingsCard = ({ title, description, action }) => (
    <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200">
        <div className="flex items-start justify-between gap-4">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
            </div>
            {action}
        </div>
    </div>
);

export default Settings;
