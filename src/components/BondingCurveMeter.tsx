import React from "react";
import { Token } from "../types";
import { GraduationCap, ShieldCheck, Flame, Info } from "lucide-react";

interface BondingCurveMeterProps {
  token: Token;
}

export const BondingCurveMeter: React.FC<BondingCurveMeterProps> = ({ token }) => {
  const targetSol = 85.0;
  const currentSol = token.realSolReserves;
  const solRemaining = Math.max(0, targetSol - currentSol);
  const percent = Math.min(100, Math.max(0, (currentSol / targetSol) * 100));

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
          <GraduationCap size={18} color="var(--solana-cyan)" />
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Bonding Curve Progress</h3>
        </div>
        <span
          className="mono"
          style={{
            fontSize: "1.1rem",
            fontWeight: 800,
            color: percent >= 100 ? "#10b981" : "var(--solana-green)",
          }}
        >
          {percent.toFixed(1)}%
        </span>
      </div>

      {/* Visual Bar */}
      <div
        style={{
          width: "100%",
          height: "16px",
          background: "rgba(255, 255, 255, 0.06)",
          borderRadius: "8px",
          overflow: "hidden",
          position: "relative",
          padding: "2px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            borderRadius: "6px",
            background: percent >= 100
              ? "linear-gradient(90deg, #10b981 0%, #059669 100%)"
              : "linear-gradient(90deg, #9945ff 0%, #14f195 100%)",
            boxShadow: "0 0 12px rgba(20, 241, 149, 0.5)",
            transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>

      {/* Progress Breakdown */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          padding: "12px",
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-md)",
          fontSize: "0.85rem",
        }}
      >
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>SOL Accumulated</div>
          <div className="mono" style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
            {currentSol.toFixed(2)} / {targetSol.toFixed(1)} SOL
          </div>
        </div>

        <div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>SOL Needed to Graduate</div>
          <div className="mono" style={{ fontWeight: 700, color: solRemaining === 0 ? "var(--solana-green)" : "var(--solana-amber)", marginTop: "2px" }}>
            {solRemaining === 0 ? "GRADUATED!" : `${solRemaining.toFixed(2)} SOL`}
          </div>
        </div>
      </div>

      {/* Explainer Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          fontSize: "0.78rem",
          color: "var(--text-secondary)",
          lineHeight: "1.4",
          background: "rgba(153, 69, 255, 0.06)",
          padding: "10px 14px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid rgba(153, 69, 255, 0.15)",
        }}
      >
        <ShieldCheck size={16} color="var(--solana-purple)" style={{ flexShrink: 0, marginTop: "2px" }} />
        <span>
          When the market cap reaches <b>85 SOL</b> (~$12.7k), all remaining <b>200M tokens</b> and <b>85 SOL</b> in liquidity are automatically deposited into <b>Raydium</b> and burned forever. No team can rug!
        </span>
      </div>
    </div>
  );
};
