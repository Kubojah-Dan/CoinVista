import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BellRing, BrainCircuit, ChartNoAxesCombined, CircleDollarSign, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "../components/common/Button";
import cryptoOrbit from "../assets/crypto-orbit.png";

const features = [
    { icon: ChartNoAxesCombined, title: "Live market pulse", description: "Watch price movement, discover momentum, and compare assets without tab hopping." },
    { icon: BellRing, title: "Alerts that stay on", description: "Create server-side price alerts that keep working while you are away." },
    { icon: BrainCircuit, title: "Research with context", description: "Bring forecasts, sentiment, and anomaly signals into one clear decision surface." },
    { icon: ShieldCheck, title: "Built with guardrails", description: "Secure sessions, privacy controls, and a simulator-first experience by design." },
];

const floatingTokens = [
    { name: "BTC", price: "$68,421", change: "+2.84%", className: "crypto-token--btc" },
    { name: "ETH", price: "$3,584", change: "+1.62%", className: "crypto-token--eth" },
    { name: "SOL", price: "$184.20", change: "+4.17%", className: "crypto-token--sol" },
];

const Home = () => (
    <main className="landing-page overflow-hidden bg-[#070b19] text-white">
        <section className="relative isolate overflow-hidden">
            <div className="landing-grid absolute inset-0 -z-10 opacity-50" />
            <div className="absolute -left-40 top-0 -z-10 h-[32rem] w-[32rem] rounded-full bg-blue-600/20 blur-[120px]" />
            <div className="absolute right-0 top-16 -z-10 h-[28rem] w-[28rem] rounded-full bg-violet-600/20 blur-[120px]" />
            <div className="container mx-auto grid min-h-[calc(100vh-4rem)] items-center gap-10 px-6 py-16 lg:grid-cols-[1.02fr_.98fr] lg:py-20">
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }} className="relative z-10 max-w-2xl">
                    <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-4 py-2 text-sm font-medium text-blue-100 shadow-[0_0_30px_rgba(59,130,246,.12)]"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" /></span>Intelligence for the always-on market</div>
                    <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">See the market.<br /><span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">Move with clarity.</span></h1>
                    <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">CoinVista is your command center for live markets, portfolio intelligence, paper trading, and signals that make crypto feel less noisy.</p>
                    <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link to="/signup"><Button className="group w-full rounded-xl bg-white px-6 py-3.5 text-base font-bold text-slate-950 hover:bg-cyan-100 sm:w-auto">Start exploring <ArrowRight className="ml-2 inline h-4 w-4 transition-transform group-hover:translate-x-1" /></Button></Link><Link to="/login"><Button variant="outline" className="w-full rounded-xl border-white/15 bg-white/[0.04] px-6 py-3.5 text-base text-white hover:bg-white/10 sm:w-auto">View the workspace</Button></Link></div>
                    <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-400"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Simulator-first trading</span><span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300" /> Insights in one view</span></div>
                </motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }} className="relative mx-auto w-full max-w-[580px] lg:translate-x-8">
                    <div className="absolute inset-[12%] rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="crypto-art-frame relative aspect-[.72] overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950/60 shadow-[0_30px_90px_rgba(0,0,0,.55)]"><img src={cryptoOrbit} alt="Floating Bitcoin, Ethereum, Solana and candlestick artwork" className="h-full w-full object-cover object-center opacity-95" /><div className="absolute inset-0 bg-gradient-to-t from-[#070b19]/65 via-transparent to-blue-900/10" /><div className="absolute left-5 top-5 rounded-xl border border-white/15 bg-slate-950/65 px-3 py-2 backdrop-blur-xl"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400">Market status</p><p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-white"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live and moving</p></div></div>
                    {floatingTokens.map((token, index) => <motion.div key={token.name} animate={{ y: [0, -10, 0] }} transition={{ duration: 4 + index, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }} className={`crypto-token ${token.className}`}><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-black text-white">{token.name[0]}</div><div><p className="text-xs font-bold text-white">{token.name}</p><p className="text-[11px] text-slate-400">{token.price}</p></div></div><span className="text-xs font-bold text-emerald-300">{token.change}</span></motion.div>)}
                </motion.div>
            </div>
        </section>
        <section className="relative border-y border-white/[0.08] bg-white/[0.025] py-24"><div className="container mx-auto px-6"><div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-cyan-300">One focused workspace</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A sharper way to navigate crypto.</h2></div><p className="max-w-md text-slate-400">From a first watchlist to a practiced strategy, each tool is designed to help you build conviction—not FOMO.</p></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{features.map((feature, index) => <motion.article key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} className="rounded-2xl border border-white/[0.09] bg-slate-900/50 p-6 transition hover:-translate-y-1 hover:border-blue-300/30 hover:bg-slate-900"><feature.icon className="h-6 w-6 text-cyan-300" /><h3 className="mt-8 text-lg font-bold">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{feature.description}</p></motion.article>)}</div></div></section>
        <section className="container mx-auto px-6 py-24 text-center"><div className="relative overflow-hidden rounded-[2rem] border border-blue-300/20 bg-gradient-to-br from-blue-600/20 via-slate-900 to-violet-600/20 px-6 py-16"><CircleDollarSign className="mx-auto h-10 w-10 text-cyan-300" /><h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">Your next market decision can be a calmer one.</h2><p className="mx-auto mt-5 max-w-xl text-slate-300">Start with live data, practice without risk, and make every insight easier to act on.</p><Link to="/signup" className="mt-8 inline-block"><Button className="rounded-xl bg-white px-7 py-3.5 font-bold text-slate-950 hover:bg-cyan-100">Create your free account</Button></Link></div></section>
    </main>
);

export default Home;
