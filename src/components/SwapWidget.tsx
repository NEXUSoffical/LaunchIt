import React, { useState, useMemo } from "react";
import { Token, Trade } from "../types";
import { useWallet } from "../context/WalletContext";
import { ClientCurve } from "../utils/curve";
import { executeTradeOnChain } from "../services/solanaOnChain";
import { Settings, CheckCircle2, AlertCircle, Zap } from "lucide-react";

interface SwapWidgetProps {
  token: Token;
  onTradeExecuted: (trade: Trade, updatedToken: Token) => void;
}

export const SwapWidget: React.FC<SwapWidgetProps> = ({
  token,
  onTradeExecuted,
}) => {
  const { balance, network, userTokens, executeTradeAssets, notifyTx, publicKey } = useWallet();

  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [solAmount, setSolAmount] = useState<string>("0.5");
  const [tokenAmount, setTokenAmount] = useState<string>("");
  const [slippage, setSlippage] = useState<number>(1.0); // 1%
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);

  const userTokenBalance = userTokens[token.mint] || 0;
  const isTokenGraduated =
    token.isGraduated ||
    (token.progressPercent !== undefined && token.progressPercent >= 100) ||
    token.realTokenReserves <= 0;

  // Real-time quote calculations in SOL
  const buyQuote = useMemo(() => {
    const solVal = parseFloat(solAmount) || 0;
    return ClientCurve.calculateBuyQuote(
      solVal,
      token.realSolReserves,
      token.realTokenReserves,
      isTokenGraduated
    );
  }, [solAmount, token.realSolReserves, token.realTokenReserves, isTokenGraduated]);

  const sellQuote = useMemo(() => {
    const val = parseFloat(tokenAmount) || 0;
    const baseQuote = ClientCurve.calculateSellQuote(
      val,
      token.realSolReserves,
      token.realTokenReserves,
      isTokenGraduated
    );
    const sellRatio = userTokenBalance > 0 ? Math.min(1.0, val / userTokenBalance) : 0;
    const estSol =
      token.realSolReserves > 0
        ? token.realSolReserves * sellRatio * 0.99
        : baseQuote.solOut || val * (token.priceSol || 0.00000003) * 0.99;

    return {
      ...baseQuote,
      solOut: Math.max(0, estSol),
      priceImpact: Math.min(100, Math.max(0.1, sellRatio * 100)),
    };
  }, [tokenAmount, token.realSolReserves, token.realTokenReserves, isTokenGraduated, userTokenBalance, token.priceSol]);

  const handleSwap = async () => {
    setStatusMsg(null);
    setIsSwapping(true);

    try {
      const shortTrader = publicKey
        ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
        : "Trader";

      if (mode === "buy") {
        const solVal = parseFloat(solAmount);
        if (isNaN(solVal) || solVal <= 0) {
          setStatusMsg({ type: "error", text: "Please enter a valid SOL amount" });
          setIsSwapping(false);
          return;
        }

        if (solVal > balance) {
          setStatusMsg({
            type: "error",
            text: `Insufficient SOL balance (You have ${balance.toFixed(3)} SOL)`,
          });
          setIsSwapping(false);
          return;
        }

        const tokensReceived = Math.round(buyQuote.tokensOut || 0);

        // Prompt Phantom / Solflare to sign & send the real on-chain Buy transaction
        const { txSignature } = await executeTradeOnChain({
          network,
          mode: "buy",
          mintAddress: token.mint,
          symbol: token.symbol,
          solAmount: solVal,
          tokenAmount: tokensReceived,
          launcherWallet: token.launcherWallet,
          creatorWallet: token.creatorWallet,
        });

        executeTradeAssets({
          solDelta: -solVal,
          mint: token.mint,
          tokenDelta: tokensReceived,
        });

        const isGraduated = isTokenGraduated || token.realSolReserves + solVal * 0.99 >= 85.0;
        const newRealSol = token.realSolReserves + solVal * 0.99;
        const newRealTokens = isGraduated ? 0 : Math.max(0, token.realTokenReserves - tokensReceived);
        const progressPercent = isGraduated ? 100.0 : ClientCurve.getProgress(newRealSol);

        const currentPrice = token.priceSol || 0.000000028;
        const buyStep = Math.min(0.35, Math.max(0.025, (solVal / 10.0) * 0.12 + 0.03));
        const newSpotPrice = currentPrice * (1 + buyStep);
        const mc = { sol: newSpotPrice * 1_000_000_000, usd: newSpotPrice * 1_000_000_000 * 150 };

        const graduationBonusSol = isGraduated && !token.isGraduated ? 0.5 : 0;
        const launcherFeeBuy = solVal * 0.005 + graduationBonusSol; // 0.5% Launcher + 0.5% Platform Treasury (1% total)

        const updatedToken: Token = {
          ...token,
          realSolReserves: newRealSol,
          realTokenReserves: newRealTokens,
          progressPercent,
          isGraduated,
          priceSol: newSpotPrice,
          marketCapSol: mc.sol,
          marketCapUsd: mc.usd,
          volume24hSol: token.volume24hSol + solVal,
          feeSplit: "split_50_50",
          unclaimedLauncherFeesSol: (token.unclaimedLauncherFeesSol || 0) + launcherFeeBuy,
        };

        const newTrade: Trade = {
          id: `tx-${Date.now()}`,
          mint: token.mint,
          user: shortTrader,
          isBuy: true,
          solAmount: solVal,
          tokenAmount: tokensReceived,
          priceSol: newSpotPrice,
          timestamp: Date.now(),
          txHash: txSignature,
        };

        onTradeExecuted(newTrade, updatedToken);
        setSolAmount("");
        notifyTx(
          newTrade.txHash,
          isGraduated && !token.isGraduated
            ? `🎓 GRADUATED TO RAYDIUM DEX! 100% BONDED! BOUGHT ${(tokensReceived / 1e6).toFixed(2)}M $${token.symbol}`
            : `SWAP CONFIRMED: BOUGHT ${(tokensReceived / 1e6).toFixed(2)}M $${token.symbol} for ${solVal.toFixed(3)} SOL`,
          Math.floor(Date.now() / 400) % 100000
        );
        setStatusMsg({
          type: "success",
          text:
            isGraduated && !token.isGraduated
              ? `🎓 GRADUATED! $${token.symbol} reached 85 SOL and migrated liquidity to Raydium DEX!`
              : `Successfully bought ${(tokensReceived / 1e6).toFixed(2)}M $${token.symbol} for ${solVal.toFixed(3)} SOL!`,
        });
      } else {
        // Sell
        const val = parseFloat(tokenAmount);
        if (isNaN(val) || val <= 0) {
          setStatusMsg({ type: "error", text: "Please enter a valid token amount" });
          setIsSwapping(false);
          return;
        }

        if (userTokenBalance <= 0) {
          setStatusMsg({ type: "error", text: `You have 0 $${token.symbol} tokens to sell` });
          setIsSwapping(false);
          return;
        }

        const isSellAll = val >= userTokenBalance * 0.995 || val >= userTokenBalance - 1;
        const actualTokensToSell = isSellAll ? userTokenBalance : Math.min(val, userTokenBalance);
        const sellRatio = isSellAll
          ? 1.0
          : Math.min(1.0, Math.max(0, actualTokensToSell / Math.max(1, userTokenBalance)));

        const baseFloorPrice = 0.000000028;
        const currentPrice = token.priceSol || baseFloorPrice;

        const solReceived = isSellAll
          ? token.realSolReserves > 0
            ? token.realSolReserves
            : sellQuote.solOut || actualTokensToSell * currentPrice * 0.99
          : token.realSolReserves > 0
          ? token.realSolReserves * sellRatio
          : sellQuote.solOut || actualTokensToSell * currentPrice * 0.99;

        // Prompt Phantom / Solflare to sign & send the real on-chain Sell transaction
        const { txSignature } = await executeTradeOnChain({
          network,
          mode: "sell",
          mintAddress: token.mint,
          symbol: token.symbol,
          solAmount: solReceived,
          tokenAmount: actualTokensToSell,
          launcherWallet: token.launcherWallet,
          creatorWallet: token.creatorWallet,
        });

        executeTradeAssets({
          solDelta: solReceived,
          mint: token.mint,
          exactTokens: isSellAll ? 0 : undefined,
          tokenDelta: isSellAll ? undefined : -actualTokensToSell,
        });

        const isAlreadyGraduated = isTokenGraduated;
        const newRealSol = isAlreadyGraduated
          ? isSellAll
            ? 85.0
            : Math.max(85.0, token.realSolReserves - solReceived * 0.5)
          : isSellAll
          ? 0.0
          : Math.max(0, token.realSolReserves * (1 - sellRatio));
        const newRealTokens = isAlreadyGraduated
          ? 0
          : Math.min(800_000_000, token.realTokenReserves + actualTokensToSell);
        const progressPercent = isAlreadyGraduated ? 100.0 : ClientCurve.getProgress(newRealSol);
        const isGraduated = isAlreadyGraduated;

        let newSpotPrice: number;
        if (isSellAll || sellRatio >= 0.999) {
          newSpotPrice = baseFloorPrice;
        } else {
          newSpotPrice = Math.max(baseFloorPrice, currentPrice - (currentPrice - baseFloorPrice) * sellRatio);
        }

        const mc = { sol: newSpotPrice * 1_000_000_000, usd: newSpotPrice * 1_000_000_000 * 150 };

        const launcherFeeSell = solReceived * 0.005; // 0.5% Launcher + 0.5% Platform Treasury (1% total)

        const updatedToken: Token = {
          ...token,
          realSolReserves: newRealSol,
          realTokenReserves: newRealTokens,
          progressPercent,
          isGraduated,
          priceSol: newSpotPrice,
          marketCapSol: mc.sol,
          marketCapUsd: mc.usd,
          volume24hSol: token.volume24hSol + solReceived,
          feeSplit: "split_50_50",
          unclaimedLauncherFeesSol: (token.unclaimedLauncherFeesSol || 0) + launcherFeeSell,
        };

        const newTrade: Trade = {
          id: `tx-${Date.now()}`,
          mint: token.mint,
          user: shortTrader,
          isBuy: false,
          solAmount: solReceived,
          tokenAmount: actualTokensToSell,
          priceSol: newSpotPrice,
          timestamp: Date.now(),
          txHash: txSignature,
        };

        onTradeExecuted(newTrade, updatedToken);
        setTokenAmount("");
        notifyTx(
          newTrade.txHash,
          `SWAP CONFIRMED: SOLD ${(actualTokensToSell / 1e6).toFixed(2)}M $${token.symbol} for ${solReceived.toFixed(4)} SOL`,
          Math.floor(Date.now() / 400) % 100000
        );
        setStatusMsg({
          type: "success",
          text: `Successfully sold ${(actualTokensToSell / 1e6).toFixed(2)}M $${token.symbol} for ${solReceived.toFixed(4)} SOL!`,
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err?.message || "Transaction rejected or failed in wallet.",
      });
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
            <span>
              Balance: <b style={{ color: "var(--text-primary)" }}>{balance.toFixed(3)} SOL</b>
            </span>
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
            <span className="mono" style={{ fontWeight: 800, color: "var(--solana-green)" }}>
              SOL
            </span>
          </div>

          {/* Quick SOL chips */}
          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
            {["0.1", "0.5", "1", "5"].map((amt) => (
              <button
                key={amt}
                onClick={() => setSolAmount(amt)}
                style={{
                  flex: 1,
                  padding: "6px 4px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {amt} SOL
              </button>
            ))}
            <button
              onClick={() => setSolAmount(Math.max(0, Number(balance.toFixed(3))).toString())}
              style={{
                flex: 1,
                padding: "6px 4px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 700,
                background: "rgba(20, 241, 149, 0.1)",
                color: "var(--solana-green)",
                border: "1px solid rgba(20, 241, 149, 0.3)",
              }}
            >
              MAX
            </button>
          </div>

          {/* Output estimate & Royalty breakdown */}
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
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>You Receive Approx:</span>
              <span className="mono" style={{ fontWeight: 700, color: "var(--solana-green)" }}>
                {buyQuote.tokensOut ? `${(buyQuote.tokensOut / 1e6).toFixed(2)}M $${token.symbol}` : "0"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Price Impact:</span>
              <span className="mono" style={{ color: buyQuote.priceImpact > 5 ? "#ef4444" : "#14f195" }}>
                {buyQuote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "6px",
                borderTop: "1px dashed rgba(255, 255, 255, 0.08)",
                fontSize: "0.72rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#ff8c37" }}>
                <span>🚀</span>
                <span>
                  <b>0.5%</b> Coin Launcher Royalty
                </span>
              </div>
              <span style={{ color: "var(--solana-green)" }}>⚡ 0.5% Platform Fee</span>
            </div>
          </div>
        </div>
      ) : (
        /* SELL MODULE */
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>
            <span>You Sell (${token.symbol})</span>
            <span>
              Balance: <b style={{ color: "var(--text-primary)" }}>{(userTokenBalance / 1e6).toFixed(2)}M</b>
            </span>
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
            <span className="mono" style={{ fontWeight: 700, color: "var(--solana-purple)" }}>
              {token.symbol}
            </span>
          </div>

          {/* Quick percentage chips */}
          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
            {[10, 25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  if (pct === 100) {
                    setTokenAmount(userTokenBalance.toString());
                  } else {
                    setTokenAmount(Math.floor(userTokenBalance * (pct / 100)).toString());
                  }
                }}
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
                {sellQuote.solOut ? `${(sellQuote.solOut || 0).toFixed(4)} SOL` : "0.0000 SOL"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Price Impact:</span>
              <span className="mono" style={{ color: sellQuote.priceImpact > 5 ? "#ef4444" : "#14f195" }}>
                {sellQuote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "6px",
                borderTop: "1px dashed rgba(255, 255, 255, 0.08)",
                fontSize: "0.72rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#ff8c37" }}>
                <span>🚀</span>
                <span>
                  <b>0.5%</b> Coin Launcher Royalty
                </span>
              </div>
              <span style={{ color: "var(--solana-green)" }}>⚡ 0.5% Platform Fee</span>
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
        disabled={isSwapping || (mode === "sell" && userTokenBalance <= 0)}
        className={mode === "buy" ? "btn-buy" : "btn-sell"}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          opacity: mode === "sell" && userTokenBalance <= 0 ? 0.5 : 1,
          cursor: mode === "sell" && userTokenBalance <= 0 ? "not-allowed" : "pointer",
        }}
      >
        <Zap size={18} />
        <span>
          {isSwapping
            ? "Executing Trade..."
            : mode === "buy"
            ? `Buy $${token.symbol}`
            : userTokenBalance <= 0
            ? `0 $${token.symbol} In Wallet`
            : `Sell $${token.symbol}`}
        </span>
      </button>
    </div>
  );
};
