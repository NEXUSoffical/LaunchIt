import React, { useState, useMemo } from "react";
import { Token, Trade } from "../types";
import { TrendingUp, TrendingDown, Activity, BarChart2 } from "lucide-react";

interface PriceChartProps {
  token: Token;
  trades?: Trade[];
}

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  isBuy: boolean;
  volume: number;
  timestamp: number;
}

export const PriceChart: React.FC<PriceChartProps> = ({ token, trades = [] }) => {
  if (!token) return null;

  const rawPrice = typeof token.priceSol === "number" && !isNaN(token.priceSol) && token.priceSol > 0 && token.priceSol < 0.05
    ? token.priceSol
    : (token.isGraduated ? 0.00042 : 0.00003);

  const [timeframe, setTimeframe] = useState<"1m" | "5m" | "15m" | "1h">("5m");
  const [chartType, setChartType] = useState<"area" | "candles">("area");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Generate candles strictly from real trades (or flat baseline at launch price if no trades yet)
  const candles = useMemo<Candle[]>(() => {
    const validTrades = Array.isArray(trades) ? trades : [];
    const sortedTrades = [...validTrades].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const baseFloorPrice = 0.00000003;
    const result: Candle[] = [];
    const now = Date.now();

    // Starting point at token creation
    let currentPrice = sortedTrades.length > 0 ? baseFloorPrice : rawPrice;
    result.push({
      open: currentPrice,
      high: currentPrice,
      low: currentPrice,
      close: currentPrice,
      isBuy: true,
      volume: 0,
      timestamp: token.createdAt || now - 60000,
    });

    if (sortedTrades.length > 0) {
      for (let idx = 0; idx < sortedTrades.length; idx++) {
        const t = sortedTrades[idx];
        const open = currentPrice;

        let close: number;
        if (typeof t.priceSol === "number" && !isNaN(t.priceSol) && t.priceSol > 0) {
          close = t.priceSol;
        } else if (t.isBuy) {
          const tradeImpact = Math.max(0.03, ((t.solAmount || 1) / 10.0) * 0.12 + 0.04);
          close = open * (1 + tradeImpact);
        } else {
          close = Math.max(baseFloorPrice, open * 0.75);
        }

        const isGreen = close >= open;
        const wickHigh = Math.max(open, close);
        const wickLow = Math.min(open, close);

        result.push({
          open,
          high: wickHigh,
          low: wickLow,
          close,
          isBuy: isGreen,
          volume: t.tokenAmount || 0,
          timestamp: t.timestamp || now,
        });
        currentPrice = close;
      }
    } else {
      result.push({
        open: rawPrice,
        high: rawPrice,
        low: rawPrice,
        close: rawPrice,
        isBuy: true,
        volume: 0,
        timestamp: now,
      });
    }

    return result;
  }, [rawPrice, trades, token.createdAt]);

  // SVG Coordinates calculation
  const allPrices = candles.flatMap((c) => [c.low, c.high, c.open, c.close]);
  const minPrice = Math.min(...allPrices) * 0.98;
  const maxPrice = Math.max(...allPrices) * 1.02;
  const priceRange = maxPrice - minPrice || 0.0000001;

  const maxVolume = Math.max(...candles.map((c) => c.volume), 1);

  const svgWidth = 800;
  const svgHeight = 320;
  const paddingLeft = 20;
  const paddingRight = 70; // room for price pill on right
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = 240; // top 240px for price, bottom 60px for volume
  const volumeHeight = 50;

  const stepX = chartWidth / Math.max(1, candles.length - 1);

  // Line points
  const linePoints = candles.map((c, i) => {
    const x = paddingLeft + i * stepX;
    const y = chartHeight - ((c.close - minPrice) / priceRange) * (chartHeight - 40) - 20;
    return { x, y, candle: c };
  });

  const lastPoint = linePoints[linePoints.length - 1] || { x: chartWidth, y: 120 };
  const firstPoint = linePoints[0] || { x: paddingLeft, y: 120 };
  const pathD = linePoints.length > 0 ? `M ${linePoints.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" L ")}` : "";
  const areaD = linePoints.length > 0 ? `${pathD} L ${lastPoint.x.toFixed(1)},${chartHeight} L ${firstPoint.x.toFixed(1)},${chartHeight} Z` : "";

  // Calculate 24h change percentage
  const firstPrice = candles[0]?.open || rawPrice;
  const latestPrice = candles.length > 0 ? candles[candles.length - 1].close : rawPrice;
  const pctChange = ((latestPrice - firstPrice) / (firstPrice || 1)) * 100;
  const isUp = pctChange >= 0;

  // Active hover info
  const activeCandle = hoveredIndex !== null && candles[hoveredIndex] ? candles[hoveredIndex] : candles[candles.length - 1];

  return (
    <div
      className="glass-panel"
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        position: "relative",
      }}
    >
      {/* Top Header: Price Telemetry & Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Live Curve Price
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: "4px",
                background: isUp ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: isUp ? "#10b981" : "#ef4444",
                border: `1px solid ${isUp ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              }}
            >
              {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {isUp ? `+${pctChange.toFixed(2)}%` : `${pctChange.toFixed(2)}%`}
            </span>
            {token.isGraduated && (
              <span className="badge badge-green" style={{ fontSize: "0.68rem", padding: "2px 6px" }}>
                🎓 100% BONDED
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "2px" }}>
            <span className="mono" style={{ fontSize: "1.45rem", fontWeight: 900, color: isUp ? "#14f195" : "#ff8c37" }}>
              {latestPrice.toFixed(8)} <span style={{ fontSize: "0.85rem", color: "var(--solana-green)" }}>SOL</span>
            </span>
            <span className="mono" style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              ~${(latestPrice * 150).toFixed(6)} USD
            </span>
          </div>
        </div>

        {/* Timeframe & Chart Style Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Timeframe */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-sm)",
              padding: "2px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {(["1m", "5m", "15m", "1h"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background: timeframe === tf ? "var(--bg-surface-elevated)" : "transparent",
                  color: timeframe === tf ? "var(--orbit-cyan)" : "var(--text-muted)",
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Line vs Candles */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-sm)",
              padding: "2px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <button
              onClick={() => setChartType("area")}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 600,
                background: chartType === "area" ? "rgba(0, 240, 255, 0.15)" : "transparent",
                color: chartType === "area" ? "#00f0ff" : "var(--text-muted)",
                border: chartType === "area" ? "1px solid rgba(0, 240, 255, 0.3)" : "none",
              }}
            >
              Line
            </button>
            <button
              onClick={() => setChartType("candles")}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 600,
                background: chartType === "candles" ? "rgba(16, 185, 129, 0.15)" : "transparent",
                color: chartType === "candles" ? "#10b981" : "var(--text-muted)",
                border: chartType === "candles" ? "1px solid rgba(16, 185, 129, 0.3)" : "none",
              }}
            >
              Candles
            </button>
          </div>
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div
        style={{
          width: "100%",
          height: "320px",
          position: "relative",
          background: "linear-gradient(180deg, rgba(14, 19, 29, 0.7) 0%, rgba(6, 8, 14, 0.95) 100%)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: "100%", height: "100%", display: "block" }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="orbitAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#ff6000" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="orbitLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff6000" />
              <stop offset="70%" stopColor="#ff8c37" />
              <stop offset="100%" stopColor="#00f0ff" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75].map((pct, idx) => {
            const y = chartHeight * pct;
            return (
              <line
                key={`grid-${idx}`}
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="rgba(255, 255, 255, 0.04)"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Volume baseline separator */}
          <line
            x1={paddingLeft}
            y1={chartHeight}
            x2={svgWidth - paddingRight}
            y2={chartHeight}
            stroke="rgba(255, 255, 255, 0.08)"
          />

          {/* Live horizontal price tracking crosshair */}
          <line
            x1={paddingLeft}
            y1={lastPoint.y}
            x2={svgWidth - paddingRight}
            y2={lastPoint.y}
            stroke="rgba(0, 240, 255, 0.4)"
            strokeDasharray="2 3"
          />

          {/* Volume Histogram Bars (bottom) */}
          {candles.map((c, i) => {
            const x = paddingLeft + i * stepX;
            const barWidth = Math.max(2, stepX * 0.65);
            const vHeight = Math.max(3, (c.volume / maxVolume) * volumeHeight);
            const vY = svgHeight - 10 - vHeight;
            const barColor = c.isBuy ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)";

            return (
              <rect
                key={`vol-${i}`}
                x={x - barWidth / 2}
                y={vY}
                width={barWidth}
                height={vHeight}
                fill={barColor}
                rx="1"
              />
            );
          })}

          {/* CHART MODE: Area & Line */}
          {chartType === "area" ? (
            <>
              {/* Shaded Area */}
              <path d={areaD} fill="url(#orbitAreaGrad)" />

              {/* Glowing Line */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#orbitLineGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Latest Beacon Point */}
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="5"
                fill="#00f0ff"
                filter="drop-shadow(0 0 8px #00f0ff)"
              />
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="10"
                fill="none"
                stroke="#00f0ff"
                strokeWidth="1.5"
                opacity="0.6"
              >
                <animate attributeName="r" values="5;14;5" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
              </circle>
            </>
          ) : (
            /* CHART MODE: Real Candlesticks with wicks! */
            candles.map((c, i) => {
              const x = paddingLeft + i * stepX;
              const candleWidth = Math.max(3, stepX * 0.7);

              const yHigh = chartHeight - ((c.high - minPrice) / priceRange) * (chartHeight - 40) - 20;
              const yLow = chartHeight - ((c.low - minPrice) / priceRange) * (chartHeight - 40) - 20;
              const yOpen = chartHeight - ((c.open - minPrice) / priceRange) * (chartHeight - 40) - 20;
              const yClose = chartHeight - ((c.close - minPrice) / priceRange) * (chartHeight - 40) - 20;

              const isGreen = c.close >= c.open;
              const candleColor = isGreen ? "#10b981" : "#ef4444";
              const candleTop = Math.min(yOpen, yClose);
              const candleHeight = Math.max(3, Math.abs(yClose - yOpen));

              return (
                <g key={`candle-${i}`}>
                  {/* Top & Bottom Wick */}
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={candleColor}
                    strokeWidth="1.5"
                  />
                  {/* Real Body */}
                  <rect
                    x={x - candleWidth / 2}
                    y={candleTop}
                    width={candleWidth}
                    height={candleHeight}
                    fill={candleColor}
                    rx="1.5"
                  />
                </g>
              );
            })
          )}

          {/* Right Y-Axis Price Tag */}
          <g transform={`translate(${svgWidth - paddingRight + 4}, ${lastPoint.y - 10})`}>
            <rect
              width="62"
              height="20"
              rx="4"
              fill={isUp ? "rgba(0, 240, 255, 0.9)" : "rgba(255, 96, 0, 0.9)"}
            />
            <text
              x="31"
              y="13"
              textAnchor="middle"
              fill="#05070d"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {(latestPrice * 1000).toFixed(5)}
            </text>
          </g>

          {/* Interactive Mouse Hover Overlay Columns */}
          {candles.map((_, i) => {
            const x = paddingLeft + i * stepX;
            return (
              <rect
                key={`hit-${i}`}
                x={x - stepX / 2}
                y={0}
                width={stepX}
                height={svgHeight}
                fill="transparent"
                style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHoveredIndex(i)}
              />
            );
          })}
        </svg>

        {/* Floating Tooltip during hover */}
        {hoveredIndex !== null && activeCandle && (
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "20px",
              background: "rgba(14, 19, 29, 0.92)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "0.72rem",
              display: "flex",
              gap: "12px",
              pointerEvents: "none",
              backdropFilter: "blur(6px)",
              zIndex: 10,
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>
              Price: <b className="mono" style={{ color: "#fff" }}>{activeCandle.close.toFixed(8)} SOL</b>
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              Type: <b style={{ color: activeCandle.isBuy ? "#10b981" : "#ef4444" }}>{activeCandle.isBuy ? "BUY" : "SELL"}</b>
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              Volume: <b className="mono" style={{ color: "var(--solana-cyan)" }}>{(activeCandle.volume / 1e6).toFixed(2)}M</b>
            </span>
          </div>
        )}

        {/* Solana Virtual Curve Watermark */}
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            right: "12px",
            fontSize: "0.68rem",
            color: "rgba(255, 255, 255, 0.2)",
            fontWeight: 800,
            letterSpacing: "1px",
            pointerEvents: "none",
          }}
        >
          LAUNCHIT • SOLANA BONDING CURVE AMM
        </div>
      </div>
    </div>
  );
};
