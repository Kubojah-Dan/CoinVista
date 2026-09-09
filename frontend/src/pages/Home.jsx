import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Brain, PieChart, Shield, TrendingUp } from "lucide-react";
import { Button } from "../components/common/Button";
import cryptoOrbit from "../assets/crypto-orbit.png";

const Home = () => {
    const features = [
        { icon: TrendingUp, title: "Live Market Monitoring", description: "Track leading cryptocurrencies with real-time data, comparison charts, and alert-ready market views." },
        { icon: Bell, title: "Background Alerts", description: "Run server-side alerts that keep checking prices even when you are offline." },
        { icon: PieChart, title: "Portfolio Intelligence", description: "Measure allocation, PnL, diversification, and export-ready portfolio reports from one workspace." },
        { icon: Brain, title: "AI-Flavored Signals", description: "Explore baseline forecasting, anomaly detection, and headline sentiment designed for recruiter demos." },
        { icon: Shield, title: "Secure by Design", description: "Refresh-token sessions, optional 2FA, privacy mode, and social login plumbing make the app feel production-aware." },
    ];

    return (
        <div className="relative min-h-screen overflow-hidden bg-cover bg-fixed bg-center bg-no-repeat transition-all duration-700" style={{ backgroundImage: `linear-gradient(var(--home-overlay), var(--home-overlay)), var(--home-bg-image)` }}>
            {/* Decorative cryptocurrency art: intentionally subtle so the existing design remains unchanged. */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
                <motion.img src={cryptoOrbit} alt="" animate={{ y: [0, -18, 0], rotate: [-4, 2, -4] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} className="crypto-side-art crypto-side-art--left" />
                <motion.img src={cryptoOrbit} alt="" animate={{ y: [0, 22, 0], rotate: [5, -2, 5] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} className="crypto-side-art crypto-side-art--right" />
            </div>

            {/* Hero Section */}
            <section className="container relative z-10 mx-auto px-6 py-20 text-center">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                    <h1 className="mb-6 text-5xl font-bold text-gray-900 dark:text-gray-100 md:text-7xl">Research Crypto<br /><span className="gradient-text">Like a Product Team</span></h1>
                    <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-700 dark:text-gray-400">CoinVista is a full-stack crypto intelligence workspace that combines live markets, portfolio analytics, paper trading, alert automation, and machine-learning-inspired insight panels in one polished project.</p>
                    <div className="flex items-center justify-center gap-4"><Link to="/signup"><Button className="px-8 py-4 text-lg">Start Tracking Free</Button></Link><Link to="/login"><Button variant="outline" className="bg-white/10 px-8 py-4 text-lg backdrop-blur-md dark:bg-dark-100/10">View Demo</Button></Link></div>
                </motion.div>
            </section>

            {/* Features Grid */}
            <section className="container relative z-10 mx-auto px-6 py-20"><div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">{features.map((feature, index) => <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: index * 0.1 }} className="glass-card rounded-2xl border border-white/20 bg-white/50 p-6 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-white/5 dark:bg-dark-200/50"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary"><feature.icon className="h-6 w-6 text-white" /></div><h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">{feature.title}</h3><p className="text-gray-600 dark:text-gray-400">{feature.description}</p></motion.div>)}</div></section>

            {/* CTA Section */}
            <section className="container relative z-10 mx-auto px-6 py-20 text-center"><motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="glass-card mx-auto max-w-3xl rounded-3xl bg-white/40 p-12 backdrop-blur-2xl dark:bg-dark-200/40"><h2 className="mb-4 text-4xl font-bold text-gray-900 dark:text-gray-100">Ready to Ship a Stronger Portfolio Project?</h2><p className="mb-8 text-xl text-gray-600 dark:text-gray-400">Build watchlists, simulator trades, secure sessions, and recruiter-friendly analytics from day one.</p><Link to="/signup"><Button className="px-8 py-4 text-lg">Create Free Account</Button></Link></motion.div></section>

            {/* Footer */}
            <footer className="relative z-10 mt-20 w-full border-t border-white/20 bg-white/30 py-12 backdrop-blur-xl dark:border-white/5 dark:bg-black/25"><div className="container mx-auto grid grid-cols-1 gap-8 px-6 md:grid-cols-4"><div className="space-y-4"><div className="flex items-center space-x-2 bg-gradient-primary bg-clip-text text-xl font-bold text-transparent"><span className="font-extrabold text-gray-900 dark:text-white">CoinVista</span></div><p className="font-sans text-sm leading-relaxed text-gray-600 dark:text-gray-400">A premium full-stack crypto intelligence workspace combining real-time analytics, paper trading, and AI quant feedback.</p></div><div><h4 className="mb-4 font-sans text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">Core Platform</h4><ul className="space-y-2 font-sans text-sm text-gray-600 dark:text-gray-400"><li><Link to="/markets" className="transition-colors hover:text-primary">Market Analytics</Link></li><li><Link to="/simulator" className="transition-colors hover:text-primary">Paper Trading</Link></li><li><Link to="/strategy-builder" className="transition-colors hover:text-primary">Strategy Builder</Link></li><li><Link to="/pricing" className="transition-colors hover:text-primary">Premium Plans</Link></li></ul></div><div><h4 className="mb-4 font-sans text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">Integrations</h4><ul className="space-y-2 font-sans text-sm text-gray-600 dark:text-gray-400"><li><span className="text-gray-500">RainbowKit & Wagmi v2</span></li><li><span className="text-gray-500">Stripe Billing Portal</span></li><li><span className="text-gray-500">Groq AI Llama 3.3 70B</span></li><li><span className="text-gray-500">Zoho Catalyst AppSail</span></li></ul></div><div><h4 className="mb-4 font-sans text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">Compliance</h4><p className="mb-4 font-sans text-xs leading-relaxed text-gray-500 dark:text-gray-400">All trading features are simulated. Live trading requires completing safety challenges. AES-256-GCM encryption is used for credentials.</p><div className="flex gap-4 font-sans text-xs text-gray-500"><span className="cursor-pointer hover:underline">Privacy Policy</span><span>•</span><span className="cursor-pointer hover:underline">Terms of Service</span></div></div></div><div className="container mx-auto mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 px-6 pt-6 font-sans text-xs text-gray-500 dark:border-white/5 md:flex-row"><p>© {new Date().getFullYear()} CoinVista. All rights reserved.</p><p className="flex items-center gap-1">Made with 💜 for recruiters and builders.</p></div></footer>
        </div>
    );
};

export default Home;
