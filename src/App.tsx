import React, { useState, useEffect } from "react";
import { Token, Trade } from "./types";
import { INITIAL_TOKENS, INITIAL_TRADES } from "./utils/mockData";
import { Navbar } from "./components/Navbar";
import { KingOfTheHill } from "./components/KingOfTheHill";
import { TokenGrid } from "./components/TokenGrid";
import { TradingTerminal } from "./components/TradingTerminal";
import { CreateTokenModal } from "./components/CreateTokenModal";
import { DeployGuideModal } from "./components/DeployGuideModal";

const getInitialTokens = (): Token[] => {
  try {
    const saved = localStorage.getItem("launchit_tokens_db");
    if (saved) {
      const parsed: Token[] = JSON.parse(saved);
      const purged = parsed.filter(
        (t) =>
          !["genesis-ai", "sol-cyber-pepe", "quantum-sol", "neon-samurai"].includes(t.id) &&
          !["GENESIS", "CPEPE", "QSOL", "SAMURAI"].includes(t.symbol)
      );
      if (purged.length > 0) {
        return purged;
      }
    }
  } catch (e) {
    console.error("Failed to parse saved tokens", e);
  }
  return INITIAL_TOKENS;
};

export const App: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>(getInitialTokens);
  const [trades, setTrades] = useState<Trade[]>(INITIAL_TRADES);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Deep-link & TikTok Launch detection from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newMint = params.get("mint") || params.get("token");
    const newName = params.get("name");
    const newSymbol = params.get("symbol");
    const videoUrl = params.get("video");
    const isNew = params.get("new_token") === "1" || params.get("created") === "1";

    if (isNew && newMint && newName && newSymbol) {
      const createdCoin: Token = {
        id: `tiktok-${Date.now()}`,
        mint: newMint,
        name: newName,
        symbol: newSymbol.toUpperCase().replace("$", ""),
        description: videoUrl ? `Launched directly from TikTok: ${videoUrl}` : "Launched directly on LaunchIt via 1-click in-app.",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
        creator: params.get("creator") || "@tiktok_creator",
        marketCapSol: 32.5,
        marketCapUsd: 4875,
        priceSol: 0.0000000325,
        progressPercent: 3.5,
        realSolReserves: 2.97,
        realTokenReserves: 770_000_000,
        volume24hSol: 3.2,
        repliesCount: 1,
        isGraduated: false,
        createdAt: Date.now(),
        socials: {
          website: videoUrl || undefined,
        },
      };

      setTokens((prev) => {
        const filtered = prev.filter((t) => t.mint !== newMint);
        const updated = [createdCoin, ...filtered];
        try {
          localStorage.setItem("launchit_tokens_db", JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      setSelectedToken(createdCoin);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Check path or query for token mint
      let lookupMint = newMint;
      if (!lookupMint && window.location.pathname.includes("/token/")) {
        lookupMint = window.location.pathname.split("/token/")[1]?.split("/")[0];
      }
      if (lookupMint) {
        const found = tokens.find(
          (t) => t.mint.toLowerCase() === lookupMint?.toLowerCase() || t.symbol.toLowerCase() === lookupMint?.toLowerCase()
        );
        if (found) setSelectedToken(found);
      }
    }
  }, []);

  // Save tokens to localStorage whenever tokens list updates
  useEffect(() => {
    try {
      localStorage.setItem("launchit_tokens_db", JSON.stringify(tokens));
    } catch (_) {}
  }, [tokens]);

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
