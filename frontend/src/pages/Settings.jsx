import { useState } from 'react';
import { Copy, ShieldCheck, Trash2, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

    return (
        <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Security & Privacy Settings</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Manage privacy mode, simulator-safe sessions, authenticator-based 2FA, and wallet metadata.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                            <code className="break-all">{user.walletAddress}</code>
                        ) : (
                            <p>No wallet linked yet. Use the dashboard wallet action to connect MetaMask.</p>
                        )}
                    </div>

                    <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        Auth provider: <span className="font-semibold text-gray-800 dark:text-gray-100">{user?.authProvider || 'local'}</span>
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
