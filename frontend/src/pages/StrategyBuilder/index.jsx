import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Handle,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    Play,
    Save,
    Cpu,
    TrendingUp,
    Trash,
    Plus,
    Activity,
    Coins,
    GitBranch,
    Sliders,
    X,
    ChevronRight,
    Award,
    Sparkles,
    Calendar,
    ListFilter
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import axios from 'axios';
import { strategiesAPI } from '../../services/api';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/format';
import { toast } from 'react-toastify';

const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:8000';

// Custom Nodes Definition
const InputNode = ({ data, isConnectable }) => (
    <div className="bg-white dark:bg-dark-100 border border-info/40 rounded-xl p-3 shadow-md w-48 text-xs space-y-2">
        <div className="font-bold text-info flex items-center gap-1">
            <Coins className="h-3.5 w-3.5" />
            Asset Input
        </div>
        <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-semibold">Coin</label>
            <select
                className="select select-bordered select-xs w-full text-xs font-semibold focus:select-primary"
                value={data.symbol || 'BTCUSDT'}
                onChange={(e) => data.onChangeSymbol(e.target.value)}
            >
                <option value="BTCUSDT">BTC / USDT</option>
                <option value="ETHUSDT">ETH / USDT</option>
                <option value="SOLUSDT">SOL / USDT</option>
                <option value="LINKUSDT">LINK / USDT</option>
            </select>
        </div>
        <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-semibold">Interval</label>
            <select
                className="select select-bordered select-xs w-full text-xs focus:select-primary"
                value={data.interval || '1h'}
                onChange={(e) => data.onChangeInterval(e.target.value)}
            >
                <option value="15m">15m</option>
                <option value="1h">1h</option>
                <option value="4h">4h</option>
                <option value="1d">1d</option>
            </select>
        </div>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
);

const IndicatorNode = ({ data, isConnectable }) => (
    <div className="bg-white dark:bg-dark-100 border border-primary/40 rounded-xl p-3 shadow-md w-48 text-xs space-y-2">
        <div className="font-bold text-primary flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" />
            Indicator Block
        </div>
        <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-semibold">Type</label>
            <select
                className="select select-bordered select-xs w-full text-xs font-semibold focus:select-primary"
                value={data.type || 'EMA_14'}
                onChange={(e) => data.onChangeType(e.target.value)}
            >
                <option value="EMA_14">EMA (14)</option>
                <option value="SMA_20">SMA (20)</option>
                <option value="SMA_50">SMA (50)</option>
                <option value="RSI_14">RSI (14)</option>
            </select>
        </div>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
    </div>
);

const ConditionNode = ({ data, isConnectable }) => (
    <div className="bg-white dark:bg-dark-100 border border-warning/40 rounded-xl p-3 shadow-md w-48 text-xs space-y-2">
        <div className="font-bold text-warning flex items-center gap-1">
            <GitBranch className="h-3.5 w-3.5" />
            Condition Block
        </div>
        <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-semibold">Operator</label>
            <select
                className="select select-bordered select-xs w-full text-xs focus:select-primary"
                value={data.operator || 'crosses_above'}
                onChange={(e) => data.onChangeOperator(e.target.value)}
            >
                <option value="crosses_above">Crosses Above</option>
                <option value="crosses_below">Crosses Below</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
            </select>
        </div>
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
);

const ActionNode = ({ data, isConnectable }) => (
    <div className="bg-white dark:bg-dark-100 border border-success/40 rounded-xl p-3 shadow-md w-48 text-xs space-y-2">
        <div className="font-bold text-success flex items-center gap-1">
            <Play className="h-3.5 w-3.5" />
            Action Trigger
        </div>
        <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-semibold">Action</label>
            <select
                className="select select-bordered select-xs w-full text-xs font-bold text-success focus:select-primary"
                value={data.action || 'buy'}
                onChange={(e) => data.onChangeAction(e.target.value)}
            >
                <option value="buy">BUY LONG</option>
                <option value="sell">SELL SHORT</option>
            </select>
        </div>
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
    </div>
);

