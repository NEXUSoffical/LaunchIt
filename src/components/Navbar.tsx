import React from "react";
import { useWallet } from "../context/WalletContext";
import { Rocket, Wallet, Sparkles, BookOpen, Layers } from "lucide-react";

interface NavbarProps {
  onOpenCreate: () => void;
  onOpenGuide: () => void;
  onHomeClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreate,
  onOpenGuide,
  onHomeClick,
}) => {
  const {
    connected,
    publicKey,
    balance,
    network,
    setNetwork,
    connect,
    disconnect,
    requestAirdrop,
    isAirdropping,
  } = useWallet();

  const shortAddr = publicKey
    ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
    : "";

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: "none", borderLeft: "none", borderRight: "none", position: "sticky", top: 0, zIndex: 100 }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "72px" }}>
        {/* Brand / Logo */}
        <div
          onClick={onHomeClick}
          style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 15px rgba(20, 241, 149, 0.4)",
            }}
          >
            <Rocket size={24} color="#07090e" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
                LAUNCHIT
              </span>
              <span className="badge badge-purple" style={{ fontSize: "0.65rem" }}>
                Token-2022
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Solana Fair Launchpad
            </div>
          </div>
        </div>

        {/* Center / Stats info */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={onOpenGuide}
            className="btn-secondary"
            style={{ fontSize: "0.85rem", padding: "8px 14px" }}
          >
            <BookOpen size={16} color="var(--solana-cyan)" />
            <span>$0 Free Setup Guide</span>
          </button>

          <button
            onClick={onOpenCreate}
            className="btn-primary"
            style={{ fontSize: "0.9rem", padding: "9px 18px" }}
          >
            <Sparkles size={18} />
            <span>Launch Coin</span>
          </button>
        </div>

        {/* Wallet & Network controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Network Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              padding: "4px",
              fontSize: "0.8rem",
            }}
          >
            <button
              onClick={() => setNetwork("devnet")}
              style={{
                background: network === "devnet" ? "var(--bg-surface-elevated)" : "transparent",
                color: network === "devnet" ? "var(--solana-green)" : "var(--text-muted)",
                padding: "4px 8px",
                borderRadius: "4px",
                fontWeight: 600,
              }}
            >
              Devnet
            </button>
            <button
              onClick={() => setNetwork("mainnet-beta")}
              style={{
                background: network === "mainnet-beta" ? "var(--bg-surface-elevated)" : "transparent",
                color: network === "mainnet-beta" ? "var(--solana-purple)" : "var(--text-muted)",
                padding: "4px 8px",
                borderRadius: "4px",
                fontWeight: 600,
              }}
            >
              Mainnet
            </button>
          </div>

          {/* Devnet Free Airdrop Button */}
          {network === "devnet" && (
            <button
              onClick={requestAirdrop}
              disabled={isAirdropping}
              className="btn-secondary"
              title="Request 1 Free SOL on Devnet"
              style={{ fontSize: "0.8rem", padding: "8px 12px", border: "1px solid rgba(20, 241, 149, 0.3)" }}
            >
              <Layers size={14} color="var(--solana-green)" />
              <span>{isAirdropping ? "Airdropping..." : "+1 Free SOL"}</span>
            </button>
          )}

          {/* Wallet connect button */}
          {connected ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-accent)",
                borderRadius: "var(--radius-md)",
                padding: "6px 12px",
              }}
            >
              <div style={{ textAlign: "right" }}>
                <div className="mono" style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--solana-green)" }}>
                  {balance.toFixed(2)} SOL
                </div>
                <div className="mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  {shortAddr}
                </div>
              </div>
              <button
                onClick={disconnect}
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "var(--solana-red)",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              className="btn-secondary"
              style={{ borderColor: "var(--solana-green)" }}
            >
              <Wallet size={16} color="var(--solana-green)" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
