import React, { useState } from "react";
import { Token, Trade } from "../types";
import { PriceChart } from "./PriceChart";
import { BondingCurveMeter } from "./BondingCurveMeter";
import { SwapWidget } from "./SwapWidget";
import { TradeHistory } from "./TradeHistory";
import { HolderDistribution } from "./HolderDistribution";
import { ArrowLeft, Copy, ExternalLink, Globe, Twitter, Send, Edit3, Check, X } from "lucide-react";

import { CreatorRoyaltyVault } from "./CreatorRoyaltyVault";
import { CoinCommunityHub } from "./CoinCommunityHub";
import { VideoEmbedCard } from "./VideoEmbedCard";

interface TradingTerminalProps {
  token: Token;
  trades: Trade[];
  onBack: () => void;
  onTradeExecuted: (trade: Trade, updatedToken: Token) => void;
  onUpdateToken?: (updatedToken: Token) => void;
  onOpenExplorer?: (query?: string) => void;
}

export const TradingTerminal: React.FC<TradingTerminalProps> = ({
  token,
  trades = [],
  onBack,
  onTradeExecuted,
  onUpdateToken,
  onOpenExplorer,
}) => {
  if (!token) return null;

  const safeToken: Token = {
    ...token,
    name: token.name,
    symbol: token.symbol,
    image: token.image || "/logo.jpg",
    priceSol: typeof token?.priceSol === "number" && !isNaN(token.priceSol) && token.priceSol > 0 && token.priceSol < 0.05
      ? token.priceSol
      : (token?.isGraduated ? 0.00042 : 0.00003),
    realSolReserves: typeof token?.realSolReserves === "number" && !isNaN(token.realSolReserves) ? token.realSolReserves : 0,
    realTokenReserves: typeof token?.realTokenReserves === "number" && !isNaN(token.realTokenReserves) ? token.realTokenReserves : 800_000_000,
    progressPercent: typeof token?.progressPercent === "number" && !isNaN(token.progressPercent) ? token.progressPercent : 0,
    socials: token?.socials || {},
  };

  const shortMint = safeToken.mint ? `${safeToken.mint.slice(0, 6)}...${safeToken.mint.slice(-6)}` : "";

  const copyToClipboard = (text: string) => {
    if (text) navigator.clipboard.writeText(text);
  };

  const [isEditingSocials, setIsEditingSocials] = useState(false);
  const [twitterInput, setTwitterInput] = useState(safeToken.socials?.twitter || "");
  const [tgInput, setTgInput] = useState(safeToken.socials?.telegram || "");
  const [webInput, setWebInput] = useState(safeToken.socials?.website || "");

  const normalizeSocialUrl = (url: string, prefix: string): string | undefined => {
    const clean = url.trim();
    if (!clean) return undefined;
    if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
    return `${prefix}${clean.replace(/^@/, "")}`;
  };

  const handleSaveSocials = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Token = {
      ...safeToken,
      socials: {
        twitter: normalizeSocialUrl(twitterInput, "https://x.com/"),
        telegram: normalizeSocialUrl(tgInput, "https://t.me/"),
        website: normalizeSocialUrl(webInput, "https://"),
      },
    };
    if (onUpdateToken) {
      onUpdateToken(updated);
    }
    setIsEditingSocials(false);
  };

  const handleVaultUpdate = (updatedToken: Token) => {
    if (onUpdateToken) {
      onUpdateToken(updatedToken);
    } else {
      const dummyTrade: Trade = {
        id: `royalty-${Date.now()}`,
        mint: token.mint,
        user: updatedToken.creatorWallet?.slice(0, 4) || "Creator",
        isBuy: true,
        solAmount: 0,
        tokenAmount: 0,
        priceSol: token.priceSol,
        timestamp: Date.now(),
        txHash: "payout-vault",
      };
      onTradeExecuted(dummyTrade, updatedToken);
    }
  };

  return (
    <div style={{ marginTop: "24px", marginBottom: "60px" }}>
      {/* Back button & Token Banner */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
        <button
          onClick={onBack}
          className="btn-secondary"
          style={{ padding: "8px 14px", borderRadius: "10px" }}
        >
          <ArrowLeft size={16} />
          <span>Back to Feed</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src={safeToken.image}
            alt={safeToken.name}
            style={{ width: "40px", height: "40px", borderRadius: "10px", objectFit: "cover" }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "1.3rem", fontWeight: 800 }}>{safeToken.name}</h1>
              <span className="mono" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--solana-cyan)" }}>
                ${safeToken.symbol}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>Mint:</span>
              <span className="mono" style={{ color: "var(--text-secondary)" }}>{shortMint}</span>
              <button
                onClick={() => copyToClipboard(safeToken.mint)}
                title="Copy Mint Address"
                style={{ background: "transparent", color: "var(--text-muted)", padding: "2px" }}
              >
                <Copy size={12} />
              </button>
              <button
                onClick={() => onOpenExplorer ? onOpenExplorer(safeToken.mint) : window.open(`https://solscan.io/token/${encodeURIComponent(safeToken.mint)}`, "_blank")}
                title="View on Solscan"
                style={{ background: "transparent", border: "none", color: "var(--solana-green)", cursor: "pointer", display: "inline-flex", alignItems: "center", padding: "2px" }}
              >
                <ExternalLink size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Social Links & Edit Button */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {safeToken.socials?.website && (
            <a
              href={safeToken.socials.website}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{
                padding: "6px 12px",
                fontSize: "0.78rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--solana-green)",
                border: "1px solid rgba(20, 241, 149, 0.4)",
                textDecoration: "none",
              }}
              title="Official Website"
            >
              <Globe size={14} color="var(--solana-green)" />
              <span>Website</span>
              <ExternalLink size={11} color="var(--text-muted)" />
            </a>
          )}
          {safeToken.socials?.twitter && (
            <a
              href={safeToken.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{
                padding: "6px 12px",
                fontSize: "0.78rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#1d9bf0",
                border: "1px solid rgba(29, 155, 240, 0.4)",
                textDecoration: "none",
              }}
              title="Official X / Twitter"
            >
              <Twitter size={14} color="#1d9bf0" />
              <span>𝕏 Twitter</span>
              <ExternalLink size={11} color="var(--text-muted)" />
            </a>
          )}
          {safeToken.socials?.telegram && (
            <a
              href={safeToken.socials.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{
                padding: "6px 12px",
                fontSize: "0.78rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#0088cc",
                border: "1px solid rgba(0, 136, 204, 0.4)",
                textDecoration: "none",
              }}
              title="Official Telegram"
            >
              <Send size={14} color="#0088cc" />
              <span>Telegram</span>
              <ExternalLink size={11} color="var(--text-muted)" />
            </a>
          )}

          {onUpdateToken && (
            <button
              type="button"
              onClick={() => {
                setTwitterInput(safeToken.socials?.twitter || "");
                setTgInput(safeToken.socials?.telegram || "");
                setWebInput(safeToken.socials?.website || "");
                setIsEditingSocials(!isEditingSocials);
              }}
              className="btn-secondary"
              style={{
                padding: "6px 10px",
                fontSize: "0.74rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                color: "#ff8c37",
                border: "1px solid rgba(255, 140, 55, 0.4)",
              }}
              title="Add or Edit Community Social Links"
            >
              <Edit3 size={12} color="#ff8c37" />
              <span>{isEditingSocials ? "Cancel" : "+ Edit Links"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Social Editor Panel */}
      {isEditingSocials && (
        <form
          onSubmit={handleSaveSocials}
          style={{
            background: "linear-gradient(180deg, rgba(22, 25, 36, 0.98), rgba(14, 17, 26, 0.98))",
            border: "1px solid rgba(255, 140, 55, 0.45)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>
              Update Official Social Links for ${safeToken.symbol}
            </span>
            <button
              type="button"
              onClick={() => setIsEditingSocials(false)}
              style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "8px 12px" }}>
              <Twitter size={15} color="#1d9bf0" />
              <input
                type="text"
                placeholder="𝕏 / Twitter (e.g. @handle or https://x.com/...)"
                value={twitterInput}
                onChange={(e) => setTwitterInput(e.target.value)}
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "0.82rem" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "8px 12px" }}>
              <Send size={15} color="#0088cc" />
              <input
                type="text"
                placeholder="Telegram (e.g. @group or https://t.me/...)"
                value={tgInput}
                onChange={(e) => setTgInput(e.target.value)}
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "0.82rem" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "8px 12px" }}>
              <Globe size={15} color="var(--solana-green)" />
              <input
                type="text"
                placeholder="Website (e.g. https://yourcoin.com)"
                value={webInput}
                onChange={(e) => setWebInput(e.target.value)}
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "0.82rem" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setIsEditingSocials(false)}
              className="btn-secondary"
              style={{ padding: "6px 14px", fontSize: "0.78rem" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: "6px 16px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <Check size={14} />
              <span>Save & Link Socials</span>
            </button>
          </div>
        </form>
      )}

      {/* Creator Royalty Escrow Vault */}
      <div style={{ marginBottom: "20px" }}>
        <CreatorRoyaltyVault token={safeToken} onUpdateToken={handleVaultUpdate} />
      </div>

      {/* Main Grid: Left = Chart + Trades, Right = Swap + Progress */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.8fr 1fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <PriceChart token={safeToken} trades={trades.filter((t) => t.mint === safeToken.mint)} />
          <CoinCommunityHub token={safeToken} />
          <TradeHistory trades={trades.filter((t) => t.mint === safeToken.mint)} tokenSymbol={safeToken.symbol} />
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <SwapWidget token={safeToken} onTradeExecuted={onTradeExecuted} />
          <VideoEmbedCard token={safeToken} onUpdateToken={handleVaultUpdate} />
          <BondingCurveMeter token={safeToken} />
          <HolderDistribution token={safeToken} />
        </div>
      </div>
    </div>
  );
};
