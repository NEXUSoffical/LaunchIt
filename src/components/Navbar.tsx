import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import {
  Rocket,
  Wallet,
  Sparkles,
  BookOpen,
  Layers,
  LogOut,
  User,
  Copy,
  Check,
  ChevronDown,
  Shield,
  Zap,
} from "lucide-react";

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
  const { currentUser, logout } = useAuth();
  const {
    connected,
    publicKey,
    balance,
    network,
    setNetwork,
    connect,
    requestAirdrop,
    isAirdropping,
  } = useWallet();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);

  const shortAddr = publicKey
    ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
    : "";

  const handleCopyAddr = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 1500);
    }
  };

  return (
    <header
      className="glass-panel"
      style={{
        borderRadius: 0,
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "72px",
        }}
      >
        {/* Brand / Logo */}
        <div
          onClick={onHomeClick}
          style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
        >
          <img
            src="/logo.jpg"
            alt="LaunchIt Logo"
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              objectFit: "cover",
              border: "1.5px solid rgba(255, 96, 0, 0.5)",
              boxShadow: "0 0 16px rgba(255, 96, 0, 0.4)",
            }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: "1.35rem", fontWeight: 900, letterSpacing: "-0.5px" }}>
                LAUNCH<span style={{ color: "#ff6000" }}>IT</span>
              </span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#ff8c37", fontWeight: 600, letterSpacing: "0.5px" }}>
              — see it launch it —
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
            <span>$0 Setup Guide</span>
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

        {/* Right side: Network Switcher & User Account */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
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
              <span>{isAirdropping ? "..." : "+1 SOL"}</span>
            </button>
          )}

          {/* Official Account Pill */}
          {currentUser ? (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid rgba(255, 96, 0, 0.4)",
                  borderRadius: "var(--radius-md)",
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.username}
                  style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#0e131d" }}
                />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ color: "#ff8c37" }}>@</span>{currentUser.username}
                  </div>
                  <div className="mono" style={{ fontSize: "0.72rem", color: "var(--solana-green)", fontWeight: 700 }}>
                    {balance.toFixed(2)} SOL
                  </div>
                </div>
                <ChevronDown size={14} color="var(--text-muted)" />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <>
                  <div
                    onClick={() => setIsProfileOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 110 }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      width: "300px",
                      background: "rgba(14, 19, 29, 0.98)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "14px",
                      boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
                      padding: "16px",
                      zIndex: 120,
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.username}
                        style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#111420" }}
                      />
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff" }}>
                          @{currentUser.username}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {currentUser.email}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "rgba(255, 255, 255, 0.03)", padding: "10px", borderRadius: "8px" }}>
                      <div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Devnet Balance</span>
                        <span className="mono" style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--solana-green)" }}>
                          {balance.toFixed(2)} SOL
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Reputation</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ff8c37" }}>
                          {currentUser.reputationKarma || 100} Karma
                        </span>
                      </div>
                    </div>

                    {/* Wallet Details */}
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                        Connected Solana Wallet:
                      </div>
                      <div
                        onClick={handleCopyAddr}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          cursor: "pointer",
                          fontSize: "0.78rem",
                        }}
                      >
                        <span className="mono" style={{ color: "#cbd5e1" }}>
                          {shortAddr}
                        </span>
                        {copiedAddr ? <Check size={14} color="var(--solana-green)" /> : <Copy size={14} color="var(--text-muted)" />}
                      </div>
                    </div>

                    <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <button
                        onClick={requestAirdrop}
                        disabled={isAirdropping}
                        className="btn-secondary"
                        style={{ fontSize: "0.8rem", padding: "8px 12px", justifyContent: "center" }}
                      >
                        <Layers size={14} color="var(--solana-green)" />
                        <span>{isAirdropping ? "Airdropping..." : "Airdrop +1 Devnet SOL"}</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          logout();
                        }}
                        style={{
                          background: "rgba(239, 68, 68, 0.12)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          color: "var(--solana-red)",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          cursor: "pointer",
                        }}
                      >
                        <LogOut size={14} />
                        <span>Sign Out of LaunchIt</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
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
