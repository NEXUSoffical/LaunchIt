import React from "react";
import { Token } from "../types";
import { CheckCircle2, TrendingUp, MessageSquare } from "lucide-react";

interface TokenCardProps {
  token: Token;
  onSelect: (token: Token) => void;
}

export const TokenCard: React.FC<TokenCardProps> = ({ token, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(token)}
      className="glass-panel"
      style={{
        padding: "16px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease, box-shadow 0.2s ease",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.borderColor = "rgba(255, 96, 0, 0.45)";
        e.currentTarget.style.boxShadow = "0 12px 28px rgba(0, 0, 0, 0.6)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Header: Avatar, Name, Badge */}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <img
          src={token.image}
          alt={token.name}
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "12px",
            objectFit: "cover",
            border: "1px solid var(--border-subtle)",
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="mono" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--solana-cyan)" }}>
              ${token.symbol}
            </span>
            {token.isGraduated ? (
              <span className="badge badge-green">
                <CheckCircle2 size={12} />
                Graduated 🎓
              </span>
            ) : (
              <span className="badge badge-orbit">
                {token.progressPercent.toFixed(0)}% Bonded
              </span>
            )}
          </div>

          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginTop: "2px",
            }}
          >
            {token.name}
          </h3>

          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
            by {token.creator}
          </div>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: "0.82rem",
          color: "var(--text-secondary)",
          lineHeight: "1.4",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: "36px",
        }}
      >
        {token.description}
      </p>

      {/* Market Cap & Price in SOL */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "8px 12px",
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid rgba(255, 255, 255, 0.04)",
        }}
      >
        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Market Cap</div>
          <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {(token.marketCapSol || 30).toFixed(1)} SOL
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>USD Value</div>
          <div className="mono" style={{ fontSize: "0.85rem", color: "var(--solana-green)" }}>
            ${token.marketCapUsd.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Bonding Curve Progress Bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "4px" }}>
          <span style={{ color: "var(--text-muted)" }}>Bonding Curve</span>
          <span className="mono" style={{ color: token.isGraduated ? "var(--solana-green)" : "#ff8c37", fontWeight: 700 }}>
            {token.isGraduated ? "RAYDIUM DEX 🎓" : `${token.progressPercent.toFixed(1)}%`}
          </span>
        </div>
        <div
          style={{
            height: "6px",
            background: "rgba(255, 255, 255, 0.06)",
            borderRadius: "3px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${token.progressPercent}%`,
              height: "100%",
              background: token.isGraduated
                ? "linear-gradient(90deg, #14f195 0%, #00f0ff 100%)"
                : "linear-gradient(90deg, #9945ff 0%, #ff6000 60%, #ff8c37 100%)",
              borderRadius: "3px",
              boxShadow: token.isGraduated ? "0 0 8px rgba(20, 241, 149, 0.6)" : "0 0 6px rgba(255, 96, 0, 0.4)",
            }}
          />
        </div>
      </div>

      {/* Footer stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          paddingTop: "4px",
          borderTop: "1px solid rgba(255, 255, 255, 0.04)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <TrendingUp size={12} color="#ff8c37" />
          {(token.volume24hSol || 0).toFixed(1)} SOL Vol
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <MessageSquare size={12} />
          {token.repliesCount}
        </span>
      </div>
    </div>
  );
};
