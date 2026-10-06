import React, { useState, useMemo } from "react";
import { Token, Trade } from "../types";
import { useWallet } from "../context/WalletContext";
import { ClientCurve } from "../utils/curve";
import { ArrowDownUp, Settings, CheckCircle2, AlertCircle, Zap } from "lucide-react";

interface SwapWidgetProps {
  token: Token;
  onTradeExecuted: (trade: Trade, updatedToken: Token) => void;
}

export const SwapWidget: React.FC<SwapWidgetProps> = ({
  token,
  onTradeExecuted,
}) => {
  const { balance, deductSol, addSol, userTokens, updateTokenBalance } = useWallet();

  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [solAmount, setSolAmount] = useState<string>("0.5");
  const [tokenAmount, setTokenAmount] = useState<string>("5000000");
  const [slippage, setSlippage] = useState<number>(1.0); // 1%
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);

  const userTokenBalance = userTokens[token.mint] || 0;

  // Real-time quote calculations
  const buyQuote = useMemo(() => {
    const val = parseFloat(solAmount) || 0;
    return ClientCurve.calculateBuyQuote(val, token.realSolReserves, token.realTokenReserves);
  }, [solAmount, token.realSolReserves, token.realTokenReserves]);

  const sellQuote = useMemo(() => {
    const val = parseFloat(tokenAmount) || 0;
    return ClientCurve.calculateSellQuote(val, token.realSolReserves, token.realTokenReserves);
  }, [tokenAmount, token.realSolReserves, token.realTokenReserves]);

  const handleSwap = async () => {
    setStatusMsg(null);
    setIsSwapping(true);

    try {
      if (mode === "buy") {
        const val = parseFloat(solAmount);
        if (isNaN(val) || val <= 0) {
          setStatusMsg({ type: "error", text: "Please enter a valid SOL amount" });
          setIsSwapping(false);
          return;
        }

        if (val > balance) {
          setStatusMsg({ type: "error", text: "Insufficient SOL balance" });
          setIsSwapping(false);
          return;
        }

        // Deduct SOL and update balances
        deductSol(val);
        const tokensReceived = Math.round(buyQuote.tokensOut || 0);
        updateTokenBalance(token.mint, tokensReceived);

        // Update Token bonding curve state
        const newRealSol = token.realSolReserves + (val * 0.99);
        const newRealTokens = Math.max(0, token.realTokenReserves - tokensReceived);
        const newProgress = ClientCurve.getProgress(newRealSol);
        const mc = ClientCurve.getMarketCap(newRealSol, newRealTokens);

        const updatedToken: Token = {
          ...token,
          realSolReserves: newRealSol,
          realTokenReserves: newRealTokens,
          progressPercent: newProgress,
          marketCapSol: mc.sol,
          marketCapUsd: mc.usd,
          volume24hSol: token.volume24hSol + val,
          isGraduated: newProgress >= 100,
        };

        const newTrade: Trade = {
          id: `tx-${Date.now()}`,
          mint: token.mint,
          user: "You (Sol9...8jE1)",
          isBuy: true,
          solAmount: val,
          tokenAmount: tokensReceived,
          priceSol: buyQuote.pricePerTokenSol,
          timestamp: Date.now(),
          txHash: `${Math.random().toString(36).substring(2, 6)}...${Math.random().toString(36).substring(2, 6)}`,
        };

        onTradeExecuted(newTrade, updatedToken);
        setStatusMsg({
          type: "success",
          text: `Successfully bought ${(tokensReceived / 1e6).toFixed(2)}M $${token.symbol}!`,
        });
      } else {
        // Sell
        const val = parseFloat(tokenAmount);
        if (isNaN(val) || val <= 0) {
          setStatusMsg({ type: "error", text: "Please enter a valid token amount" });
          setIsSwapping(false);
          return;
        }

        if (val > userTokenBalance) {
          setStatusMsg({ type: "error", text: `Insufficient $${token.symbol} balance` });
          setIsSwapping(false);
          return;
        }

        const solReceived = sellQuote.solOut || 0;
        updateTokenBalance(token.mint, -val);
        addSol(solReceived);

        const newRealSol = Math.max(0, token.realSolReserves - solReceived);
        const newRealTokens = token.realTokenReserves + val;
        const newProgress = ClientCurve.getProgress(newRealSol);
        const mc = ClientCurve.getMarketCap(newRealSol, newRealTokens);

        const updatedToken: Token = {
          ...token,
          realSolReserves: newRealSol,
          realTokenReserves: newRealTokens,
          progressPercent: newProgress,
          marketCapSol: mc.sol,
          marketCapUsd: mc.usd,
          volume24hSol: token.volume24hSol + solReceived,
        };

        const newTrade: Trade = {
          id: `tx-${Date.now()}`,
          mint: token.mint,
          user: "You (Sol9...8jE1)",
          isBuy: false,
          solAmount: solReceived,
          tokenAmount: val,
          priceSol: sellQuote.pricePerTokenSol,
          timestamp: Date.now(),
          txHash: `${Math.random().toString(36).substring(2, 6)}...${Math.random().toString(36).substring(2, 6)}`,
        };

        onTradeExecuted(newTrade, updatedToken);
        setStatusMsg({
          type: "success",
          text: `Successfully sold ${(val / 1e6).toFixed(2)}M $${token.symbol} for ${solReceived.toFixed(3)} SOL!`,
        });
      }
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div
      className="glass-panel-elevated"
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Top Header: Buy/Sell Switcher & Slippage icon */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-md)",
            padding: "4px",
            border: "1px solid var(--border-subtle)",
            width: "180px",
          }}
        >
          <button
            onClick={() => setMode("buy")}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              background: mode === "buy" ? "#10b981" : "transparent",
              color: mode === "buy" ? "#ffffff" : "var(--text-muted)",
            }}
          >
            BUY
          </button>
          <button
            onClick={() => setMode("sell")}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              background: mode === "sell" ? "#ef4444" : "transparent",
              color: mode === "sell" ? "#ffffff" : "var(--text-muted)",
            }}
          >
            SELL
          </button>
        </div>

        {/* Slippage Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="btn-secondary"
          style={{ padding: "8px 12px", fontSize: "0.8rem", borderRadius: "8px" }}
        >
          <Settings size={14} />
          <span>{slippage}%</span>
        </button>
      </div>

      {/* Slippage Settings Drawer */}
      {showSettings && (
        <div
          style={{
            padding: "12px",
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            fontSize: "0.8rem",
          }}
        >
          <div style={{ color: "var(--text-secondary)", marginBottom: "8px" }}>Slippage Tolerance:</div>
          <div style={{ display: "flex", gap: "8px" }}>
            {[0.5, 1.0, 3.0, 5.0].map((s) => (
              <button
                key={s}
                onClick={() => setSlippage(s)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background: slippage === s ? "var(--solana-purple)" : "var(--bg-surface-elevated)",
                  color: "#ffffff",
                }}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Module */}
      {mode === "buy" ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>
            <span>You Pay (SOL)</span>
            <span>Balance: <b style={{ color: "var(--text-primary)" }}>{balance.toFixed(2)} SOL</b></span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              padding: "10px 14px",
            }}
          >
            <input
              type="number"
              step="0.1"
              min="0"
              value={solAmount}
              onChange={(e) => setSolAmount(e.target.value)}
              placeholder="0.0"
              className="mono"
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: "1.2rem",
                fontWeight: 700,
                width: "100%",
              }}
            />
            <span className="mono" style={{ fontWeight: 700, color: "var(--solana-green)" }}>SOL</span>
          </div>

          {/* Quick SOL chips */}
          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
            {["0.1", "0.5", "1.0", "5.0"].map((amt) => (
              <button
                key={amt}
                onClick={() => setSolAmount(amt)}
                style={{
                  flex: 1,
                  padding: "4px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  background: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {amt} SOL
              </button>
            ))}
            <button
              onClick={() => setSolAmount((balance * 0.95).toFixed(2))}
              style={{
                flex: 1,
                padding: "4px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                background: "var(--bg-surface)",
                color: "var(--solana-cyan)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              MAX
            </button>
          </div>

          {/* Output estimate */}
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(255, 255, 255, 0.04)",
              fontSize: "0.82rem",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>You Receive Approx:</span>
              <span className="mono" style={{ fontWeight: 700, color: "var(--solana-cyan)" }}>
                {buyQuote.tokensOut ? `${(buyQuote.tokensOut / 1e6).toFixed(2)}M $${token.symbol}` : "0"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Price Impact:</span>
              <span className="mono" style={{ color: buyQuote.priceImpact > 5 ? "var(--solana-red)" : "var(--solana-green)" }}>
                {buyQuote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Protocol Fee (1%):</span>
              <span className="mono" style={{ color: "var(--text-muted)" }}>
                {buyQuote.feeSol.toFixed(4)} SOL
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* SELL MODULE */
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>
            <span>You Sell (${token.symbol})</span>
            <span>Balance: <b style={{ color: "var(--text-primary)" }}>{(userTokenBalance / 1e6).toFixed(2)}M</b></span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              padding: "10px 14px",
            }}
          >
            <input
              type="number"
              step="100000"
              min="0"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              placeholder="0"
              className="mono"
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: "1.2rem",
                fontWeight: 700,
                width: "100%",
              }}
            />
            <span className="mono" style={{ fontWeight: 700, color: "var(--solana-purple)" }}>{token.symbol}</span>
          </div>

          {/* Quick percentage chips */}
          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => setTokenAmount((userTokenBalance * (pct / 100)).toFixed(0))}
                style={{
                  flex: 1,
                  padding: "4px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  background: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Output estimate */}
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(255, 255, 255, 0.04)",
              fontSize: "0.82rem",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>You Receive Approx:</span>
              <span className="mono" style={{ fontWeight: 700, color: "var(--solana-green)" }}>
                {sellQuote.solOut ? `${sellQuote.solOut.toFixed(3)} SOL` : "0 SOL"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Price Impact:</span>
              <span className="mono" style={{ color: sellQuote.priceImpact > 5 ? "var(--solana-red)" : "var(--solana-green)" }}>
                {sellQuote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Protocol Fee (1%):</span>
              <span className="mono" style={{ color: "var(--text-muted)" }}>
                {sellQuote.feeSol.toFixed(4)} SOL
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Status feedback */}
      {statusMsg && (
        <div
          style={{
            padding: "10px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: statusMsg.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            color: statusMsg.type === "success" ? "#10b981" : "#ef4444",
            border: `1px solid ${statusMsg.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
          }}
        >
          {statusMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleSwap}
        disabled={isSwapping}
        className={mode === "buy" ? "btn-buy" : "btn-sell"}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
      >
        <Zap size={18} />
        <span>{isSwapping ? "Executing Trade..." : mode === "buy" ? `Buy $${token.symbol}` : `Sell $${token.symbol}`}</span>
      </button>
    </div>
  );
};
