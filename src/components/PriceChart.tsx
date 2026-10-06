import React, { useState } from "react";
import { Token } from "../types";

interface PriceChartProps {
  token: Token;
}

export const PriceChart: React.FC<PriceChartProps> = ({ token }) => {
  const [timeframe, setTimeframe] = useState<"1m" | "5m" | "15m" | "1h">("5m");
  const [chartType, setChartType] = useState<"area" | "candles">("area");

  // Generate realistic price points leading up to current price
  const basePrice = token.priceSol;
  const numPoints = 24;
  const points: { x: number; y: number; price: number }[] = [];

  for (let i = 0; i < numPoints; i++) {
    const fraction = i / (numPoints - 1);
    // Bonding curve upward trajectory with slight volatility
    const variance = (Math.sin(i * 1.5) * 0.15 + (i * 0.05));
    const p = (basePrice * 0.4) + (basePrice * 0.6 * fraction) * (1 + variance * 0.2);
    points.push({
      x: fraction * 100,
      y: p,
      price: p,
    });
  }

  // Normalize for SVG viewBox (0 0 800 320)
  const minPrice = Math.min(...points.map((p) => p.y)) * 0.95;
  const maxPrice = Math.max(...points.map((p) => p.y)) * 1.05;
  const priceRange = maxPrice - minPrice || 1;

  const svgCoords = points.map((p) => {
    const svgX = (p.x / 100) * 760 + 20;
    const svgY = 280 - ((p.y - minPrice) / priceRange) * 240;
    return { x: svgX, y: svgY, price: p.price };
  });

  const pathD = `M ${svgCoords.map((pt) => `${pt.x},${pt.y}`).join(" L ")}`;
  const areaD = `${pathD} L ${svgCoords[svgCoords.length - 1].x},300 L ${svgCoords[0].x},300 Z`;

  return (
    <div
      className="glass-panel"
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Chart Top Bar: Price & Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Current Curve Price</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <span className="mono" style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--solana-green)" }}>
              {token.priceSol.toFixed(10)} SOL
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              ~${(token.priceSol * 150).toFixed(6)} USD
            </span>
          </div>
        </div>

        {/* Timeframe & Chart Style */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                  color: timeframe === tf ? "var(--solana-cyan)" : "var(--text-muted)",
                }}
              >
                {tf}
              </button>
            ))}
          </div>

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
                background: chartType === "area" ? "var(--bg-surface-elevated)" : "transparent",
                color: chartType === "area" ? "var(--solana-green)" : "var(--text-muted)",
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
                background: chartType === "candles" ? "var(--bg-surface-elevated)" : "transparent",
                color: chartType === "candles" ? "var(--solana-green)" : "var(--text-muted)",
              }}
            >
              Candles
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        style={{
          width: "100%",
          height: "300px",
          position: "relative",
          background: "rgba(7, 9, 14, 0.5)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.04)",
        }}
      >
        <svg
          viewBox="0 0 800 320"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14f195" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#14f195" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#9945ff" />
              <stop offset="100%" stopColor="#14f195" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="20" y1="80" x2="780" y2="80" stroke="rgba(255,255,255,0.04)" strokeDasharray="4" />
          <line x1="20" y1="160" x2="780" y2="160" stroke="rgba(255,255,255,0.04)" strokeDasharray="4" />
          <line x1="20" y1="240" x2="780" y2="240" stroke="rgba(255,255,255,0.04)" strokeDasharray="4" />

          {chartType === "area" ? (
            <>
              {/* Shaded Area */}
              <path d={areaD} fill="url(#areaGradient)" />
              {/* Glowing Line */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Last Point Beacon */}
              <circle
                cx={svgCoords[svgCoords.length - 1].x}
                cy={svgCoords[svgCoords.length - 1].y}
                r="5"
                fill="#14f195"
                filter="drop-shadow(0 0 8px #14f195)"
              />
            </>
          ) : (
            /* Render Candlesticks */
            svgCoords.map((pt, idx) => {
              const candleWidth = 14;
              const isGreen = idx % 3 !== 1;
              const high = pt.y - 15;
              const low = pt.y + 15;
              const open = isGreen ? pt.y + 8 : pt.y - 8;
              const close = isGreen ? pt.y - 8 : pt.y + 8;
              const color = isGreen ? "#14f195" : "#ef4444";

              return (
                <g key={idx}>
                  {/* Wick */}
                  <line x1={pt.x} y1={high} x2={pt.x} y2={low} stroke={color} strokeWidth="1.5" />
                  {/* Body */}
                  <rect
                    x={pt.x - candleWidth / 2}
                    y={Math.min(open, close)}
                    width={candleWidth}
                    height={Math.max(4, Math.abs(close - open))}
                    fill={color}
                    rx="1"
                  />
                </g>
              );
            })
          )}
        </svg>

        {/* Bonding Curve watermark */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            right: "16px",
            fontSize: "0.75rem",
            color: "rgba(255, 255, 255, 0.2)",
            fontWeight: 700,
            letterSpacing: "1px",
          }}
        >
          VIRTUAL CONSTANT PRODUCT CURVE
        </div>
      </div>
    </div>
  );
};
