import { useState, useEffect } from 'react';
import { Copy, ShieldCheck, Trash2, Wallet, AlertTriangle, Key, CheckCircle, ExternalLink } from 'lucide-react';
import { useReadContracts } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatUnits } from 'viem';
import { useAuth } from '../context/AuthContext';
import { liveTradingAPI, billingAPI, gamificationAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { useWallet } from '../hooks/useWallet';
import { useSIWE } from '../hooks/useSIWE';

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

    const [xpData, setXpData] = useState({ xp: 0, level: 1, badges: [] });
    const [loadingXp, setLoadingXp] = useState(true);

    useEffect(() => {
        const fetchXP = async () => {
            try {
                const res = await gamificationAPI.getXP();
                setXpData(res.data || { xp: 0, level: 1, badges: [] });
            } catch (e) {
                console.error("Failed to fetch XP details", e);
            } finally {
                setLoadingXp(false);
            }
        };
        fetchXP();
    }, []);

    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        avatarUrl: user?.avatarUrl || ''
    });
    const [savingProfile, setSavingProfile] = useState(false);

    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || '',
                avatarUrl: user.avatarUrl || ''
            });
        }
    }, [user]);

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            await updateSettings({
                name: profileForm.name,
                avatarUrl: profileForm.avatarUrl
            });
            toast.success("Profile details updated successfully!");
        } catch (e) {
            console.error("Failed to update profile details", e);
            toast.error("Failed to update profile details");
        } finally {
            setSavingProfile(false);
        }
    };

    // ── Wagmi wallet state (replaces all window.ethereum calls) ──────────────
    const {
        address,
        isConnected,
        chainId,
        nativeBalance,
        nativeSymbol,
        ensName,
        ensAvatar,
        shortAddress,
        disconnect,
    } = useWallet();

    // SIWE verification
    const { signIn: siweSignIn, status: siweStatus } = useSIWE();

    // ERC-20 balances via multicall — reads USDC, USDT, WETH on current chain
    // Contract addresses for Ethereum mainnet (wagmi will use the correct chain automatically)
    const ERC20_ABI = [
        {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
        },
    ];

    const ERC20_TOKENS = {
        1: { // Ethereum mainnet
            USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
            USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
            WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
        },
        137: { // Polygon
            USDC: { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
            USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
            WETH: { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
        },
    };

    const tokens = chainId ? ERC20_TOKENS[chainId] : null;
    const { data: tokenBalances } = useReadContracts({
        contracts: tokens && address ? [
            { address: tokens.USDC.address, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] },
            { address: tokens.USDT.address, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] },
            { address: tokens.WETH.address, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] },
        ] : [],
        query: { enabled: Boolean(address && tokens) },
    });

    const usdcBalance = tokenBalances?.[0]?.result != null && tokens
        ? parseFloat(formatUnits(tokenBalances[0].result, tokens.USDC.decimals)).toFixed(2)
        : null;
    const usdtBalance = tokenBalances?.[1]?.result != null && tokens
        ? parseFloat(formatUnits(tokenBalances[1].result, tokens.USDT.decimals)).toFixed(2)
        : null;
    const wethBalance = tokenBalances?.[2]?.result != null && tokens
        ? parseFloat(formatUnits(tokenBalances[2].result, tokens.WETH.decimals)).toFixed(4)
        : null;

    // Phone number state (for WhatsApp alerts)
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

            {/* Gamification Level & Badges Shelf */}
            <div className="glass-card rounded-2xl bg-white dark:bg-dark-200 p-6 shadow-lg border border-base-200 dark:border-white/10">
                <div className="flex flex-col md:flex-row items-center md:justify-between gap-6">
                    {/* Level Badge & XP Progress */}
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-tr from-primary to-secondary shadow-lg text-white font-black text-2xl animate-pulse">
                            <span className="absolute -top-2 -right-2 text-xs bg-accent text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                                Lvl
                            </span>
                            {xpData.level}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-1.5">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Trader Experience</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{xpData.xp % 500} / 500 XP to Level {xpData.level + 1}</span>
                            </div>
                            <div className="w-full bg-base-300 rounded-full h-3 overflow-hidden border border-base-200 dark:border-white/5">
                                <div 
                                    className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-500"
                                    style={{ width: `${(xpData.xp % 500) / 5.0}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Total accumulated XP: <span className="font-bold font-mono text-primary">{xpData.xp} XP</span>
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex gap-4 self-stretch md:self-auto border-t md:border-t-0 md:border-l border-base-300 dark:border-white/10 pt-4 md:pt-0 md:pl-6">
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Achievements</p>
                            <p className="text-2xl font-black text-secondary">{xpData.badges?.length || 0} / 5</p>
                        </div>
                    </div>
                </div>

                <div className="divider my-4" />

                {/* Badges Display */}
                <div>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">Unlocked Badges Shelf</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { id: 'First Step', name: 'First Step', icon: '🚀', desc: 'Executed your first paper trade.', xp: '+100 XP' },
                            { id: 'Profit Taker', name: 'Profit Taker', icon: '💰', desc: 'Closed a position with >$1k profit.', xp: '+200 XP' },
                            { id: 'Risk Master', name: 'Risk Master', icon: '🛡️', desc: 'Pre-trade risk reward ratio >= 2.0.', xp: '+300 XP' },
                            { id: 'Diamond Hands', name: 'Diamond Hands', icon: '💎', desc: 'Closed via Take Profit limit trigger.', xp: '+250 XP' },
                            { id: 'Web3 Explorer', name: 'Web3 Explorer', icon: '🔌', desc: 'Linked wallet using SIWE signature.', xp: '+150 XP' }
                        ].map((badge) => {
                            const isUnlocked = xpData.badges?.includes(badge.id);
                            return (
                                <div 
                                    key={badge.id} 
                                    className={`relative flex flex-col items-center text-center p-4 rounded-xl border transition-all duration-300 ${
                                        isUnlocked 
                                            ? 'bg-base-100/50 border-secondary/30 shadow-md scale-100 hover:scale-105' 
                                            : 'bg-base-300/30 border-transparent opacity-40 grayscale'
                                    }`}
                                >
                                    <span className="text-3xl mb-2">{badge.icon}</span>
                                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">{badge.name}</h4>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight flex-1">{badge.desc}</p>
                                    <span className="text-[9px] mt-2 bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                        {badge.xp}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
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

            {/* Profile Settings Card */}
            <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200 border border-base-200 dark:border-white/10">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                    <span>👤</span> Profile Details
                </h2>
                <p className="text-xs text-gray-500 mb-6">
                    Update your display name and choose a profile avatar representation visible on leaderboards.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Form */}
                    <div className="space-y-4">
                        <label className="form-control w-full">
                            <span className="label-text text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Display Name</span>
                            <input
                                type="text"
                                className="input input-bordered mt-1 text-sm focus:input-primary"
                                placeholder="Enter your display name"
                                value={profileForm.name}
                                onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                            />
                        </label>

                        <label className="form-control w-full">
                            <span className="label-text text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Custom Avatar URL</span>
                            <input
                                type="text"
                                className="input input-bordered mt-1 text-sm focus:input-primary"
                                placeholder="https://example.com/avatar.png"
                                value={profileForm.avatarUrl}
                                onChange={(e) => setProfileForm(p => ({ ...p, avatarUrl: e.target.value }))}
                            />
                        </label>

                        <button 
                            className="btn btn-primary btn-sm mt-2" 
                            onClick={handleSaveProfile}
                            disabled={savingProfile || !profileForm.name}
                        >
                            {savingProfile ? 'Saving...' : 'Save Profile Details'}
                        </button>
                    </div>

                    {/* Right Column: Preselected Avatars */}
                    <div>
                        <span className="label-text text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase block mb-3">
                            Quick Select Avatar representation
                        </span>
                        <div className="grid grid-cols-5 gap-3">
                            {[
                                { name: 'Bull', url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=128&auto=format&fit=crop&q=80' },
                                { name: 'Bear', url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=128&auto=format&fit=crop&q=80' },
                                { name: 'Astronaut', url: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=128&auto=format&fit=crop&q=80' },
                                { name: 'Trader', url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=128&auto=format&fit=crop&q=80' },
                                { name: 'Developer', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80' }
                            ].map((avatar) => {
                                const isSelected = profileForm.avatarUrl === avatar.url;
                                return (
                                    <button
                                        key={avatar.name}
                                        onClick={() => setProfileForm(p => ({ ...p, avatarUrl: avatar.url }))}
                                        className={`relative group rounded-xl overflow-hidden border-2 transition-all w-16 h-16 ${
                                            isSelected ? 'border-primary scale-105 shadow-md' : 'border-transparent opacity-75 hover:opacity-100'
                                        }`}
                                        title={avatar.name}
                                    >
                                        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white transition-opacity font-semibold">
                                            {avatar.name}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
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

                {/* ── Connected Wallet ─────────────────────────────────────────────── */}
                <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200">
                    <div className="mb-4 flex items-center gap-3">
                        <Wallet className="h-6 w-6 text-secondary" />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Connected Wallet</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Connect your Web3 wallet to enable on-chain analysis and SIWE authentication.
                            </p>
                        </div>
                    </div>

                    {/* RainbowKit ConnectButton — handles all wallet connection logic */}
                    <div className="mb-4">
                        <ConnectButton
                            accountStatus="full"
                            chainStatus="full"
                            showBalance
                            label="Connect Wallet"
                        />
                    </div>

                    {isConnected && address && (
                        <div className="space-y-3">
                            {/* Address + ENS */}
                            <div className="rounded-xl bg-base-200 dark:bg-dark-100 p-4 space-y-2 text-sm">
                                {ensAvatar && (
                                    <img src={ensAvatar} alt="ENS avatar" className="w-10 h-10 rounded-full mb-2" />
                                )}
                                {ensName && (
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-600 dark:text-gray-400">ENS Name</span>
                                        <span className="font-bold text-primary">{ensName}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-gray-600 dark:text-gray-400">Address</span>
                                    <div className="flex items-center gap-1">
                                        <code className="font-mono text-xs bg-base-300 dark:bg-dark-200 px-2 py-0.5 rounded text-primary">
                                            {shortAddress}
                                        </code>
                                        <button
                                            className="btn btn-ghost btn-xs"
                                            onClick={() => { navigator.clipboard.writeText(address); toast.success('Address copied!'); }}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </button>
                                        <a
                                            href={`https://etherscan.io/address/${address}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-ghost btn-xs"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-gray-600 dark:text-gray-400">Chain ID</span>
                                    <span className="text-gray-800 dark:text-gray-100">{chainId}</span>
                                </div>

                                {/* Native balance */}
                                {nativeBalance && (
                                    <div className="flex items-center justify-between border-t border-base-300 dark:border-dark-200 pt-2">
                                        <span className="font-semibold text-gray-600 dark:text-gray-400">Native Balance</span>
                                        <span className="font-bold text-gray-900 dark:text-gray-100">
                                            {nativeBalance} {nativeSymbol}
                                        </span>
                                    </div>
                                )}

                                {/* ERC-20 balances */}
                                {tokens && (
                                    <div className="border-t border-base-300 dark:border-dark-200 pt-2 space-y-1">
                                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Token Balances</div>
                                        {usdcBalance !== null && (
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500">USDC</span>
                                                <span className="font-mono">${usdcBalance}</span>
                                            </div>
                                        )}
                                        {usdtBalance !== null && (
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500">USDT</span>
                                                <span className="font-mono">${usdtBalance}</span>
                                            </div>
                                        )}
                                        {wethBalance !== null && (
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500">WETH</span>
                                                <span className="font-mono">{wethBalance} WETH</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* SIWE — verify wallet ownership */}
                            <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-primary/30 bg-primary/5">
                                <div>
                                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        Verify Ownership (SIWE)
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Sign a message to prove you control this address.
                                    </div>
                                </div>
                                {siweStatus === 'verified' ? (
                                    <div className="flex items-center gap-1 text-success text-sm font-semibold">
                                        <CheckCircle className="h-4 w-4" />
                                        Verified
                                    </div>
                                ) : (
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={siweSignIn}
                                        disabled={['fetching-nonce', 'signing', 'verifying'].includes(siweStatus)}
                                    >
                                        {siweStatus === 'signing' ? 'Signing…' :
                                         siweStatus === 'verifying' ? 'Verifying…' :
                                         'Sign & Verify'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                        Auth provider: <span className="font-semibold text-gray-800 dark:text-gray-100">{user?.authProvider || 'local'}</span>
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

            {/* Billing / Subscription Plan Card */}
            <div className="glass-card rounded-2xl bg-white p-6 shadow-lg dark:bg-dark-200">
                <div className="mb-4 flex items-center gap-3">
                    <div className="h-6 w-6 text-primary flex items-center justify-center text-lg font-bold">💳</div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Subscription & Billing</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Manage your premium membership plan, invoices, and billing cycle.
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border border-base-200 dark:border-slate-800 bg-base-100/50 p-4 rounded-xl gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-500">Active Tier:</span>
                            <span className="badge badge-primary font-bold text-xs uppercase px-2.5 py-1">
                                {user?.planName || 'FREE'}
                            </span>
                        </div>
                        {user?.subscriptionPeriodEnd && user?.planId !== 'free' && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Renewal date: {new Date(user.subscriptionPeriodEnd * 1000).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2.5">
                        {user?.planId && user?.planId !== 'free' ? (
                            <button
                                className="btn btn-primary btn-sm btn-outline font-semibold"
                                onClick={async () => {
                                    try {
                                        const response = await billingAPI.portal({ returnUrl: window.location.href });
                                        if (response.data?.url) {
                                            window.location.href = response.data.url;
                                        } else {
                                            toast.error("Failed to open billing portal.");
                                        }
                                    } catch (err) {
                                        toast.error("Error opening billing portal.");
                                    }
                                }}
                            >
                                Manage Subscription
                            </button>
                        ) : (
                            <a href="/pricing" className="btn btn-primary btn-sm font-semibold">
                                View Pricing & Upgrade
                            </a>
                        )}
                    </div>
                </div>
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
