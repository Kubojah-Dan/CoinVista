import React, { useState } from 'react';
import { Check, Shield, HelpCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { billingAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const Pricing = () => {
    const { user } = useAuth();
    const [isAnnual, setIsAnnual] = useState(false);
    const [loadingPlan, setLoadingPlan] = useState(null);
    const [loadingPortal, setLoadingPortal] = useState(false);

    const plans = [
        {
            id: 'free',
            name: 'FREE',
            monthlyPrice: 0,
            annualPrice: 0,
            description: 'Essential crypto intelligence and core trading tools.',
            features: [
                '10 AI assistant queries per week',
                '3 paper strategy backtests per week',
                'Standard charting & indicators',
                'Standard community support',
            ],
            color: 'border-slate-200 dark:border-slate-800',
            buttonText: 'Current Plan',
        },
        {
            id: 'trader',
            name: 'TRADER',
            monthlyPrice: 19,
            annualPrice: 190,
            description: 'Advanced insights and alerts for active retail traders.',
            features: [
                '100 AI assistant queries per week',
                '20 paper strategy backtests per week',
                'Real-time whale wallet alerts',
                'Custom watchlist indicators',
                'Priority email support',
            ],
            color: 'border-blue-500 dark:border-blue-400 border-2 shadow-blue-500/10',
            buttonText: 'Upgrade to Trader',
            badge: 'Popular',
        },
        {
            id: 'pro',
            name: 'PRO',
            monthlyPrice: 49,
            annualPrice: 490,
            description: 'Full automated execution, backtests and intelligence.',
            features: [
                'Unlimited AI assistant queries',
                '100 paper strategy backtests per week',
                'Live on-chain whale indices',
                'Social leaderboard copy trading',
                'Multi-channel alerts (Email & WhatsApp)',
                'Priority chat support',
            ],
            color: 'border-purple-500 dark:border-purple-400 border-2 shadow-purple-500/10',
            buttonText: 'Upgrade to Pro',
        },
        {
            id: 'elite',
            name: 'ELITE',
            monthlyPrice: 99,
            annualPrice: 990,
            description: 'Custom setups and dedicated API access for quant desks.',
            features: [
                'Unlimited AI assistant queries',
                'Unlimited strategy backtests',
                'Live trading integrations',
                'Custom alerting webhooks',
                'Dedicated account manager',
                'Custom AI agent fine-tuning',
            ],
            color: 'border-yellow-500 dark:border-yellow-400 border-2 shadow-yellow-500/10',
            buttonText: 'Upgrade to Elite',
        },
    ];

    const handleSubscribe = async (planId) => {
        if (!user) {
            toast.error('Please log in first to subscribe.');
            return;
        }

        if (planId === 'free' || user.planId === planId) {
            return;
        }

        setLoadingPlan(planId);
        try {
            const successUrl = `${window.location.origin}/settings?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`;
            const cancelUrl = `${window.location.origin}/settings?cancelled=true`;
            
            const response = await billingAPI.checkout({
                planId,
                annual: isAnnual,
                successUrl,
                cancelUrl,
            });

            if (response.data?.url) {
                window.location.href = response.data.url;
            } else {
                toast.error('Failed to create checkout session.');
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error redirecting to Stripe.');
        } finally {
            setLoadingPlan(null);
        }
    };

    const handlePortalRedirect = async () => {
        setLoadingPortal(true);
        try {
            const returnUrl = `${window.location.origin}/settings`;
            const response = await billingAPI.portal({ returnUrl });
            if (response.data?.url) {
                window.location.href = response.data.url;
            } else {
                toast.error('Failed to open billing portal.');
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error opening Stripe customer portal.');
        } finally {
            setLoadingPortal(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-12 max-w-7xl">
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-primary text-transparent bg-clip-text">
                    CoinVista Premium Plans
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
                    Level up your trading edge with real-time on-chain analytics, automated copy trading, and an AI intelligence assistant.
                </p>

                {/* Annual Toggle */}
                <div className="flex items-center justify-center mt-8 gap-4">
                    <span className={`text-sm font-semibold ${!isAnnual ? 'text-primary' : 'text-gray-500'}`}>Monthly Billing</span>
                    <input 
                        type="checkbox" 
                        className="toggle toggle-primary toggle-lg animate-pulse" 
                        checked={isAnnual}
                        onChange={() => setIsAnnual(!isAnnual)}
                        aria-label="Toggle annual billing"
                    />
                    <span className={`text-sm font-semibold flex items-center gap-1.5 ${isAnnual ? 'text-primary' : 'text-gray-500'}`}>
                        Annual Billing
                        <span className="badge badge-success text-white font-bold text-xs uppercase py-1">Save 20%</span>
                    </span>
                </div>
            </div>

            {/* Portal Banner */}
            {user && user.planId && user.planId !== 'free' && (
                <div className="glass-card border border-primary/20 bg-primary/5 p-6 rounded-2xl mb-12 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h4 className="font-bold text-lg text-primary flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Active Subscription: {user.planName}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Your billing cycle is managed securely through Stripe. Access your customer portal to edit payment details or cancel your plan.
                        </p>
                    </div>
                    <button
                        onClick={handlePortalRedirect}
                        disabled={loadingPortal}
                        className="btn btn-primary btn-outline"
                    >
                        {loadingPortal ? 'Opening Portal...' : 'Manage Billing & Invoices'}
                        <ArrowRight className="h-4 w-4 ml-1" />
                    </button>
                </div>
            )}

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {plans.map((plan) => {
                    const isCurrent = user ? (user.planId === plan.id || (!user.planId && plan.id === 'free')) : (plan.id === 'free');
                    const isDowngrade = user && plan.id === 'free' && user.planId !== 'free';

                    return (
                        <div
                            key={plan.id}
                            className={`card bg-base-100 border relative flex flex-col justify-between p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] ${plan.color}`}
                        >
                            {plan.badge && (
                                <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 badge badge-primary text-white font-bold text-xs uppercase px-3 py-1.5">
                                    {plan.badge}
                                </span>
                            )}

                            <div>
                                <h3 className="text-xl font-extrabold tracking-tight mb-2">{plan.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 h-10 mb-4">{plan.description}</p>
                                
                                <div className="flex items-baseline mb-6">
                                    <span className="text-4xl font-extrabold">
                                        ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400 ml-1 text-sm font-semibold">
                                        /{isAnnual ? 'yr' : 'mo'}
                                    </span>
                                </div>

                                <div className="divider my-4"></div>

                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                                            <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={isCurrent || isDowngrade || loadingPlan === plan.id}
                                className={`btn w-full mt-auto rounded-xl ${
                                    isCurrent
                                        ? 'btn-disabled bg-neutral-100 dark:bg-neutral-900 text-neutral-400'
                                        : 'btn-primary'
                                }`}
                            >
                                {loadingPlan === plan.id ? (
                                    <span className="loading loading-spinner loading-sm"></span>
                                ) : isCurrent ? (
                                    'Current Plan'
                                ) : isDowngrade ? (
                                    'Standard Tier'
                                ) : (
                                    plan.buttonText
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Footer FAQ link */}
            <div className="mt-16 text-center max-w-md mx-auto text-xs text-gray-500 dark:text-gray-400">
                <p className="flex items-center justify-center gap-1">
                    <HelpCircle className="h-4 w-4" />
                    All payments are processed securely by Stripe. Cancel anytime.
                </p>
            </div>
        </div>
    );
};

export default Pricing;
