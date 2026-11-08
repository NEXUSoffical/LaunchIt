import React, { useState, useRef, useEffect } from "react";
import { Token, Trade } from "../types";
import { useWallet } from "../context/WalletContext";
import { ClientCurve } from "../utils/curve";
import { executeTradeOnChain } from "../services/solanaOnChain";
import { VideoEmbedCard } from "./VideoEmbedCard";
import {
  ChevronUp,
  ChevronDown,
  Zap,
  BarChart3,
  ExternalLink,
  Copy,
  Flame,
  MessageSquare,
  Crown,
  Rocket,
  Check,
} from "lucide-react";

interface VideoSwipeFeedProps {
  tokens: Token[];
  onSelectToken: (token: Token) => void;
  onTradeExecuted: (trade: Trade, updatedToken: Token) => void;
  onUpdateToken: (updatedToken: Token) => void;
}

const SlideTradePanel: React.FC<{
  token: Token;
  index: number;
  total: number;
  onSelectToken: (token: Token) => void;
  onTradeExecuted: (trade: Trade, updatedToken: Token) => void;
  onScrollPrev: () => void;
  onScrollNext: () => void;
}> = ({
  token,
  index,
  total,
  onSelectToken,
  onTradeExecuted,
  onScrollPrev,
  onScrollNext,
}) => {
  const {
    connected,
    publicKey,
    balance,
    network,
    userTokens,
    connect,
    executeTradeAssets,
    notifyTx,
  } = useWallet();

  const [isBuy, setIsBuy] = useState(true);
  const [amountStr, setAmountStr] = useState("0.1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const amount = parseFloat(amountStr) || 0;
  const userTokenBal = userTokens[token.mint] || 0;
  const isTokenGraduated =
    token.isGraduated ||
    (token.progressPercent !== undefined && token.progressPercent >= 100) ||
    token.realTokenReserves <= 0;

  const currentSolReserves =
    typeof token.realSolReserves === "number" && !isNaN(token.realSolReserves)
      ? token.realSolReserves
      : 0;
  const currentTokenReserves =
    typeof token.realTokenReserves === "number" && !isNaN(token.realTokenReserves)
      ? token.realTokenReserves
      : 800_000_000;

  const buyQuote = ClientCurve.calculateBuyQuote(
    amount,
    currentSolReserves,
    currentTokenReserves,
    isTokenGraduated
  );
  const sellQuote = ClientCurve.calculateSellQuote(
    amount,
    currentSolReserves,
    currentTokenReserves,
    isTokenGraduated
  );

  const executeQuickTrade = async (overrideAmount?: number) => {
    const tradeAmount = overrideAmount !== undefined ? overrideAmount : amount;
    if (overrideAmount !== undefined) {
      setAmountStr(overrideAmount.toString());
    }

    if (!connected) {
      connect();
      return;
    }
    if (tradeAmount <= 0 || isSubmitting) return;

    const activeBuyQuote = ClientCurve.calculateBuyQuote(
      tradeAmount,
      currentSolReserves,
      currentTokenReserves,
      isTokenGraduated
    );
    const activeSellQuote = ClientCurve.calculateSellQuote(
      tradeAmount,
      currentSolReserves,
      currentTokenReserves,
      isTokenGraduated
    );

    if (isBuy && tradeAmount > balance) {
      alert(`Insufficient SOL balance (You have ${balance.toFixed(3)} SOL).`);
      return;
    }
    if (!isBuy && tradeAmount > userTokenBal) {
      alert(`Insufficient $${token.symbol} balance.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const solTraded = isBuy ? tradeAmount : activeSellQuote.solOut || 0;
      const tokensTraded = isBuy ? Math.round(activeBuyQuote.tokensOut || 0) : tradeAmount;
      const launcherDelta = solTraded * 0.005; // 0.5% Coin Launcher Royalty + 0.5% Platform Treasury (1% total)

      const { txSignature } = await executeTradeOnChain({
        network,
        mode: isBuy ? "buy" : "sell",
        mintAddress: token.mint,
        symbol: token.symbol,
        solAmount: solTraded,
        tokenAmount: tokensTraded,
        launcherWallet: token.launcherWallet,
        creatorWallet: token.creatorWallet,
      });

      executeTradeAssets({
        solDelta: isBuy ? -tradeAmount : solTraded,
        mint: token.mint,
        tokenDelta: isBuy ? tokensTraded : -tradeAmount,
      });

      const newSolReserves = isBuy
        ? currentSolReserves + tradeAmount * 0.99
        : Math.max(0, currentSolReserves - solTraded);
      const newTokenReserves = isBuy
        ? Math.max(0, currentTokenReserves - tokensTraded)
        : currentTokenReserves + tradeAmount;

      const newProgress = ClientCurve.getProgress(newSolReserves);
      const currentPrice = token.priceSol || 0.00000003;
      const step = Math.min(0.35, Math.max(0.025, (solTraded / 10.0) * 0.12 + 0.03));
      const newSpotPrice = isBuy
        ? currentPrice * (1 + step)
        : Math.max(0.00000001, currentPrice * (1 - step * 0.8));
      const newMarketCapSol = newSpotPrice * 1_000_000_000;

      const justGraduated = !token.isGraduated && newProgress >= 100;
      const graduationBonusSol = justGraduated ? 0.5 : 0;

      const updatedToken: Token = {
        ...token,
        priceSol: newSpotPrice,
        marketCapSol: newMarketCapSol,
        marketCapUsd: newMarketCapSol * 150,
        realSolReserves: newSolReserves,
        realTokenReserves: newTokenReserves,
        progressPercent: newProgress,
        volume24hSol: token.volume24hSol + solTraded,
        isGraduated: token.isGraduated || newProgress >= 100,
        feeSplit: "split_50_50",
        unclaimedLauncherFeesSol: (token.unclaimedLauncherFeesSol || 0) + launcherDelta + graduationBonusSol,
      };

      const newTrade: Trade = {
        id: `trade-${Date.now()}`,
        mint: token.mint,
        user: publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : "Trader",
        isBuy,
        solAmount: solTraded,
        tokenAmount: tokensTraded,
        priceSol: newSpotPrice,
        timestamp: Date.now(),
        txHash: txSignature,
      };

      onTradeExecuted(newTrade, updatedToken);
      notifyTx(
        txSignature,
        `${isBuy ? "BOUGHT" : "SOLD"} ${(tokensTraded / 1_000_000).toFixed(2)}M $${token.symbol} (${solTraded.toFixed(3)} SOL)`
      );
    } catch (err: any) {
      alert(err?.message || "Transaction cancelled or failed in wallet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: "22px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "16px",
        border: "1px solid rgba(255, 96, 0, 0.3)",
        background:
          "linear-gradient(165deg, rgba(22, 25, 36, 0.95) 0%, rgba(12, 14, 22, 0.98) 100%)",
        height: "100%",
      }}
    >
      {/* Top: Token Identity + Slide Counter */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src={token.image || "/logo.jpg"}
              alt={token.name}
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                objectFit: "cover",
                border: "2px solid #ff6000",
              }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span
                  className="mono"
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 900,
                    color: "#ff8c37",
                  }}
                >
                  ${token.symbol}
                </span>
                <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#ffffff" }}>
                  {token.name}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "0.76rem",
                  color: "var(--text-muted)",
                  marginTop: "3px",
                }}
              >
                {token.creatorHandle && (
                  <span style={{ color: "var(--solana-cyan)", fontWeight: 600 }}>
                    Creator: {token.creatorHandle.startsWith("@") ? token.creatorHandle : `@${token.creatorHandle}`}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(token.mint);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  style={{
                    background: "transparent",
                    color: "var(--text-muted)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.74rem",
                    cursor: "pointer",
                  }}
                >
                  <span className="mono">
                    {token.mint.slice(0, 5)}...{token.mint.slice(-4)}
                  </span>
                  {copied ? <Check size={12} color="var(--solana-green)" /> : <Copy size={12} />}
                </button>
                <a
                  href={`https://solscan.io/account/${encodeURIComponent(token.mint)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--solana-green)", display: "inline-flex", alignItems: "center" }}
                  title="View on Solscan"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>

          {/* Up / Down Video Flipper Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              className="mono"
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                padding: "4px 8px",
                borderRadius: "6px",
                background: "var(--bg-surface)",
              }}
            >
              {index + 1} / {total}
            </span>
            <button
              type="button"
              onClick={onScrollPrev}
              disabled={index === 0}
              className="btn-secondary"
              style={{
                padding: "6px",
                borderRadius: "8px",
                opacity: index === 0 ? 0.35 : 1,
              }}
              title="Previous Video (Up Arrow)"
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              onClick={onScrollNext}
              disabled={index >= total - 1}
              className="btn-secondary"
              style={{
                padding: "6px",
                borderRadius: "8px",
                opacity: index >= total - 1 ? 0.35 : 1,
              }}
              title="Next Video (Down Arrow)"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {token.description && (
          <p
            style={{
              fontSize: "0.84rem",
              color: "var(--text-secondary)",
              lineHeight: 1.45,
              marginBottom: "14px",
            }}
          >
            {token.description}
          </p>
        )}

        {/* Live Market Metrics Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>MARKET CAP</div>
            <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--solana-green)" }}>
              ${token.marketCapUsd >= 1000 ? `${(token.marketCapUsd / 1000).toFixed(1)}K` : token.marketCapUsd.toFixed(0)}
            </div>
            <div className="mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              {token.marketCapSol.toFixed(1)} SOL
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-surface)",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>PRICE</div>
            <div className="mono" style={{ fontSize: "0.9rem", fontWeight: 800, color: "#ffffff" }}>
              {token.priceSol.toFixed(8)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>SOL / token</div>
          </div>

          <div
            style={{
              background: "var(--bg-surface)",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>24H VOLUME</div>
            <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ff8c37" }}>
              {token.volume24hSol.toFixed(2)} SOL
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              ❤️ {token.likes?.length || 0} • 💬 {token.repliesCount || 0}
            </div>
          </div>
        </div>

        {/* Bonding Curve Progress Bar */}
        <div
          style={{
            background: "var(--bg-surface)",
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.74rem",
              marginBottom: "6px",
            }}
          >
            <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
              Bonding Curve Progress (85 SOL to Raydium)
            </span>
            <span className="mono" style={{ color: "var(--solana-green)", fontWeight: 700 }}>
              {Math.min(100, token.progressPercent).toFixed(1)}%
            </span>
          </div>
          <div
            style={{
              height: "7px",
              background: "rgba(255,255,255,0.07)",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(2, token.progressPercent))}%`,
                height: "100%",
                background: "linear-gradient(90deg, #ff6000, #14f195)",
                borderRadius: "999px",
              }}
            />
          </div>
        </div>
      </div>

      {/* Middle: Instant On-Chain Buy / Sell Widget */}
      <div
        style={{
          background: "rgba(10, 12, 18, 0.85)",
          border: "1px solid rgba(255, 96, 0, 0.25)",
          borderRadius: "14px",
          padding: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => {
                setIsBuy(true);
                setAmountStr("0.1");
              }}
              style={{
                padding: "6px 16px",
                borderRadius: "8px",
                fontWeight: 800,
                fontSize: "0.8rem",
                background: isBuy ? "var(--solana-green)" : "var(--bg-surface)",
                color: isBuy ? "#05070e" : "var(--text-muted)",
              }}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => {
                setIsBuy(false);
                setAmountStr(userTokenBal > 0 ? String(Math.floor(userTokenBal / 2)) : "100000");
              }}
              style={{
                padding: "6px 16px",
                borderRadius: "8px",
                fontWeight: 800,
                fontSize: "0.8rem",
                background: !isBuy ? "var(--solana-red)" : "var(--bg-surface)",
                color: !isBuy ? "#ffffff" : "var(--text-muted)",
              }}
            >
              SELL
            </button>
          </div>

          <div className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {isBuy
              ? `Wallet: ${balance.toFixed(3)} SOL`
              : `Holdings: ${(userTokenBal / 1_000_000).toFixed(2)}M $${token.symbol}`}
          </div>
        </div>

        {/* 1-Click Instant Buy Buttons */}
        {isBuy && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600 }}>
              ⚡ 1-CLICK INSTANT BUY (WHILE WATCHING):
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
              {[0.05, 0.1, 0.5, 1].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => executeQuickTrade(preset)}
                  style={{
                    padding: "8px 6px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, rgba(20, 241, 149, 0.16), rgba(255, 96, 0, 0.16))",
                    border: "1px solid rgba(20, 241, 149, 0.4)",
                    color: "#ffffff",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "3px",
                  }}
                >
                  <Zap size={12} color="var(--solana-green)" />
                  <span>{preset} SOL</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Amount + Main Action Button */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "8px 12px",
            }}
          >
            <input
              type="number"
              step="any"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#ffffff",
                fontFamily: "var(--font-mono)",
                fontSize: "1rem",
                fontWeight: 700,
              }}
            />
            <span className="mono" style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)" }}>
              {isBuy ? "SOL" : token.symbol}
            </span>
          </div>

          <button
            type="button"
            disabled={isSubmitting || amount <= 0}
            onClick={() => executeQuickTrade()}
            style={{
              padding: "0 20px",
              borderRadius: "10px",
              fontWeight: 800,
              fontSize: "0.9rem",
              background: isBuy
                ? "linear-gradient(135deg, #14f195 0%, #0ea5e9 100%)"
                : "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
              color: isBuy ? "#05070e" : "#ffffff",
              cursor: isSubmitting ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
            }}
          >
            <Zap size={15} />
            <span>
              {isSubmitting
                ? "Signing..."
                : isBuy
                ? `Buy $${token.symbol}`
                : `Sell $${token.symbol}`}
            </span>
          </button>
        </div>

        {/* Quote Summary */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.74rem",
            color: "var(--text-muted)",
          }}
        >
          <span>
            Est. Receive:{" "}
            <b className="mono" style={{ color: "var(--solana-green)" }}>
              {isBuy
                ? `${((buyQuote.tokensOut || 0) / 1_000_000).toFixed(2)}M $${token.symbol}`
                : `${(sellQuote.solOut || 0).toFixed(4)} SOL`}
            </b>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#ff8c37", fontWeight: 700 }}>
              <Rocket size={11} style={{ display: "inline", marginRight: "3px" }} />
              0.5% Launcher Royalty
            </span>
            <span style={{ color: "var(--solana-green)" }}>• 0.5% Platform</span>
          </span>
        </div>
      </div>

      {/* Bottom: Open Full Chart & Community Hub */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          onClick={() => onSelectToken(token)}
          className="btn-secondary"
          style={{
            flex: 1,
            padding: "11px 16px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "0.84rem",
            fontWeight: 700,
            border: "1px solid rgba(255, 96, 0, 0.35)",
            color: "#ffffff",
          }}
        >
          <BarChart3 size={16} color="#ff8c37" />
          <span>Open Full Chart, Theses & Live Chat</span>
        </button>
      </div>
    </div>
  );
};

export const VideoSwipeFeed: React.FC<VideoSwipeFeedProps> = ({
  tokens,
  onSelectToken,
  onTradeExecuted,
  onUpdateToken,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToSlide = (targetIdx: number) => {
    const container = containerRef.current;
    if (!container) return;
    const clamped = Math.max(0, Math.min(tokens.length - 1, targetIdx));
    const slideEl = container.children[clamped] as HTMLElement | undefined;
    if (slideEl) {
      slideEl.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveIndex(clamped);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        scrollToSlide(activeIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        scrollToSlide(activeIndex - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, tokens.length]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container || container.clientHeight === 0) return;
    const idx = Math.round(container.scrollTop / container.clientHeight);
    if (idx !== activeIndex && idx >= 0 && idx < tokens.length) {
      setActiveIndex(idx);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: "calc(100vh - 175px)",
          minHeight: "620px",
          maxHeight: "780px",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          paddingRight: "4px",
        }}
      >
        {tokens.map((token, idx) => (
          <div
            key={token.mint}
            style={{
              scrollSnapAlign: "start",
              scrollSnapStop: "always",
              minHeight: "100%",
              display: "grid",
              gridTemplateColumns: "minmax(340px, 440px) 1fr",
              gap: "20px",
              alignItems: "stretch",
            }}
          >
            {/* Left: Playable Vertical Video Card */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <VideoEmbedCard token={token} onUpdateToken={onUpdateToken} />
            </div>

            {/* Right: Instant Buy/Sell & Live Metrics */}
            <SlideTradePanel
              token={token}
              index={idx}
              total={tokens.length}
              onSelectToken={onSelectToken}
              onTradeExecuted={onTradeExecuted}
              onScrollPrev={() => scrollToSlide(idx - 1)}
              onScrollNext={() => scrollToSlide(idx + 1)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
