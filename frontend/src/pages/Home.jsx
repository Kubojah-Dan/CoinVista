import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Brain, PieChart, Shield, TrendingUp } from "lucide-react";
import { Button } from "../components/common/Button";

const Home = () => {
    const features = [
        {
            icon: TrendingUp,
            title: "Live Market Monitoring",
            description: "Track leading cryptocurrencies with real-time data, comparison charts, and alert-ready market views.",
        },
        {
            icon: Bell,
            title: "Background Alerts",
            description: "Run server-side alerts that keep checking prices even when you are offline.",
        },
        {
            icon: PieChart,
            title: "Portfolio Intelligence",
            description: "Measure allocation, PnL, diversification, and export-ready portfolio reports from one workspace.",
        },
        {
            icon: Brain,
            title: "AI-Flavored Signals",
            description: "Explore baseline forecasting, anomaly detection, and headline sentiment designed for recruiter demos.",
        },
        {
            icon: Shield,
            title: "Secure by Design",
            description: "Refresh-token sessions, optional 2FA, privacy mode, and social login plumbing make the app feel production-aware.",
        },
    ];

    return (
        <div
            className="min-h-screen bg-cover bg-fixed bg-center bg-no-repeat transition-all duration-700"
            style={{
                backgroundImage: `linear-gradient(var(--home-overlay), var(--home-overlay)), var(--home-bg-image)`
            }}
        >

            {/* Hero Section */}
            <section className="container mx-auto px-6 py-20 text-center relative z-10">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                        Research Crypto
                        <br />
                        <span className="gradient-text">Like a Product Team</span>
                    </h1>
                    <p className="text-xl text-gray-700 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                        CoinVista is a full-stack crypto intelligence workspace that combines live markets, portfolio analytics,
                        paper trading, alert automation, and machine-learning-inspired insight panels in one polished project.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Link to="/signup">
                            <Button className="text-lg px-8 py-4">Start Tracking Free</Button>
                        </Link>
                        <Link to="/login">
                            <Button variant="outline" className="text-lg px-8 py-4 bg-white/10 dark:bg-dark-100/10 backdrop-blur-md">
                                View Demo
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* Features Grid */}
            <section className="container mx-auto px-6 py-20 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="glass-card p-6 hover:shadow-2xl transition-all hover:-translate-y-1 bg-white/50 dark:bg-dark-200/50 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl"
                        >
                            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">{feature.title}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-6 py-20 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="glass-card p-12 max-w-3xl mx-auto bg-white/40 dark:bg-dark-200/40 backdrop-blur-2xl rounded-3xl"
                >
                    <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                        Ready to Ship a Stronger Portfolio Project?
                    </h2>
                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                        Build watchlists, simulator trades, secure sessions, and recruiter-friendly analytics from day one.
                    </p>
                    <Link to="/signup">
                        <Button className="text-lg px-8 py-4">Create Free Account</Button>
                    </Link>
                </motion.div>
            </section>
            {/* Footer */}
            <footer className="w-full mt-20 border-t border-white/20 dark:border-white/5 bg-white/30 dark:bg-black/25 backdrop-blur-xl py-12 relative z-10">
                <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand Section */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2 text-xl font-bold bg-gradient-primary text-transparent bg-clip-text">
                            <span className="text-gray-900 dark:text-white font-extrabold">CoinVista</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-sans">
                            A premium full-stack crypto intelligence workspace combining real-time analytics, paper trading, and AI quant feedback.
                        </p>
                    </div>

                    {/* Features Links */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4 font-sans">Core Platform</h4>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 font-sans">
                            <li><Link to="/markets" className="hover:text-primary transition-colors">Market Analytics</Link></li>
                            <li><Link to="/simulator" className="hover:text-primary transition-colors">Paper Trading</Link></li>
                            <li><Link to="/strategy-builder" className="hover:text-primary transition-colors">Strategy Builder</Link></li>
                            <li><Link to="/pricing" className="hover:text-primary transition-colors">Premium Plans</Link></li>
                        </ul>
                    </div>

                    {/* Security Links */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4 font-sans">Integrations</h4>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 font-sans">
                            <li><span className="text-gray-500">RainbowKit & Wagmi v2</span></li>
                            <li><span className="text-gray-500">Stripe Billing Portal</span></li>
                            <li><span className="text-gray-500">Groq AI Llama 3.3 70B</span></li>
                            <li><span className="text-gray-500">Zoho Catalyst AppSail</span></li>
                        </ul>
                    </div>

                    {/* Newsletter / Legal */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4 font-sans">Compliance</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 font-sans">
                            All trading features are simulated. Live trading requires completing safety challenges. AES-256-GCM encryption is used for credentials.
                        </p>
                        <div className="flex gap-4 text-xs text-gray-500 font-sans">
                            <span className="hover:underline cursor-pointer">Privacy Policy</span>
                            <span>•</span>
                            <span className="hover:underline cursor-pointer">Terms of Service</span>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-6 mt-12 pt-6 border-t border-white/10 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 font-sans">
                    <p>© {new Date().getFullYear()} CoinVista. All rights reserved.</p>
                    <p className="flex items-center gap-1">
                        Made with 💜 for recruiters and builders.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Home;