const StrategyBuilder = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const [strategyName, setStrategyName] = useState('');
    const [strategyDesc, setStrategyDesc] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [savedStrategies, setSavedStrategies] = useState([]);
    
    const [backtestResults, setBacktestResults] = useState(null);
    const [backtesting, setBacktesting] = useState(false);
    const [saving, setSaving] = useState(false);

    const nodeTypes = useMemo(() => ({
        inputNode: InputNode,
        indicatorNode: IndicatorNode,
        conditionNode: ConditionNode,
        actionNode: ActionNode
    }), []);

    const updateNodeData = (nodeId, key, value) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            [key]: value,
                        },
                    };
                }
                return node;
            })
        );
    };

    // Load default layout on mount
    const loadDefaultLayout = () => {
        setNodes([
            {
                id: 'input-1',
                type: 'inputNode',
                position: { x: 250, y: 30 },
                data: {
                    symbol: 'BTCUSDT',
                    interval: '1h',
                    onChangeSymbol: (val) => updateNodeData('input-1', 'symbol', val),
                    onChangeInterval: (val) => updateNodeData('input-1', 'interval', val),
                },
            },
            {
                id: 'indicator-1',
                type: 'indicatorNode',
                position: { x: 100, y: 180 },
                data: {
                    type: 'EMA_14',
                    onChangeType: (val) => updateNodeData('indicator-1', 'type', val),
                },
            },
            {
                id: 'indicator-2',
                type: 'indicatorNode',
                position: { x: 380, y: 180 },
                data: {
                    type: 'SMA_50',
                    onChangeType: (val) => updateNodeData('indicator-2', 'type', val),
                },
            },
            {
                id: 'condition-1',
                type: 'conditionNode',
                position: { x: 250, y: 320 },
                data: {
                    operator: 'crosses_above',
                    onChangeOperator: (val) => updateNodeData('condition-1', 'operator', val),
                },
            },
            {
                id: 'action-1',
                type: 'actionNode',
                position: { x: 250, y: 450 },
                data: {
                    action: 'buy',
                    onChangeAction: (val) => updateNodeData('action-1', 'action', val),
                },
            }
        ]);

        setEdges([
            { id: 'e-in-ind1', source: 'input-1', target: 'indicator-1', animated: true },
            { id: 'e-in-ind2', source: 'input-1', target: 'indicator-2', animated: true },
            { id: 'e-ind1-cond', source: 'indicator-1', target: 'condition-1', animated: true },
            { id: 'e-ind2-cond', source: 'indicator-2', target: 'condition-1', animated: true },
            { id: 'e-cond-act', source: 'condition-1', target: 'action-1', animated: true },
        ]);
        setStrategyName('EMA Golden Cross');
        setStrategyDesc('Buy when EMA 14 crosses above SMA 50 on 1h BTC timeframe.');
    };

    const loadMyStrategies = async () => {
        try {
            const response = await strategiesAPI.getAll();
            setSavedStrategies(response.data || []);
        } catch (err) {
            console.error('Failed to load strategies', err);
        }
    };

    useEffect(() => {
        loadDefaultLayout();
        loadMyStrategies();
    }, []);

    const handleRunBacktest = async () => {
        setBacktesting(true);
        setBacktestResults(null);
        
        // Compile rules from nodes
        const inputNode = nodes.find(n => n.type === 'inputNode');
        const ind1 = nodes.find(n => n.id === 'indicator-1');
        const ind2 = nodes.find(n => n.id === 'indicator-2');
        
        const symbol = inputNode?.data?.symbol || 'BTCUSDT';
        const interval = inputNode?.data?.interval || '1h';
        const buyInd = ind1?.data?.type || 'EMA_14';
        const buyThresh = ind2?.data?.type || 'SMA_50';

        try {
            const response = await axios.post(`${AGENT_URL}/api/agent/backtest`, {
                strategyRules: {
                    buyIndicator: buyInd,
                    buyThresholdIndicator: buyThresh,
                    sellIndicator: 'RSI_14',
                    sellValue: 70.0
                },
                symbol,
                interval
            });
            setBacktestResults(response.data);
            toast.success('Backtest completed successfully!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to complete backtest. Make sure the FastAPI agent is running.');
        } finally {
            setBacktesting(false);
        }
    };

    const handleSaveStrategy = async (e) => {
        e.preventDefault();
        if (!strategyName.trim()) {
            toast.error('Strategy name is required');
            return;
        }
        setSaving(true);
        try {
            // Include dynamic properties inside nodes structure
            await strategiesAPI.create({
                name: strategyName,
                description: strategyDesc,
                strategyJson: JSON.stringify({ nodes, edges }),
                public: isPublic
            });
            toast.success('Strategy saved successfully!');
            loadMyStrategies();
        } catch (err) {
            toast.error('Failed to save strategy');
        } finally {
            setSaving(false);
        }
    };

    const handleLoadStrategy = (strat) => {
        try {
            const parsed = JSON.parse(strat.strategyJson);
            if (parsed.nodes && parsed.edges) {
                // Re-bind callbacks because functions are stripped in JSON serialization
                const boundNodes = parsed.nodes.map(node => {
                    const callbacks = {};
                    if (node.id === 'input-1') {
                        callbacks.onChangeSymbol = (val) => updateNodeData('input-1', 'symbol', val);
                        callbacks.onChangeInterval = (val) => updateNodeData('input-1', 'interval', val);
                    } else if (node.id === 'indicator-1') {
                        callbacks.onChangeType = (val) => updateNodeData('indicator-1', 'type', val);
                    } else if (node.id === 'indicator-2') {
                        callbacks.onChangeType = (val) => updateNodeData('indicator-2', 'type', val);
                    } else if (node.id === 'condition-1') {
                        callbacks.onChangeOperator = (val) => updateNodeData('condition-1', 'operator', val);
                    } else if (node.id === 'action-1') {
                        callbacks.onChangeAction = (val) => updateNodeData('action-1', 'action', val);
                    }
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            ...callbacks
                        }
                    };
                });
                setNodes(boundNodes);
                setEdges(parsed.edges);
                setStrategyName(strat.name);
                setStrategyDesc(strat.description || '');
                setIsPublic(strat.public || false);
                toast.success(`Loaded strategy: ${strat.name}`);
            }
        } catch (err) {
            toast.error('Failed to deserialize strategy');
        }
    };

    const handleDeleteStrategy = async (id, event) => {
        event.stopPropagation();
        if (!window.confirm('Delete this strategy?')) return;
        try {
            await strategiesAPI.delete(id);
            toast.success('Strategy deleted');
            loadMyStrategies();
        } catch (err) {
            toast.error('Failed to delete strategy');
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-base-300 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Sliders className="h-8 w-8 text-primary" />
                        Visual Strategy Builder
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Design conditional logic graphs, run historical backtests, and save automation strategies.
                    </p>
                </div>

                {/* Dropdown selector for saved strategies */}
                <div className="flex items-center gap-2">
                    <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-outline btn-sm gap-2">
                            <ListFilter className="h-4 w-4" />
                            Load Saved Strategy ({savedStrategies.length})
                        </label>
                        <ul tabIndex={0} className="dropdown-content menu p-2 shadow-2xl bg-base-100 border border-base-200 rounded-xl w-64 z-50">
                            {savedStrategies.length === 0 ? (
                                <li className="text-xs text-gray-500 p-3 text-center">No saved strategies found.</li>
                            ) : (
                                savedStrategies.map((strat) => (
                                    <li key={strat.id}>
                                        <div className="flex justify-between items-center text-xs" onClick={() => handleLoadStrategy(strat)}>
                                            <span className="font-semibold truncate max-w-[120px]">{strat.name}</span>
                                            <button
                                                className="btn btn-ghost btn-xs text-error hover:bg-error/20 p-1"
                                                onClick={(e) => handleDeleteStrategy(strat.id, e)}
                                            >
                                                <Trash className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={loadDefaultLayout}>
                        Reset Canvas
                    </button>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visual Canvas Block (Span 2) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="glass-card rounded-2xl bg-base-100 p-4 shadow-lg border border-base-200 flex flex-col h-[520px]">
                        <div className="flex justify-between items-center border-b border-base-200 pb-3 mb-2">
                            <span className="font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Cpu className="h-4 w-4 text-primary" />
                                Interactive Flow Canvas
                            </span>
                            <div className="text-xs text-gray-400">
                                Connect inputs, indicators, logic blocks, and action terminals.
                            </div>
                        </div>

                        {/* React Flow Container */}
                        <div className="flex-1 w-full border border-base-300 rounded-xl overflow-hidden bg-base-200/30">
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                nodeTypes={nodeTypes}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                fitView
                            >
                                <Background color="#ccc" gap={16} size={1} />
                                <Controls />
                                <MiniMap nodeStrokeWidth={3} zoomable pannable />
                            </ReactFlow>
                        </div>
                    </div>

                    {/* Backtest Statistics & Performance Curves */}
                    {backtestResults && (
                        <div className="glass-card rounded-2xl bg-base-100 p-6 shadow-lg border border-base-200 space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Backtest Performance Summary
                            </h2>

                            {/* Performance Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-base-200/50 rounded-xl border border-base-300 text-center">
                                    <div className="text-xs text-gray-500">Total Return</div>
                                    <div className={`text-2xl font-extrabold mt-1 ${backtestResults.totalReturn >= 0 ? 'text-success' : 'text-error'}`}>
                                        {formatPercentage(backtestResults.totalReturn)}
                                    </div>
                                </div>
                                <div className="p-3 bg-base-200/50 rounded-xl border border-base-300 text-center">
                                    <div className="text-xs text-gray-500">Win Rate</div>
                                    <div className="text-2xl font-extrabold text-primary mt-1">
                                        {formatNumber(backtestResults.winRate, 1)}%
                                    </div>
                                </div>
                                <div className="p-3 bg-base-200/50 rounded-xl border border-base-300 text-center">
                                    <div className="text-xs text-gray-500">Sharpe Ratio</div>
                                    <div className="text-2xl font-extrabold mt-1">
                                        {formatNumber(backtestResults.sharpeRatio, 2)}
                                    </div>
                                </div>
                                <div className="p-3 bg-base-200/50 rounded-xl border border-base-300 text-center">
                                    <div className="text-xs text-gray-500">Total Trades</div>
                                    <div className="text-2xl font-extrabold mt-1">
                                        {backtestResults.totalTrades}
                                    </div>
                                </div>
                            </div>

                            {/* Equity Curve Chart */}
                            <div className="h-64 w-full">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Portfolio Equity Curve ($)</span>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={backtestResults.equityCurve} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                                        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="rgba(128,128,128,0.5)" />
                                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} stroke="rgba(128,128,128,0.5)" />
                                        <Tooltip formatter={(value) => [formatCurrency(value), 'Balance']} labelStyle={{ color: 'gray' }} />
                                        <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Backtest Trades Ledger */}
                            <div className="space-y-2">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Execution Logs</span>
                                {backtestResults.trades.length === 0 ? (
                                    <div className="text-xs text-gray-400 p-4 border border-dashed rounded-xl text-center">No trades executed during backtest. Check indicator signals.</div>
                                ) : (
                                    <div className="overflow-x-auto max-h-60 rounded-xl border border-base-300">
                                        <table className="table table-xs w-full bg-base-100">
                                            <thead className="bg-base-200">
                                                <tr>
                                                    <th>Entry Time</th>
                                                    <th>Exit Time</th>
                                                    <th>Entry Price</th>
                                                    <th>Exit Price</th>
                                                    <th>Type</th>
                                                    <th>PnL ($ / %)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {backtestResults.trades.map((t, idx) => (
                                                    <tr key={idx}>
                                                        <td>{t.entryTime}</td>
                                                        <td>{t.exitTime}</td>
                                                        <td>{formatCurrency(t.entryPrice)}</td>
                                                        <td>{formatCurrency(t.exitPrice)}</td>
                                                        <td>
                                                            <span className={`badge badge-xs p-1 font-bold ${
                                                                t.type === 'Stop Loss' ? 'badge-error text-white' :
                                                                t.type === 'Take Profit' ? 'badge-success text-white' :
                                                                'badge-neutral'
                                                            }`}>
                                                                {t.type}
                                                            </span>
                                                        </td>
                                                        <td className={`font-bold ${t.pnl >= 0 ? 'text-success' : 'text-error'}`}>
                                                            {formatCurrency(t.pnl)} ({formatPercentage(t.pnlPercent)})
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right configuration sidebar */}
                <div className="space-y-6">
                    {/* Simulator Action Trigger */}
                    <div className="glass-card rounded-2xl bg-base-100 p-6 shadow-lg border border-base-200 space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Backtest Execution</h2>
                        <p className="text-xs text-gray-500">
                            Evaluate the current node configuration against 500 candlestick intervals using the Pandas backtesting engine.
                        </p>
                        
                        <button
                            className="btn btn-primary btn-sm w-full gap-2"
                            onClick={handleRunBacktest}
                            disabled={backtesting}
                        >
                            <Play className="h-4 w-4" />
                            {backtesting ? 'Running Backtest...' : 'Execute Backtest'}
                        </button>
                    </div>

                    {/* Save Strategy Settings */}
                    <div className="glass-card rounded-2xl bg-base-100 p-6 shadow-lg border border-base-200">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <Save className="h-5 w-5 text-primary" />
                            Save Strategy
                        </h2>
                        
                        <form onSubmit={handleSaveStrategy} className="space-y-4">
                            <label className="form-control">
                                <span className="label-text mb-1 text-xs font-semibold text-gray-500 uppercase">Strategy Name</span>
                                <input
                                    type="text"
                                    placeholder="E.g. EMA Crossover"
                                    value={strategyName}
                                    onChange={(e) => setStrategyName(e.target.value)}
                                    className="input input-bordered input-sm focus:input-primary"
                                    required
                                />
                            </label>

                            <label className="form-control">
                                <span className="label-text mb-1 text-xs font-semibold text-gray-500 uppercase">Description</span>
                                <textarea
                                    placeholder="Explain condition triggers..."
                                    value={strategyDesc}
                                    onChange={(e) => setStrategyDesc(e.target.value)}
                                    className="textarea textarea-bordered h-20 text-xs focus:textarea-primary"
                                />
                            </label>

                            <div className="form-control w-fit">
                                <label className="label cursor-pointer gap-3 justify-start">
                                    <input
                                        type="checkbox"
                                        checked={isPublic}
                                        onChange={(e) => setIsPublic(e.target.checked)}
                                        className="checkbox checkbox-primary checkbox-sm"
                                    />
                                    <span className="label-text text-xs font-semibold text-gray-500 uppercase">Share Publicly</span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-sm w-full"
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save Strategy Configuration'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StrategyBuilder;
