import React, { useState, useEffect } from "react";
import { Token, Trade } from "./types";
import { INITIAL_TOKENS, INITIAL_TRADES } from "./utils/mockData";
import { Navbar } from "./components/Navbar";
import { KingOfTheHill } from "./components/KingOfTheHill";
import { TokenGrid } from "./components/TokenGrid";
import { TradingTerminal } from "./components/TradingTerminal";
import { CreateTokenModal } from "./components/CreateTokenModal";
import { DeployGuideModal } from "./components/DeployGuideModal";

export const App: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>(INITIAL_TOKENS);
  const [trades, setTrades] = useState<Trade[]>(INITIAL_TRADES);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Top trending token for King of the Hill
  const kingToken = tokens.find((t) => !t.isGraduated) || tokens[0];

  const handleSelectToken = (token: Token) => {
    setSelectedToken(token);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTokenCreated = (newToken: Token) => {
    setTokens((prev) => [newToken, ...prev]);
    setSelectedToken(newToken);
  };

  const handleTradeExecuted = (newTrade: Trade, updatedToken: Token) => {
    setTrades((prev) => [newTrade, ...prev]);
    setTokens((prev) =>
      prev.map((t) => (t.mint === updatedToken.mint ? updatedToken : t))
    );
    if (selectedToken && selectedToken.mint === updatedToken.mint) {
      setSelectedToken(updatedToken);
    }
  };

  // Subtle simulated background activity to give the exchange a lively pulse
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        const randomToken = tokens[Math.floor(Math.random() * tokens.length)];
        const isBuy = Math.random() > 0.45;
        const solAmt = parseFloat((Math.random() * 1.5 + 0.1).toFixed(2));
        const tokenAmt = Math.round(solAmt * 9_500_000);

        const simulatedTrade: Trade = {
          id: `sim-${Date.now()}`,
          mint: randomToken.mint,
          user: `${Math.random().toString(36).substring(2, 6)}...${Math.random().toString(36).substring(2, 6)}`,
          isBuy,
          solAmount: solAmt,
          tokenAmount: tokenAmt,
          priceSol: randomToken.priceSol,
          timestamp: Date.now(),
          txHash: `${Math.random().toString(36).substring(2, 6)}...${Math.random().toString(36).substring(2, 6)}`,
        };

        setTrades((prev) => [simulatedTrade, ...prev.slice(0, 40)]);
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [tokens]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar
        onOpenCreate={() => setIsCreateOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onHomeClick={() => setSelectedToken(null)}
      />

      <main className="container" style={{ flex: 1 }}>
        {selectedToken ? (
          <TradingTerminal
            token={selectedToken}
            trades={trades}
            onBack={() => setSelectedToken(null)}
            onTradeExecuted={handleTradeExecuted}
          />
        ) : (
          <>
            {kingToken && (
              <KingOfTheHill
                token={kingToken}
                onSelectToken={handleSelectToken}
              />
            )}
            <TokenGrid
              tokens={tokens}
              onSelectToken={handleSelectToken}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "24px 0",
          color: "var(--text-muted)",
          fontSize: "0.8rem",
          textAlign: "center",
          background: "var(--bg-surface)",
        }}
      >
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/logo.jpg" alt="LaunchIt" style={{ width: "28px", height: "28px", borderRadius: "6px", objectFit: "cover" }} />
            <div>
              <b>LAUNCH<span style={{ color: "#ff6000" }}>IT</span></b> • <span style={{ color: "#ff8c37", fontWeight: 600 }}>see it launch it</span> • Solana Token-2022
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            <span style={{ color: "var(--solana-green)" }}>● Devnet Live</span>
            <span>Zero Platform Hosting Cost</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreateTokenModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onTokenCreated={handleTokenCreated}
      />

      <DeployGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};
