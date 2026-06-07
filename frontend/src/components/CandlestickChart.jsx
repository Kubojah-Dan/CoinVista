import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';

// Technical indicator calculations in JS for UI overlays
const calculateEMA = (data, period) => {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  let emaVal = data.slice(0, period).reduce((sum, d) => sum + d.close, 0) / period;
  const emaData = [{ time: data[period - 1].time, value: emaVal }];
  for (let i = period; i < data.length; i++) {
    emaVal = data[i].close * k + emaVal * (1 - k);
    emaData.push({ time: data[i].time, value: emaVal });
  }
  return emaData;
};

const calculateBB = (data, period, stdDevMultiplier = 2) => {
  if (data.length < period) return { upper: [], lower: [], basis: [] };
  const upper = [];
  const lower = [];
  const basis = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((s, d) => s + d.close, 0);
    const avg = sum / period;
    const squaredDiffsSum = slice.reduce((s, d) => s + Math.pow(d.close - avg, 2), 0);
    const stdDev = Math.sqrt(squaredDiffsSum / period);
    const time = data[i].time;
    basis.push({ time, value: avg });
    upper.push({ time, value: avg + stdDev * stdDevMultiplier });
    lower.push({ time, value: avg - stdDev * stdDevMultiplier });
  }
  return { upper, lower, basis };
};

