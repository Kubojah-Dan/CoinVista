import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Home, ShieldCheck, Sparkles } from 'lucide-react';
import { FaFacebookF, FaGithub, FaGoogle } from 'react-icons/fa';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import './AuthPage.css';

const SWITCH_DELAY_MS = 260;

const socialButtons = [
    { label: 'Google', provider: 'google', icon: FaGoogle },
    { label: 'GitHub', provider: 'github', icon: FaGithub },
    { label: 'Facebook', provider: 'facebook', icon: FaFacebookF },
];

const AuthPage = () => {
    const {
        user,
        login,
        register,
        loading,
        bootstrapSession,
        twoFactorPendingUser,
        clearTwoFactorPendingUser,
    } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const switchTimeoutRef = useRef(null);

    const isRegisterRoute = location.pathname === '/signup' || location.pathname === '/register';
    const [isRegisterView, setIsRegisterView] = useState(isRegisterRoute);
    const [loginSubmitting, setLoginSubmitting] = useState(false);
    const [registerSubmitting, setRegisterSubmitting] = useState(false);
    const [loginForm, setLoginForm] = useState({ email: '', password: '', totpCode: '' });
    const [registerForm, setRegisterForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    useEffect(() => {
        setIsRegisterView(isRegisterRoute);
    }, [isRegisterRoute]);

    useEffect(() => {
        if (!loading && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [loading, navigate, user]);

    useEffect(() => {
        return () => {
            if (switchTimeoutRef.current) {
                clearTimeout(switchTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const oauthStatus = params.get('oauth');
        const provider = params.get('provider');
        const message = params.get('message');

        if (oauthStatus === 'success') {
            bootstrapSession().then((sessionUser) => {
                if (sessionUser) {
                    toast.success(`Signed in with ${provider || 'social login'}`);
                    window.location.href = '/dashboard';
                }
            });
        }

        if (oauthStatus === 'error') {
            toast.error(message || `Unable to sign in with ${provider || 'social login'}`);
        }
    }, [bootstrapSession, location.search, navigate]);

    const queueRouteChange = (nextMode) => {
        const nextPath = nextMode === 'register' ? '/signup' : '/login';
        setIsRegisterView(nextMode === 'register');

        if (location.pathname === nextPath) {
            return;
        }

        if (switchTimeoutRef.current) {
            clearTimeout(switchTimeoutRef.current);
        }

        switchTimeoutRef.current = window.setTimeout(() => {
            navigate(nextPath);
        }, SWITCH_DELAY_MS);
    };

    const handleLoginChange = (event) => {
        const { name, value } = event.target;
        setLoginForm((current) => ({ ...current, [name]: value }));
    };

    const handleRegisterChange = (event) => {
        const { name, value } = event.target;
        setRegisterForm((current) => ({ ...current, [name]: value }));
    };

    const handleLoginSubmit = async (event) => {
        event.preventDefault();
        setLoginSubmitting(true);

        try {
            const result = await login(loginForm);
            if (result.success) {
                navigate('/dashboard');
            }
        } finally {
            setLoginSubmitting(false);
        }
    };

    const handleRegisterSubmit = async (event) => {
        event.preventDefault();

        if (registerForm.password !== registerForm.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setRegisterSubmitting(true);

        try {
            const result = await register({
                name: registerForm.name,
                email: registerForm.email,
                password: registerForm.password,
            });

            if (result.success) {
                navigate('/dashboard');
            }
        } finally {
            setRegisterSubmitting(false);
        }
    };

    const handleSocialClick = (provider) => {
        window.location.href = authAPI.oauthUrl(provider);
    };

    const showTotpField = Boolean(twoFactorPendingUser);

    return (
        <section className="auth-screen">
            <div className={`auth-shell ${isRegisterView ? 'panel-active' : ''}`} id="authWrapper">
                <div className="auth-topbar">
                    <div className="auth-tools">
                        <ThemeToggle />
                        <Link to="/" className="auth-home-link">
                            <Home className="h-4 w-4" />
                            <span>Back Home</span>
                        </Link>
                    </div>
                </div>

                <div className="auth-form-box register-form-box">
                    <div className="auth-card">
                        <div className="auth-eyebrow">Create Account</div>
                        <h1>Turn market noise into a research workflow.</h1>
                        <span className="auth-support-copy">Create a CoinVista account to track holdings, alerts, and simulator performance.</span>

                        <div className="auth-social-row">
                            {socialButtons.map(({ label, provider, icon: Icon }) => (
                                <button
                                    key={label}
                                    type="button"
                                    className="auth-social-button"
                                    aria-label={label}
                                    onClick={() => handleSocialClick(provider)}
                                >
                                    <Icon />
                                </button>
                            ))}
                        </div>

                        <form className="auth-form" onSubmit={handleRegisterSubmit}>
                            <div className="auth-field">
                                <label htmlFor="register-name">Full Name</label>
                                <input
                                    id="register-name"
                                    type="text"
                                    name="name"
                                    placeholder="Enter your full name"
                                    value={registerForm.name}
                                    onChange={handleRegisterChange}
                                    required
                                />
                            </div>

                            <div className="auth-field">
                                <label htmlFor="register-email">Email Address</label>
                                <input
                                    id="register-email"
                                    type="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    value={registerForm.email}
                                    onChange={handleRegisterChange}
                                    required
                                />
                            </div>

                            <div className="auth-field">
                                <label htmlFor="register-password">Password</label>
                                <input
                                    id="register-password"
                                    type="password"
                                    name="password"
                                    placeholder="Create a secure password"
                                    value={registerForm.password}
                                    onChange={handleRegisterChange}
                                    required
                                />
                            </div>

                            <div className="auth-field">
                                <label htmlFor="register-confirm-password">Confirm Password</label>
                                <input
                                    id="register-confirm-password"
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="Repeat your password"
                                    value={registerForm.confirmPassword}
                                    onChange={handleRegisterChange}
                                    required
                                />
                            </div>

                            <button type="submit" className="auth-submit" disabled={registerSubmitting}>
                                {registerSubmitting ? 'Creating Account...' : 'Sign Up'}
                            </button>
                        </form>

                        <div className="mobile-switch">
                            <p>Already have an account?</p>
                            <button type="button" onClick={() => queueRouteChange('login')}>
                                Sign In
                            </button>
                        </div>
                    </div>
                </div>

                <div className="auth-form-box login-form-box">
                    <div className="auth-card">
                        <div className="auth-eyebrow">Welcome Back</div>
                        <h1>Reopen your crypto command center.</h1>
                        <span className="auth-support-copy">Sign in to continue with portfolio analytics, paper trading, and live alerts.</span>

                        <div className="auth-social-row">
                            {socialButtons.map(({ label, provider, icon: Icon }) => (
                                <button
                                    key={label}
                                    type="button"
                                    className="auth-social-button"
                                    aria-label={label}
                                    onClick={() => handleSocialClick(provider)}
                                >
                                    <Icon />
                                </button>
                            ))}
                        </div>

                        <form className="auth-form" onSubmit={handleLoginSubmit}>
                            <div className="auth-field">
                                <label htmlFor="login-email">Email Address</label>
                                <input
                                    id="login-email"
                                    type="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    value={loginForm.email}
                                    onChange={handleLoginChange}
                                    required
                                />
                            </div>

                            <div className="auth-field">
                                <label htmlFor="login-password">Password</label>
                                <input
                                    id="login-password"
                                    type="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    value={loginForm.password}
                                    onChange={handleLoginChange}
                                    required
                                />
                            </div>

                            {showTotpField && (
                                <div className="auth-field">
                                    <label htmlFor="login-totp">Authenticator Code</label>
                                    <input
                                        id="login-totp"
                                        type="text"
                                        name="totpCode"
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="123456"
                                        value={loginForm.totpCode}
                                        onChange={handleLoginChange}
                                        required
                                    />
                                </div>
                            )}

                            {showTotpField && (
                                <button
                                    type="button"
                                    className="auth-inline-link"
                                    onClick={() => {
                                        clearTwoFactorPendingUser();
                                        setLoginForm((current) => ({ ...current, totpCode: '' }));
                                    }}
                                >
                                    Use a different account
                                </button>
                            )}

                            <button
                                type="button"
                                className="auth-inline-link"
                                onClick={() => toast('Password recovery is not configured yet.')}
                            >
                                Forgot your password?
                            </button>

                            <button type="submit" className="auth-submit" disabled={loginSubmitting}>
                                {loginSubmitting ? 'Signing In...' : showTotpField ? 'Verify & Sign In' : 'Sign In'}
                            </button>
                        </form>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-sm text-slate-200">
                            <div className="mb-2 flex items-center gap-2 font-semibold text-white">
                                <ShieldCheck className="h-4 w-4" />
                                Secure Session Flow
                            </div>
                            <p className="opacity-80">
                                CoinVista now uses short-lived access tokens, refresh cookies, and optional authenticator-based 2FA.
                            </p>
                        </div>

                        <div className="mobile-switch">
                            <p>Don&apos;t have an account?</p>
                            <button type="button" onClick={() => queueRouteChange('register')}>
                                Sign Up
                            </button>
                        </div>
                    </div>
                </div>

                <div className="slide-panel-wrapper">
                    <div className="slide-panel">
                        <div className="panel-content panel-content-left">
                            <div className="panel-copy">
                                <div className="panel-badge">
                                    <Sparkles className="h-4 w-4" />
                                    Sign In
                                </div>
                                <h1>Rejoin the market floor with your data intact.</h1>
                                <p>
                                    Log in to reopen your dashboard, restore your paper trades, and keep your research,
                                    watchlists, alerts, and portfolio analytics synchronized.
                                </p>
                                <button className="transparent-btn" type="button" onClick={() => queueRouteChange('login')}>
                                    Sign In
                                </button>
                            </div>
                        </div>

                        <div className="panel-content panel-content-right">
                            <div className="panel-copy">
                                <div className="panel-badge">
                                    <Sparkles className="h-4 w-4" />
                                    Sign Up
                                </div>
                                <h1>Build a recruiter-ready crypto intelligence workspace.</h1>
                                <p>
                                    Create an account to track live holdings, run paper-trading scenarios, and explore
                                    AI-flavored market signals from one polished interface.
                                </p>
                                <button className="transparent-btn" type="button" onClick={() => queueRouteChange('register')}>
                                    Sign Up
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AuthPage;
