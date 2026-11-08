import React, { useState } from "react";
import { useAuth, WalletProviderName } from "../context/AuthContext";
import {
  Rocket,
  MessageSquare,
  FileText,
  ShieldCheck,
  TrendingUp,
  User,
  Zap,
  CheckCircle2,
  Flame,
  Wallet,
} from "lucide-react";
import { Token } from "../types";

interface LandingHomePageProps {
  previewTokens?: Token[];
}

export const LandingHomePage: React.FC<LandingHomePageProps> = ({ previewTokens = [] }) => {
  const { connectWalletAuth, isLoading } = useAuth();

  const [preferredHandle, setPreferredHandle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleWalletConnect = async (provider: WalletProviderName) => {
    setErrorMessage(null);
    const res = await connectWalletAuth(provider, preferredHandle);
    if (!res.success) {
      setErrorMessage(res.error || "Could not connect wallet.");
    } else {
      setSuccessMessage(`Wallet ${res.walletAddress?.slice(0, 4)}...${res.walletAddress?.slice(-4)} connected! Entering LaunchIt...`);
    }
  };

  const displayTokens = previewTokens.slice(0, 3);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-dark)" }}>
      {/* Top Bar */}
      <header
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          padding: "16px 0",
          background: "rgba(14, 19, 29, 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src="/logo.jpg"
              alt="LaunchIt"
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                objectFit: "cover",
                border: "1.5px solid rgba(255, 96, 0, 0.6)",
                boxShadow: "0 0 14px rgba(255, 96, 0, 0.35)",
              }}
            />
            <div>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, letterSpacing: "-0.5px" }}>
                LAUNCH<span style={{ color: "#ff6000" }}>IT</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#ff8c37", fontWeight: 600 }}>
                — see it launch it —
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span
              className="badge"
              style={{
                background: "rgba(20, 241, 149, 0.12)",
                color: "var(--solana-green)",
                border: "1px solid rgba(20, 241, 149, 0.3)",
              }}
            >
              ● Solana Token-2022 Live
            </span>
            <button
              onClick={() => {
                const el = document.getElementById("auth-portal");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="btn-primary"
              style={{ fontSize: "0.85rem", padding: "8px 16px" }}
            >
              <Wallet size={15} />
              <span>Connect Wallet</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: "60px 0 40px", position: "relative" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: "860px", margin: "0 auto 48px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px",
                borderRadius: "999px",
                background: "rgba(255, 96, 0, 0.12)",
                border: "1px solid rgba(255, 96, 0, 0.4)",
                color: "#ff8c37",
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "20px",
              }}
            >
              <Flame size={16} />
              <span>The Next-Gen Social Bonding Curve Network</span>
            </div>

            <h1
              style={{
                fontSize: "clamp(2.3rem, 5vw, 3.8rem)",
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: "-1.5px",
                marginBottom: "20px",
              }}
            >
              See It. Launch It. <br />
              <span className="gradient-text-solana">Trade It. Debate It.</span>
            </h1>

            <p
              style={{
                fontSize: "1.15rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                maxWidth: "740px",
                margin: "0 auto 28px",
              }}
            >
              LaunchIt is the social headquarters for viral memecoins: launch tokens straight from TikTok in 1 click,
              earn 50/50 creator & launcher royalties, post investment theses, and trade on Solana bonding curves.
            </p>
          </div>

          {/* Wallet Connect Auth Portal Box */}
          <div
            id="auth-portal"
            style={{
              maxWidth: "480px",
              margin: "0 auto 60px",
              background: "rgba(14, 19, 29, 0.95)",
              border: "1px solid rgba(255, 96, 0, 0.4)",
              borderRadius: "20px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 96, 0, 0.15)",
              overflow: "hidden",
              padding: "28px",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "22px" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, rgba(255, 96, 0, 0.2) 0%, rgba(153, 69, 255, 0.2) 100%)",
                  border: "1px solid rgba(255, 96, 0, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <Wallet size={26} color="#ff8c37" />
              </div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "6px" }}>
                Connect Wallet to Sign In
              </h2>
              <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                No email or password needed. Your LaunchIt profile, token holdings, and creator royalties are tied directly to your Solana wallet.
              </p>
            </div>

            {errorMessage && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  color: "#fca5a5",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  fontSize: "0.82rem",
                  marginBottom: "16px",
                  lineHeight: 1.4,
                }}
              >
                ⚠️ {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  background: "rgba(20, 241, 149, 0.15)",
                  border: "1px solid rgba(20, 241, 149, 0.5)",
                  color: "#6ee7b7",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  fontSize: "0.85rem",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Optional Display Handle */}
            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Display Handle (Optional — linked to your wallet)
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  padding: "0 14px",
                  gap: "6px",
                }}
              >
                <User size={15} color="#ff8c37" />
                <span style={{ color: "#ff8c37", fontWeight: 700 }}>@</span>
                <input
                  type="text"
                  placeholder="Leave blank to use wallet address"
                  value={preferredHandle}
                  onChange={(e) => setPreferredHandle(e.target.value)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: "#fff",
                    padding: "11px 0",
                    fontSize: "0.9rem",
                  }}
                />
              </div>
            </div>

            {/* Wallet Provider Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleWalletConnect("phantom")}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #ab9ff2 0%, #7c66dc 100%)",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 16px rgba(124, 102, 220, 0.35)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.2rem" }}>👻</span>
                  <span>Connect Phantom Wallet</span>
                </span>
                <span style={{ fontSize: "0.75rem", background: "rgba(0,0,0,0.25)", padding: "3px 8px", borderRadius: "6px" }}>
                  Popular
                </span>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleWalletConnect("solflare")}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #ff6000 0%, #ff8c37 100%)",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 16px rgba(255, 96, 0, 0.3)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.2rem" }}>☀️</span>
                  <span>Connect Solflare Wallet</span>
                </span>
                <span style={{ fontSize: "0.75rem", opacity: 0.9 }}>Solana</span>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleWalletConnect("backpack")}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: "12px",
                  background: "var(--bg-surface-elevated)",
                  color: "#ffffff",
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  border: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.1rem" }}>🎒</span>
                  <span>Connect Backpack / Other Wallet</span>
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Solana</span>
              </button>
            </div>
          </div>

          {/* Social Platform Capabilities Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              maxWidth: "1100px",
              margin: "0 auto 60px",
            }}
          >
            <div
              className="glass-panel"
              style={{
                padding: "24px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(255, 96, 0, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <FileText size={22} color="#ff8c37" />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px" }}>
                Post & Read Coin Theses
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Publish bullish or bearish research writeups, outline target market caps, and earn karma from fellow
                traders who like and cite your analysis.
              </p>
            </div>

            <div
              className="glass-panel"
              style={{
                padding: "24px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(20, 241, 149, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <MessageSquare size={22} color="var(--solana-green)" />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px" }}>
                Live Coin Chatrooms
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Chat in real time with buyers, holders, and creators directly inside the trading terminal for every
                coin on the bonding curve.
              </p>
            </div>

            <div
              className="glass-panel"
              style={{
                padding: "24px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(0, 240, 255, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <Rocket size={22} color="var(--solana-cyan)" />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px" }}>
                TikTok "See It, Launch It"
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Turn viral videos into live tokens in 1-click without any upfront capital. Full royalty
                shares are held for creators & launchers in the Royalty Vault.
              </p>
            </div>

            <div
              className="glass-panel"
              style={{
                padding: "24px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(153, 69, 255, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <ShieldCheck size={22} color="#c084fc" />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px" }}>
                SPL Token-2022 Standard
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Native embedded metadata, rug-proof immutable curves, and automated Raydium liquidity pooling upon
                graduating at 85 SOL.
              </p>
            </div>
          </div>

          {/* Teaser Preview of Tokens */}
          {displayTokens.length > 0 && (
            <div style={{ maxWidth: "1000px", margin: "0 auto 60px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingUp size={18} color="var(--solana-green)" />
                  <span style={{ fontSize: "1.05rem", fontWeight: 800 }}>Live Trending Curves</span>
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Connect wallet above to trade & view theses
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                {displayTokens.map((t) => (
                  <div
                    key={t.id}
                    className="glass-panel"
                    style={{
                      padding: "16px",
                      borderRadius: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <img
                        src={t.image}
                        alt={t.name}
                        style={{ width: "42px", height: "42px", borderRadius: "10px", objectFit: "cover" }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>{t.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#ff8c37", fontWeight: 700 }}>${t.symbol}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Market Cap:</span>
                      <span className="mono" style={{ color: "var(--solana-green)", fontWeight: 700 }}>
                        {t.marketCapSol.toFixed(1)} SOL
                      </span>
                    </div>

                    <div style={{ height: "6px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "3px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, t.progressPercent)}%`,
                          background: "linear-gradient(90deg, #ff6000, #14f195)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: "auto",
          borderTop: "1px solid var(--border-subtle)",
          padding: "24px 0",
          color: "var(--text-muted)",
          fontSize: "0.8rem",
          background: "var(--bg-surface)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src="/logo.jpg"
              alt="LaunchIt"
              style={{ width: "24px", height: "24px", borderRadius: "6px", objectFit: "cover" }}
            />
            <div>
              <b>LAUNCH<span style={{ color: "#ff6000" }}>IT</span></b> • <span style={{ color: "#ff8c37" }}>see it launch it</span>
            </div>
          </div>
          <div>
            Built with SPL Token-2022 • Wallet-Linked Profiles • Free TikTok Deployments
          </div>
        </div>
      </footer>
    </div>
  );
};