const CandlestickChart = ({ ohlcvData = [], coinName = 'Bitcoin', comparisonHistory = [], comparisonName = '' }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const comparisonSeriesRef = useRef(null);

  // Indicators series refs
  const ema20Ref = useRef(null);
  const ema50Ref = useRef(null);
  const ema200Ref = useRef(null);
  const bbUpperRef = useRef(null);
  const bbLowerRef = useRef(null);
  const bbBasisRef = useRef(null);

  // Indicator States
  const [showEMA20, setShowEMA20] = useState(false);
  const [showEMA50, setShowEMA50] = useState(false);
  const [showEMA200, setShowEMA200] = useState(false);
  const [showBB, setShowBB] = useState(false);

  // Format & deduplicate timestamps
  const formattedData = React.useMemo(() => {
    const seenTimes = new Set();
    const result = [];
    ohlcvData.forEach(d => {
      const timeInSec = Math.floor(d.time / 1000);
      if (!seenTimes.has(timeInSec)) {
        seenTimes.add(timeInSec);
        result.push({
          time: timeInSec,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume,
        });
      }
    });
    return result.sort((a, b) => a.time - b.time);
  }, [ohlcvData]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Detect dark mode (default to dark in coinvista)
    const isDark = document.documentElement.classList.contains('dark') || true;

    const initialWidth = chartContainerRef.current.clientWidth;
    const initialHeight = chartContainerRef.current.clientHeight || 300;

    // 1. Create Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: isDark ? '#1a1b23' : '#ffffff' },
        textColor: isDark ? '#d1d4dc' : '#333333',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(42, 46, 57, 0.5)' : 'rgba(240, 240, 240, 0.5)' },
        horzLines: { color: isDark ? 'rgba(42, 46, 57, 0.5)' : 'rgba(240, 240, 240, 0.5)' },
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(197, 203, 206, 0.8)' : 'rgba(230, 230, 230, 0.8)',
      },
      timeScale: {
        borderColor: isDark ? 'rgba(197, 203, 206, 0.8)' : 'rgba(230, 230, 230, 0.8)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1, // Magnet mode
      },
      width: initialWidth,
      height: initialHeight,
    });

    chartRef.current = chart;

    // 2. Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });
    candleSeriesRef.current = candleSeries;

    // 3. Add Volume Series (overlaid at bottom)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: 'rgba(59, 130, 246, 0.3)',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume-scale',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // Render at the bottom 20%
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Set Data
    if (formattedData.length > 0) {
      candleSeries.setData(formattedData);
      
      const volData = formattedData.map(d => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
      }));
      volumeSeries.setData(volData);

      // Auto fit the chart content to stretch across the full width
      chart.timeScale().fitContent();
    }

    // Handle Element Resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.resize(width, height || 300);
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    // Clean up
    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [formattedData]);

  // Handle Indicators visibility and updates
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || formattedData.length === 0) return;

    // 1. EMA 20
    if (showEMA20) {
      if (!ema20Ref.current) {
        ema20Ref.current = chart.addSeries(LineSeries, { color: '#3B82F6', lineWidth: 1.5, title: 'EMA 20' });
      }
      ema20Ref.current.setData(calculateEMA(formattedData, 20));
    } else if (ema20Ref.current) {
      chart.removeSeries(ema20Ref.current);
      ema20Ref.current = null;
    }

    // 2. EMA 50
    if (showEMA50) {
      if (!ema50Ref.current) {
        ema50Ref.current = chart.addSeries(LineSeries, { color: '#F59E0B', lineWidth: 1.5, title: 'EMA 50' });
      }
      ema50Ref.current.setData(calculateEMA(formattedData, 50));
    } else if (ema50Ref.current) {
      chart.removeSeries(ema50Ref.current);
      ema50Ref.current = null;
    }

    // 3. EMA 200
    if (showEMA200) {
      if (!ema200Ref.current) {
        ema200Ref.current = chart.addSeries(LineSeries, { color: '#EC4899', lineWidth: 1.5, title: 'EMA 200' });
      }
      ema200Ref.current.setData(calculateEMA(formattedData, 200));
    } else if (ema200Ref.current) {
      chart.removeSeries(ema200Ref.current);
      ema200Ref.current = null;
    }

    // 4. Bollinger Bands
    if (showBB) {
      if (!bbUpperRef.current) {
        bbUpperRef.current = chart.addSeries(LineSeries, { color: 'rgba(139, 92, 246, 0.6)', lineWidth: 1, lineStyle: 2, title: 'BB Upper' });
        bbBasisRef.current = chart.addSeries(LineSeries, { color: 'rgba(139, 92, 246, 0.4)', lineWidth: 1, title: 'BB Basis' });
        bbLowerRef.current = chart.addSeries(LineSeries, { color: 'rgba(139, 92, 246, 0.6)', lineWidth: 1, lineStyle: 2, title: 'BB Lower' });
      }
      const bb = calculateBB(formattedData, 20);
      bbUpperRef.current.setData(bb.upper);
      bbBasisRef.current.setData(bb.basis);
      bbLowerRef.current.setData(bb.lower);
    } else {
      if (bbUpperRef.current) {
        chart.removeSeries(bbUpperRef.current);
        bbUpperRef.current = null;
      }
      if (bbBasisRef.current) {
        chart.removeSeries(bbBasisRef.current);
        bbBasisRef.current = null;
      }
      if (bbLowerRef.current) {
        chart.removeSeries(bbLowerRef.current);
        bbLowerRef.current = null;
      }
    }
  }, [showEMA20, showEMA50, showEMA200, showBB, formattedData]);

  // Handle Comparison Series
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || formattedData.length === 0) return;

    if (comparisonHistory.length > 0 && comparisonName) {
      if (!comparisonSeriesRef.current) {
        comparisonSeriesRef.current = chart.addSeries(LineSeries, {
          color: '#8B5CF6',
          lineWidth: 1.5,
          lineStyle: 1, // Dashed
          title: comparisonName,
        });
      }

      // Map comparison index to times
      const compData = [];
      const len = Math.min(formattedData.length, comparisonHistory.length);
      // We align comparison backwards from the end (newest)
      const offsetData = formattedData.slice(formattedData.length - len);
      const offsetComp = comparisonHistory.slice(comparisonHistory.length - len);
      for (let i = 0; i < len; i++) {
        compData.push({
          time: offsetData[i].time,
          value: offsetComp[i],
        });
      }
      comparisonSeriesRef.current.setData(compData);
    } else if (comparisonSeriesRef.current) {
      chart.removeSeries(comparisonSeriesRef.current);
      comparisonSeriesRef.current = null;
    }
  }, [comparisonHistory, comparisonName, formattedData]);

  return (
    <div className="w-full bg-base-100 rounded-xl shadow-lg p-3 sm:p-6 flex flex-col gap-4 border border-base-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{coinName} Candlestick Chart</h3>
          {comparisonName && (
            <span className="badge badge-secondary badge-outline mt-1 font-semibold">
              VS {comparisonName}
            </span>
          )}
        </div>

        {/* Technical Indicators Overlay Panel */}
        <div className="flex flex-wrap gap-3 items-center text-xs">
          <span className="font-semibold text-gray-500 uppercase tracking-wider">Overlays:</span>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              className="checkbox checkbox-primary checkbox-xs"
              checked={showEMA20}
              onChange={() => setShowEMA20(!showEMA20)}
            />
            EMA 20
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              className="checkbox checkbox-warning checkbox-xs"
              checked={showEMA50}
              onChange={() => setShowEMA50(!showEMA50)}
            />
            EMA 50
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              className="checkbox checkbox-secondary checkbox-xs"
              checked={showEMA200}
              onChange={() => setShowEMA200(!showEMA200)}
            />
            EMA 200
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              className="checkbox checkbox-accent checkbox-xs"
              checked={showBB}
              onChange={() => setShowBB(!showBB)}
            />
            Bollinger Bands
          </label>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div className="w-full relative h-[300px] sm:h-[400px]" ref={chartContainerRef} />
    </div>
  );
};

export default CandlestickChart;
