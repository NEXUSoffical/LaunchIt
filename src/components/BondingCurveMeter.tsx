import React from "react";
import { Token } from "../types";
import { Rocket, ShieldCheck } from "lucide-react";

interface BondingCurveMeterProps {
  token: Token;
}

export const BondingCurveMeter: React.FC<BondingCurveMeterProps> = ({ token }) => {
  const targetSol = 85.0;
  const currentSol = token.realSolReserves || 0;
  const isPermanentlyBonded =
    token.isGraduated || (token.progressPercent !== undefined && token.progressPercent >= 100);
  const percent = isPermanentlyBonded
    ? 100.0
    : Math.min(100, Math.max(0, (currentSol / targetSol) * 100));
  const solRemaining = isPermanentlyBonded ? 0 : Math.max(0, targetSol - currentSol);

  const volumeSol = token.volume24hSol || 0;
  const royaltiesSol =
    (token.unclaimedCreatorFeesSol || 0) +
    (token.unclaimedLauncherFeesSol || 0) +
    (token.claimedCreatorFeesSol || 0) +
    (token.claimedLauncherFeesSol || 0) ||
    volumeSol * 0.01;

  const getCurveStage = (pct: number) => {
    if (pct >= 100)
      return { name: "GRADUATED 🎓", desc: "Raydium AMM Liquidity Locked Forever", color: "#14f195" };
    if (pct >= 75)
      return { name: "Final Stretch", desc: "Approaching Raydium Migration", color: "#ff6000" };
    if (pct >= 50)
      return { name: "Trending Curve", desc: "Strong Buy Momentum", color: "#ff8c37" };
    if (pct >= 25)
      return { name: "Warming Up", desc: "Ascending Fast", color: "#fbbf24" };
    return { name: "New Launch", desc: "Early Bonding Curve Entry", color: "#14f195" };
  };

  const stage = getCurveStage(percent);

  return (
    <div
      className="glass-panel"
      style={{
        padding: "22px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        border:
          percent >= 100
            ? "1px solid rgba(20, 241, 149, 0.4)"
            : "1px solid rgba(255, 96, 0, 0.25)",
        boxShadow:
          percent >= 100
            ? "0 0 25px rgba(20, 241, 149, 0.2)"
            : "0 0 20px rgba(255, 96, 0, 0.15)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(255, 96, 0, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(255, 96, 0, 0.3)",
            }}
          >
            <Rocket size={20} color="#ff8c37" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, letterSpacing: "-0.3px" }}>
                Bonding Curve Progress
              </h3>
              <span
                className="badge"
                style={{
                  background: "rgba(20, 241, 149, 0.12)",
                  color: stage.color,
                  border: `1px solid ${stage.color}40`,
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                }}
              >
                {stage.name}
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {stage.desc}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            className="mono"
            style={{
              fontSize: "1.35rem",
              fontWeight: 900,
              color: percent >= 100 ? "var(--solana-green)" : "#ff8c37",
              textShadow:
                percent >= 100
                  ? "0 0 12px rgba(20, 241, 149, 0.6)"
                  : "0 0 10px rgba(255, 96, 0, 0.4)",
            }}
          >
            {percent.toFixed(1)}%
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Raydium Target</div>
        </div>
      </div>

      {/* Visual Progress Track */}
      <div style={{ position: "relative", paddingTop: "14px", paddingBottom: "10px" }}>
        <div
          style={{
            width: "100%",
            height: "18px",
            background: "rgba(0, 0, 0, 0.5)",
            borderRadius: "10px",
            position: "relative",
            padding: "3px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              borderRadius: "8px",
              background:
                percent >= 100
                  ? "linear-gradient(90deg, #14f195 0%, #00f0ff 100%)"
                  : "linear-gradient(90deg, #9945ff 0%, #ff6000 60%, #ff8c37 100%)",
              boxShadow:
                percent >= 100
                  ? "0 0 16px rgba(20, 241, 149, 0.7)"
                  : "0 0 14px rgba(255, 96, 0, 0.6)",
              transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.68rem",
            color: "var(--text-muted)",
            marginTop: "8px",
            fontWeight: 600,
          }}
        >
          <span>🚀 Launch (0 SOL)</span>
          <span>King of the Hill (42.5 SOL)</span>
          <span style={{ color: percent >= 100 ? "var(--solana-green)" : "inherit" }}>
            🎓 Raydium DEX (85 SOL)
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "10px",
          padding: "14px",
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>SOL in Curve</div>
          <div className="mono" style={{ fontWeight: 800, color: "var(--text-primary)", marginTop: "3px", fontSize: "0.95rem" }}>
            {currentSol.toFixed(2)} SOL
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Target: 85.0 SOL</div>
        </div>

        <div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>To Graduate</div>
          <div
            className="mono"
            style={{
              fontWeight: 800,
              color: solRemaining === 0 ? "var(--solana-green)" : "#ff8c37",
              marginTop: "3px",
              fontSize: "0.95rem",
            }}
          >
            {solRemaining === 0 ? "GRADUATED 🎓" : `${solRemaining.toFixed(2)} SOL`}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Remaining buy pressure</div>
        </div>

        <div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Creator Royalties 👑</div>
          <div
            className="mono"
            style={{
              fontWeight: 800,
              color: "#14f195",
              marginTop: "3px",
              fontSize: "0.95rem",
            }}
          >
            {royaltiesSol.toFixed(3)} SOL
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>1% fee to Creator & Launcher</div>
        </div>
      </div>

      {/* Anti-Rug Guarantee Explainer */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          fontSize: "0.78rem",
          color: "var(--text-secondary)",
          lineHeight: "1.45",
          background: "rgba(20, 241, 149, 0.05)",
          padding: "12px 14px",
          borderRadius: "var(--radius-md)",
          border: "1px solid rgba(20, 241, 149, 0.15)",
        }}
      >
        <ShieldCheck size={18} color="var(--solana-green)" style={{ flexShrink: 0, marginTop: "2px" }} />
        <span>
          When the bonding curve reaches <b>85.0 SOL</b> (100%), all <b>85 SOL</b> + the <b>200M reserved tokens</b> are automatically seeded into a <b>Raydium / Meteora AMM</b> pool and the LP tokens are burned forever. <b>Mint authority is revoked at creation—zero rug risk.</b>
        </span>
      </div>
    </div>
  );
};
