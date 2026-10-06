import React, { useState } from "react";
import { Token } from "../types";
import { TokenCard } from "./TokenCard";
import { Search, Flame, Trophy, Zap, GraduationCap } from "lucide-react";

interface TokenGridProps {
  tokens: Token[];
  onSelectToken: (token: Token) => void;
}

type TabType = "trending" | "marketCap" | "new" | "graduated";

export const TokenGrid: React.FC<TokenGridProps> = ({
  tokens,
  onSelectToken,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("trending");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTokens = tokens.filter((token) => {
    const matchesSearch =
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.mint.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "graduated") {
      return token.isGraduated;
    }
    return true;
  });

  const sortedTokens = [...filteredTokens].sort((a, b) => {
    if (activeTab === "trending") return b.volume24hSol - a.volume24hSol;
    if (activeTab === "marketCap") return b.marketCapSol - a.marketCapSol;
    if (activeTab === "new") return b.createdAt - a.createdAt;
    return b.progressPercent - a.progressPercent;
  });

  return (
    <div style={{ marginTop: "32px", marginBottom: "60px" }}>
      {/* Search and Filters Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-md)",
            padding: "4px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <button
            onClick={() => setActiveTab("trending")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 600,
              background: activeTab === "trending" ? "var(--bg-surface-elevated)" : "transparent",
              color: activeTab === "trending" ? "var(--solana-green)" : "var(--text-muted)",
            }}
          >
            <Flame size={14} />
            Trending
          </button>

          <button
            onClick={() => setActiveTab("marketCap")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 600,
              background: activeTab === "marketCap" ? "var(--bg-surface-elevated)" : "transparent",
              color: activeTab === "marketCap" ? "var(--solana-purple)" : "var(--text-muted)",
            }}
          >
            <Trophy size={14} />
            Market Cap
          </button>

          <button
            onClick={() => setActiveTab("new")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 600,
              background: activeTab === "new" ? "var(--bg-surface-elevated)" : "transparent",
              color: activeTab === "new" ? "var(--solana-cyan)" : "var(--text-muted)",
            }}
          >
            <Zap size={14} />
            New Launches
          </button>

          <button
            onClick={() => setActiveTab("graduated")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 600,
              background: activeTab === "graduated" ? "var(--bg-surface-elevated)" : "transparent",
              color: activeTab === "graduated" ? "#10b981" : "var(--text-muted)",
            }}
          >
            <GraduationCap size={14} />
            Graduated (Raydium)
          </button>
        </div>

        {/* Search Bar */}
        <div
          style={{
            position: "relative",
            minWidth: "280px",
          }}
        >
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Search coin name, ticker, or mint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px 10px 38px",
              color: "var(--text-primary)",
              fontSize: "0.88rem",
            }}
          />
        </div>
      </div>

      {/* Grid of Tokens */}
      {sortedTokens.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
            gap: "20px",
          }}
        >
          {sortedTokens.map((token) => (
            <TokenCard key={token.id} token={token} onSelect={onSelectToken} />
          ))}
        </div>
      ) : (
        <div
          className="glass-panel"
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "var(--text-muted)",
          }}
        >
          <Search size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p>No tokens found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};
