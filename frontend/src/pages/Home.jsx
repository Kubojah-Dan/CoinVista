import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Bell, PieChart, Shield } from "lucide-react";
import { Button } from "../components/common/Button";
// import logoSvg from "../assets/logo.svg"; // Mocking logo for now as it may not exist

const Home = () => {
    const features = [
        {
            icon: TrendingUp,
            title: "Real-time Tracking",
            description: "Monitor your cryptocurrency portfolio with live price updates via WebSockets",
        },
        {
            icon: Bell,
            title: "Price Alerts",
            description: "Set custom price alerts and get notified when your targets are reached",
        },
        {
            icon: PieChart,
            title: "Analytics Dashboard",
            description: "Visualize your portfolio performance with interactive charts and insights",
        },
        {
            icon: Shield,
            title: "Secure & Private",
            description: "Your data is encrypted and secure with JWT authentication",
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
                        Track Your Crypto
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-primary">Portfolio in Real-time</span>
                    </h1>
                    <p className="text-xl text-gray-700 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                        The most advanced cryptocurrency portfolio tracker with live price updates, analytics, and smart alerts.
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                        Ready to Master Your Crypto Portfolio?
                    </h2>
                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                        Join thousands of crypto investors tracking their portfolios with CoinVista
                    </p>
                    <Link to="/signup">
                        <Button className="text-lg px-8 py-4">Create Free Account</Button>
                    </Link>
                </motion.div>
            </section>
        </div>
    );
};

export default Home;
