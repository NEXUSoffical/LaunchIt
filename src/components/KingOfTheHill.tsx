import React from "react";
import { Token } from "../types";
import { Crown, Flame, ArrowUpRight, ShieldCheck } from "lucide-react";

interface KingOfTheHillProps {
  token: Token;
  onSelectToken: (token: Token) => void;
}

export const KingOfTheHill: React.FC<KingOfTheHillProps> = ({
  token,
  onSelectToken,
}) => {
  return (
    <div
      onClick={() => onSelectToken(token)}
      className="glass-panel-elevated animate-pulse-glow"
      style={{
        marginTop: "24px",
        padding: "24px",
        cursor: "pointer",
        background: "linear-gradient(135deg, rgba(21, 28, 43, 0.9) 0%, rgba(14, 19, 29, 0.95) 100%)",
        border: "1px solid rgba(245, 158, 11, 0.4)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Accent Blur */}
      <div
        style={{
          position: "absolute",
          top: "-50px",
          right: "-50px",
          width: "250px",
          height: "250px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
        {/* Left Side: Badge + Token Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* Token Avatar with Crown */}
          <div style={{ position: "relative" }}>
            <img
              src={token.image}
              alt={token.name}
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "18px",
                objectFit: "cover",
                border: "2px solid var(--solana-amber)",
                boxShadow: "0 0 20px rgba(245, 158, 11, 0.3)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "-10px",
                right: "-10px",
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              <Crown size={16} color="#07090e" strokeWidth={2.5} />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span className="badge badge-amber" style={{ fontWeight: 800 }}>
                <Flame size={12} />
                KING OF THE HILL
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                by {token.creator}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800 }}>{token.name}</h2>
              <span className="mono" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--solana-amber)" }}>
                ${token.symbol}
              </span>
            </div>

            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", maxWidth: "600px", marginTop: "4px" }}>
              {token.description}
            </p>
          </div>
        </div>

        {/* Right Side: Bonding Curve Progress & Action */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: "280px", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Bonding Curve Progress</span>
            <span className="mono" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--solana-green)" }}>
              {token.progressPercent.toFixed(1)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: "100%",
              height: "12px",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "6px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${token.progressPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #f59e0b 0%, #14f195 100%)",
                borderRadius: "6px",
                boxShadow: "0 0 10px rgba(20, 241, 149, 0.6)",
                transition: "width 0.4s ease",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <span>Market Cap: <b style={{ color: "var(--text-primary)" }}>{token.marketCapSol.toFixed(1)} SOL</b></span>
            <span>Target: <b>85 SOL</b></span>
          </div>

          <button
            className="btn-primary"
            style={{ marginTop: "4px", width: "100%", background: "linear-gradient(135deg, #f59e0b 0%, #14f195 100%)" }}
          >
            <span>Trade on Curve</span>
            <ArrowUpRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
