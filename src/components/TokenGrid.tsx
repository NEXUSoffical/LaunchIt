import React, { useState } from "react";
import { Token, Trade } from "../types";
import { TokenCard } from "./TokenCard";
import { VideoSwipeFeed } from "./VideoSwipeFeed";
import { Search, Flame, Trophy, Zap, GraduationCap, Video, LayoutGrid, Heart } from "lucide-react";

interface TokenGridProps {
  tokens: Token[];
  onSelectToken: (token: Token) => void;
  onTradeExecuted: (trade: Trade, updatedToken: Token) => void;
  onUpdateToken: (updatedToken: Token) => void;
}

type TabType = "trending" | "mostLiked" | "marketCap" | "new" | "graduated";
type ViewMode = "video" | "grid";

export const TokenGrid: React.FC<TokenGridProps> = ({
  tokens,
  onSelectToken,
  onTradeExecuted,
  onUpdateToken,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("trending");
  const [viewMode, setViewMode] = useState<ViewMode>("video");
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

  const OFFICIAL_LAUNCHIT_MINT = "4akoUeUJcay3tQUc3BJbqGtaCwPanZ12xm7dLaunchit";

  const isOfficialLaunchIt = (t: Token) =>
    t.mint === OFFICIAL_LAUNCHIT_MINT || t.symbol.trim().toUpperCase() === "LAUNCHIT";

  const sortedTokens = [...filteredTokens].sort((a, b) => {
    // Always pin the official $LAUNCHIT coin #1 first in the Video Scroll & Grid feeds
    const aPinned = isOfficialLaunchIt(a);
    const bPinned = isOfficialLaunchIt(b);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    if (activeTab === "trending") {
      const scoreA = a.volume24hSol + (a.likes?.length || 0) * 0.25 + (a.repliesCount || 0) * 0.1;
      const scoreB = b.volume24hSol + (b.likes?.length || 0) * 0.25 + (b.repliesCount || 0) * 0.1;
      return scoreB - scoreA;
    }
    if (activeTab === "mostLiked") {
      const likesDiff = (b.likes?.length || 0) - (a.likes?.length || 0);
      if (likesDiff !== 0) return likesDiff;
      return (b.repliesCount || 0) - (a.repliesCount || 0);
    }
    if (activeTab === "marketCap") return b.marketCapSol - a.marketCapSol;
    if (activeTab === "new") return b.createdAt - a.createdAt;
    return b.progressPercent - a.progressPercent;
  });

  return (
    <div style={{ marginTop: "20px", marginBottom: "40px" }}>
      {/* Search, View Mode & Filters Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* View Mode Toggle: TikTok Video Feed vs Grid */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              padding: "4px",
              border: "1px solid rgba(255, 96, 0, 0.35)",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("video")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.84rem",
                fontWeight: 800,
                background:
                  viewMode === "video"
                    ? "linear-gradient(135deg, #ff6000 0%, #ff8c37 100%)"
                    : "transparent",
                color: viewMode === "video" ? "#ffffff" : "var(--text-muted)",
              }}
            >
              <Video size={15} />
              <span>Video Scroll</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("grid")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.84rem",
                fontWeight: 700,
                background: viewMode === "grid" ? "var(--bg-surface-elevated)" : "transparent",
                color: viewMode === "grid" ? "#ffffff" : "var(--text-muted)",
              }}
            >
              <LayoutGrid size={15} />
              <span>Grid View</span>
            </button>
          </div>

          {/* Sort Tabs */}
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
                padding: "8px 14px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                fontWeight: 600,
                background: activeTab === "trending" ? "var(--bg-surface-elevated)" : "transparent",
                color: activeTab === "trending" ? "var(--solana-green)" : "var(--text-muted)",
              }}
            >
              <Flame size={14} />
              Trending
            </button>

            <button
              onClick={() => setActiveTab("mostLiked")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                fontWeight: 600,
                background: activeTab === "mostLiked" ? "var(--bg-surface-elevated)" : "transparent",
                color: activeTab === "mostLiked" ? "#f43f5e" : "var(--text-muted)",
              }}
            >
              <Heart size={14} fill={activeTab === "mostLiked" ? "#f43f5e" : "none"} />
              Most Liked
            </button>

            <button
              onClick={() => setActiveTab("marketCap")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
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
                padding: "8px 14px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
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
                padding: "8px 14px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                fontWeight: 600,
                background: activeTab === "graduated" ? "var(--bg-surface-elevated)" : "transparent",
                color: activeTab === "graduated" ? "#10b981" : "var(--text-muted)",
              }}
            >
              <GraduationCap size={14} />
              Graduated (Raydium)
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div
          style={{
            position: "relative",
            minWidth: "260px",
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

      {/* Main Content: TikTok Video Scroll OR Card Grid */}
      {sortedTokens.length > 0 ? (
        viewMode === "video" ? (
          <VideoSwipeFeed
            tokens={sortedTokens}
            onSelectToken={onSelectToken}
            onTradeExecuted={onTradeExecuted}
            onUpdateToken={onUpdateToken}
          />
        ) : (
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
        )
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
          <p>
            {searchQuery
              ? `No tokens found matching "${searchQuery}"`
              : "No tokens launched yet. Click 'Launch Coin' above to deploy the first token."}
          </p>
        </div>
      )}
    </div>
  );
};
