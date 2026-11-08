import React, { useState, useRef, useEffect } from "react";
import { Token, Trade } from "../types";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import { ClientCurve } from "../utils/curve";
import { executeTradeOnChain } from "../services/solanaOnChain";
import { VideoEmbedCard, setGlobalSound, getGlobalSound } from "./VideoEmbedCard";
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
  UserPlus,
  UserCheck,
  Volume2,
  VolumeX,
  Globe,
  Send,
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
  const { currentUser, toggleFollowUser, isFollowingUser, creditReferralReward } = useAuth();

  const rawCreator = token.creatorHandle || token.creator || token.launcherHandle || "";
  const cleanCreator = rawCreator.replace(/^@/, "").trim();
  const isSelf = currentUser && cleanCreator.toLowerCase() === currentUser.username.toLowerCase();
  const isFollowing = cleanCreator ? isFollowingUser(cleanCreator) : false;

  const getReferrerWallet = (): string | null => {
    if (!currentUser?.referredBy) return null;
    const ref = currentUser.referredBy.trim().replace(/^@/, "").toLowerCase();
    if (ref.length >= 32 && ref.length <= 44) return ref;
    try {
      const raw = localStorage.getItem("launchit_wallet_accounts");
      if (raw) {
        const db = JSON.parse(raw);
        for (const w in db) {
          const u = db[w];
          if (u.username?.toLowerCase() === ref || u.referralCode?.toLowerCase() === ref) {
            return u.solanaWallet || w;
          }
        }
      }
    } catch (_) {}
    return null;
  };

  const [isBuy, setIsBuy] = useState(true);
  const [amountStr, setAmountStr] = useState("0.01");
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
        referrerWallet: getReferrerWallet(),
      });

      if (currentUser?.referredBy) {
        creditReferralReward(currentUser.referredBy, solTraded * 0.005 * 0.20);
      }

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
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "12px",
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
            marginBottom: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src={token.image || "/logo.jpg"}
              alt={token.name}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                objectFit: "cover",
                border: "2px solid #ff6000",
              }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span
                  className="mono"
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 900,
                    color: "#ff8c37",
                  }}
                >
                  ${token.symbol}
                </span>
                <span style={{ fontSize: "1rem", fontWeight: 800, color: "#ffffff" }}>
                  {token.name}
                </span>
                {(token.mint === "4akoUeUJcay3tQUc3BJbqGtaCwPanZ12xm7dLaunchit" ||
                  token.symbol.trim().toUpperCase() === "LAUNCHIT") && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      background: "linear-gradient(135deg, rgba(255, 96, 0, 0.25), rgba(245, 158, 11, 0.25))",
                      border: "1px solid #f59e0b",
                      color: "#fbbf24",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                    }}
                  >
                    <Crown size={11} />
                    <span>OFFICIAL PINNED #1</span>
                  </span>
                )}
                {token.creatorHandle && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--solana-cyan)", fontWeight: 600 }}>
                      • {token.creatorHandle.startsWith("@") ? token.creatorHandle : `@${token.creatorHandle}`}
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
                          border: isFollowing ? "1px solid rgba(20, 241, 149, 0.4)" : "1px solid rgba(255, 255, 255, 0.15)",
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
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "6px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(token.mint);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  title="Click to copy full Contract Address"
                  style={{
                    background: "rgba(20, 241, 149, 0.1)",
                    border: "1px solid rgba(20, 241, 149, 0.45)",
                    borderRadius: "6px",
                    padding: "3px 8px",
                    color: "var(--solana-green)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ color: "#ff8c37", fontWeight: 800 }}>CA:</span>
                  <span className="mono">{token.mint}</span>
                  {copied ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "#14f195" }}>
                      <Check size={12} /> Copied!
                    </span>
                  ) : (
                    <Copy size={12} color="#94a3b8" />
                  )}
                </button>
                <a
                  href={`https://solscan.io/account/${encodeURIComponent(token.launcherWallet || token.mint)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--solana-green)", display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.72rem", textDecoration: "none" }}
                  title="View On-Chain Ledger on Solscan"
                >
                  <span>Solscan</span>
                  <ExternalLink size={11} />
                </a>

                {/* Clickable Socials: X, Telegram, Website */}
                {token.socials?.twitter && (
                  <a
                    href={token.socials.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "rgba(29, 155, 240, 0.15)",
                      border: "1px solid rgba(29, 155, 240, 0.45)",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      color: "#1d9bf0",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                    title="Open official X (Twitter)"
                  >
                    <span>𝕏</span>
                    <ExternalLink size={10} />
                  </a>
                )}
                {token.socials?.telegram && (
                  <a
                    href={token.socials.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "rgba(0, 136, 204, 0.15)",
                      border: "1px solid rgba(0, 136, 204, 0.45)",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      color: "#0088cc",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                    title="Open official Telegram"
                  >
                    <Send size={11} />
                    <span>Telegram</span>
                    <ExternalLink size={10} />
                  </a>
                )}
                {token.socials?.website && (
                  <a
                    href={token.socials.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "rgba(20, 241, 149, 0.12)",
                      border: "1px solid rgba(20, 241, 149, 0.4)",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      color: "var(--solana-green)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                    title="Open official Website"
                  >
                    <Globe size={11} />
                    <span>Website</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Up / Down Video Flipper Controls + Quick Open Chart Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={() => onSelectToken(token)}
              className="btn-secondary"
              style={{
                padding: "5px 10px",
                borderRadius: "8px",
                fontSize: "0.75rem",
                fontWeight: 800,
                border: "1px solid rgba(255, 96, 0, 0.45)",
                color: "#ff8c37",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                whiteSpace: "nowrap",
              }}
            >
              <BarChart3 size={13} color="#ff8c37" />
              <span>Full Chart</span>
            </button>
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

        {token.description && !token.description.startsWith("http") && (
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              lineHeight: 1.35,
              marginBottom: "10px",
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
              ⚡ 1-CLICK INSTANT BUY (ANY AMOUNT):
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
              {[0.01, 0.025, 0.05, 0.1, 0.5].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => executeQuickTrade(preset)}
                  style={{
                    padding: "8px 4px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, rgba(20, 241, 149, 0.16), rgba(255, 96, 0, 0.16))",
                    border: "1px solid rgba(20, 241, 149, 0.4)",
                    color: "#ffffff",
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "2px",
                  }}
                >
                  <Zap size={11} color="var(--solana-green)" />
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
  const [globalAudio, setGlobalAudioState] = useState(() => getGlobalSound());

  const handleToggleGlobalAudio = () => {
    const next = !globalAudio;
    setGlobalAudioState(next);
    setGlobalSound(next);
  };

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
    const containerMid = container.getBoundingClientRect().top + container.clientHeight / 2;

    let closestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i] as HTMLElement;
      if (!child) continue;
      const rect = child.getBoundingClientRect();
      const childMid = rect.top + rect.height / 2;
      const dist = Math.abs(containerMid - childMid);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = i;
      }
    }

    if (closestIdx !== activeIndex && closestIdx >= 0 && closestIdx < tokens.length) {
      setActiveIndex(closestIdx);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Global Feed Audio Toggle Pill */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
        <button
          type="button"
          onClick={handleToggleGlobalAudio}
          style={{
            background: globalAudio ? "rgba(20, 241, 149, 0.15)" : "rgba(255, 96, 0, 0.15)",
            border: globalAudio ? "1px solid rgba(20, 241, 149, 0.4)" : "1px solid rgba(255, 96, 0, 0.4)",
            color: globalAudio ? "var(--solana-green)" : "#ff8c37",
            borderRadius: "999px",
            padding: "4px 12px",
            fontSize: "0.74rem",
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          title={globalAudio ? "Global sound is ON for all videos" : "Sound is muted - click to enable audio for all videos"}
        >
          {globalAudio ? <Volume2 size={13} color="var(--solana-green)" /> : <VolumeX size={13} color="#ff8c37" />}
          <span>All Videos Sound: {globalAudio ? "ON 🔊" : "MUTED 🔇"}</span>
        </button>
      </div>

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
              <VideoEmbedCard
                token={token}
                onUpdateToken={onUpdateToken}
                isActive={idx === activeIndex}
              />
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
