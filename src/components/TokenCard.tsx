import React from "react";
import { Token } from "../types";
import { CheckCircle2, TrendingUp, MessageSquare, Heart, UserPlus, UserCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface TokenCardProps {
  token: Token;
  onSelect: (token: Token) => void;
}

export const TokenCard: React.FC<TokenCardProps> = ({ token, onSelect }) => {
  const { currentUser, toggleFollowUser, isFollowingUser } = useAuth();
  const rawCreator = token.creatorHandle || token.creator || token.launcherHandle || "";
  const cleanCreator = rawCreator.replace(/^@/, "").trim();
  const isSelf = currentUser && cleanCreator.toLowerCase() === currentUser.username.toLowerCase();
  const isFollowing = cleanCreator ? isFollowingUser(cleanCreator) : false;
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

          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              by {token.creatorHandle || token.creator || "Anonymous"}
            </span>
            {cleanCreator && !isSelf && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFollowUser(cleanCreator);
                }}
                style={{
                  background: isFollowing ? "rgba(20, 241, 149, 0.15)" : "rgba(255, 255, 255, 0.08)",
                  border: isFollowing ? "1px solid rgba(20, 241, 149, 0.4)" : "1px solid rgba(255, 255, 255, 0.12)",
                  color: isFollowing ? "var(--solana-green)" : "#cbd5e1",
                  borderRadius: "999px",
                  padding: "1px 7px",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  transition: "all 0.2s ease",
                }}
                title={isFollowing ? `Unfollow @${cleanCreator}` : `Follow @${cleanCreator}`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={10} />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={10} />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px", color: (token.likes?.length || 0) > 0 ? "#f43f5e" : "var(--text-muted)" }}>
            <Heart size={12} fill={(token.likes?.length || 0) > 0 ? "#f43f5e" : "none"} />
            {token.likes?.length || 0}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <MessageSquare size={12} />
            {token.repliesCount || 0}
          </span>
        </div>
      </div>
    </div>
  );
};
