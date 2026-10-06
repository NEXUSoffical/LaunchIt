import React, { useState, useEffect } from "react";
import { Token, Trade } from "./types";
import { INITIAL_TOKENS, INITIAL_TRADES } from "./utils/mockData";
import { Navbar } from "./components/Navbar";
import { KingOfTheHill } from "./components/KingOfTheHill";
import { TokenGrid } from "./components/TokenGrid";
import { TradingTerminal } from "./components/TradingTerminal";
import { CreateTokenModal } from "./components/CreateTokenModal";
import { DeployGuideModal } from "./components/DeployGuideModal";

const parseInitialState = (): { initialTokens: Token[]; initialSelected: Token | null } => {
  let stored: Token[] = [];
  try {
    const saved = localStorage.getItem("launchit_tokens_db");
    if (saved) {
      const parsed: Token[] = JSON.parse(saved);
      stored = parsed.filter(
        (t) =>
          !["genesis-ai", "sol-cyber-pepe", "quantum-sol", "neon-samurai"].includes(t.id) &&
          !["GENESIS", "CPEPE", "QSOL", "SAMURAI"].includes(t.symbol)
      );
    }
  } catch (e) {
    console.error("Failed to parse saved tokens", e);
  }

  // Combine stored with INITIAL_TOKENS, deduplicating by mint
  const tokenMap = new Map<string, Token>();
  for (const t of stored) tokenMap.set(t.mint, t);
  for (const t of INITIAL_TOKENS) {
    if (!tokenMap.has(t.mint)) tokenMap.set(t.mint, t);
  }

  let selected: Token | null = null;

  // Check URL parameters synchronously on page load
  if (typeof window !== "undefined") {
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
        name: decodeURIComponent(newName),
        symbol: decodeURIComponent(newSymbol).toUpperCase().replace("$", ""),
        description: videoUrl ? `Launched directly from TikTok: ${decodeURIComponent(videoUrl)}` : "Launched directly on LaunchIt via 1-click in-app.",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
        creator: (() => {
          const raw = params.get("creator");
          if (raw) return decodeURIComponent(raw);
          if (videoUrl) {
            const m = decodeURIComponent(videoUrl).match(/@([^/?#]+)/);
            if (m) return `@${m[1]}`;
          }
          return "@tiktok_creator";
        })(),
        creatorHandle: (() => {
          const raw = params.get("creator");
          if (raw) return decodeURIComponent(raw);
          if (videoUrl) {
            const m = decodeURIComponent(videoUrl).match(/@([^/?#]+)/);
            if (m) return `@${m[1]}`;
          }
          return "@tiktok_creator";
        })(),
        launcherWallet: params.get("launcher_wallet") ? decodeURIComponent(params.get("launcher_wallet")!) : null,
        feeSplit: (params.get("fee_split") as any) || "split_50_50",
        unclaimedCreatorFeesSol: 0,
        unclaimedLauncherFeesSol: 0,
        claimedCreatorFeesSol: 0,
        claimedLauncherFeesSol: 0,
        marketCapSol: 30.0,
        marketCapUsd: 4500,
        priceSol: 0.00000003,
        progressPercent: 0.0,
        realSolReserves: 0.0,
        realTokenReserves: 800_000_000,
        volume24hSol: 0.0,
        repliesCount: 0,
        isGraduated: false,
        createdAt: Date.now(),
        socials: {
          website: videoUrl ? decodeURIComponent(videoUrl) : undefined,
        },
      };

      tokenMap.set(newMint, createdCoin);
      selected = createdCoin;

      try {
        const all = Array.from(tokenMap.values());
        localStorage.setItem("launchit_tokens_db", JSON.stringify(all));
      } catch (_) {}
    } else if (newMint) {
      const match = tokenMap.get(newMint) || Array.from(tokenMap.values()).find(
        (t) => t.mint.toLowerCase() === newMint.toLowerCase() || t.symbol.toLowerCase() === newMint.toLowerCase()
      );
      if (match) selected = match;
    }
  }

  const allTokens = Array.from(tokenMap.values());
  allTokens.sort((a, b) => b.createdAt - a.createdAt);

  return { initialTokens: allTokens, initialSelected: selected };
};

const parsedState = parseInitialState();

export const App: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>(parsedState.initialTokens);
  const [trades, setTrades] = useState<Trade[]>(INITIAL_TRADES);
  const [selectedToken, setSelectedToken] = useState<Token | null>(parsedState.initialSelected);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Sync with localStorage whenever tokens change
  useEffect(() => {
    try {
      localStorage.setItem("launchit_tokens_db", JSON.stringify(tokens));
    } catch (_) {}
  }, [tokens]);

  // Listen for storage events (e.g. from other tabs) and custom extension events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "launchit_tokens_db" && e.newValue) {
        try {
          const updated: Token[] = JSON.parse(e.newValue);
          setTokens(updated);
        } catch (_) {}
      }
    };

    const handleCustomInjection = (e: any) => {
      if (e.detail) {
        const newToken: Token = e.detail;
        setTokens((prev) => [newToken, ...prev.filter((t) => t.mint !== newToken.mint)]);
        setSelectedToken(newToken);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("launchit_coin_injected" as any, handleCustomInjection);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("launchit_coin_injected" as any, handleCustomInjection);
    };
  }, []);

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

  const handleTokenUpdated = (updatedToken: Token) => {
    setTokens((prev) =>
      prev.map((t) => (t.mint === updatedToken.mint ? updatedToken : t))
    );
    setSelectedToken(updatedToken);
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
            onUpdateToken={handleTokenUpdated}
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
