import React from "react";
import { Token } from "../types";
import { PieChart, Lock, UserCheck } from "lucide-react";

interface HolderDistributionProps {
  token: Token;
}

export const HolderDistribution: React.FC<HolderDistributionProps> = ({ token }) => {
  const curveTokens = token.realTokenReserves;
  const raydiumTokens = 200_000_000;
  const circulating = 1_000_000_000 - curveTokens - raydiumTokens;

  const curvePct = (curveTokens / 1_000_000_000) * 100;
  const raydiumPct = 20; // 20% reserved for Raydium LP migration
  const circulatingPct = Math.max(0, 100 - curvePct - raydiumPct);

  return (
    <div
      className="glass-panel"
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <PieChart size={18} color="var(--solana-purple)" />
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Holder Distribution</h3>
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Supply: 1,000,000,000</span>
      </div>

      {/* Distribution visual bar */}
      <div
        style={{
          width: "100%",
          height: "12px",
          background: "var(--bg-surface)",
          borderRadius: "6px",
          overflow: "hidden",
          display: "flex",
        }}
      >
        <div
          title={`Curve Vault: ${curvePct.toFixed(1)}%`}
          style={{ width: `${curvePct}%`, background: "var(--solana-cyan)", height: "100%" }}
        />
        <div
          title={`Raydium Reserved LP: 20%`}
          style={{ width: `${raydiumPct}%`, background: "var(--solana-purple)", height: "100%" }}
        />
        <div
          title={`Circulating Community: ${circulatingPct.toFixed(1)}%`}
          style={{ width: `${circulatingPct}%`, background: "var(--solana-green)", height: "100%" }}
        />
      </div>

      {/* Legend list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.82rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--solana-cyan)" }} />
            <span>Bonding Curve Vault (Smart Contract)</span>
          </div>
          <span className="mono" style={{ fontWeight: 600 }}>{curvePct.toFixed(1)}%</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--solana-purple)" }} />
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Lock size={12} /> Raydium Migration Lock
            </span>
          </div>
          <span className="mono" style={{ fontWeight: 600 }}>20.0%</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--solana-green)" }} />
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <UserCheck size={12} /> Community Traders
            </span>
          </div>
          <span className="mono" style={{ fontWeight: 600 }}>{circulatingPct.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};
