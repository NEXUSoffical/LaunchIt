import React from "react";
import { Token, Trade } from "../types";
import { PriceChart } from "./PriceChart";
import { BondingCurveMeter } from "./BondingCurveMeter";
import { SwapWidget } from "./SwapWidget";
import { TradeHistory } from "./TradeHistory";
import { HolderDistribution } from "./HolderDistribution";
import { ArrowLeft, Copy, ExternalLink, Globe, Twitter, Send } from "lucide-react";

interface TradingTerminalProps {
  token: Token;
  trades: Trade[];
  onBack: () => void;
  onTradeExecuted: (trade: Trade, updatedToken: Token) => void;
}

export const TradingTerminal: React.FC<TradingTerminalProps> = ({
  token,
  trades,
  onBack,
  onTradeExecuted,
}) => {
  const shortMint = `${token.mint.slice(0, 6)}...${token.mint.slice(-6)}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
            src={token.image}
            alt={token.name}
            style={{ width: "40px", height: "40px", borderRadius: "10px", objectFit: "cover" }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "1.3rem", fontWeight: 800 }}>{token.name}</h1>
              <span className="mono" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--solana-cyan)" }}>
                ${token.symbol}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>Mint:</span>
              <span className="mono" style={{ color: "var(--text-secondary)" }}>{shortMint}</span>
              <button
                onClick={() => copyToClipboard(token.mint)}
                title="Copy Mint Address"
                style={{ background: "transparent", color: "var(--text-muted)", padding: "2px" }}
              >
                <Copy size={12} />
              </button>
              <a
                href={`https://solscan.io/token/${token.mint}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                title="View on Solscan"
                style={{ color: "var(--solana-cyan)", display: "inline-flex", alignItems: "center" }}
              >
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          {token.socials.website && (
            <a
              href={token.socials.website}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ padding: "6px 10px", fontSize: "0.75rem" }}
            >
              <Globe size={14} />
              <span>Website</span>
            </a>
          )}
          {token.socials.twitter && (
            <a
              href={token.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ padding: "6px 10px", fontSize: "0.75rem" }}
            >
              <Twitter size={14} />
              <span>Twitter</span>
            </a>
          )}
          {token.socials.telegram && (
            <a
              href={token.socials.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ padding: "6px 10px", fontSize: "0.75rem" }}
            >
              <Send size={14} />
              <span>Telegram</span>
            </a>
          )}
        </div>
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
          <PriceChart token={token} />
          <TradeHistory trades={trades.filter((t) => t.mint === token.mint)} tokenSymbol={token.symbol} />
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <SwapWidget token={token} onTradeExecuted={onTradeExecuted} />
          <BondingCurveMeter token={token} />
          <HolderDistribution token={token} />
        </div>
      </div>
    </div>
  );
};
