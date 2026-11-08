import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import {
  Sparkles,
  BookOpen,
  LogOut,
  User,
  Copy,
  Check,
  ChevronDown,
  Zap,
  Activity,
  ExternalLink,
  CheckCircle2,
  X,
  Gift,
  Users,
} from "lucide-react";

interface NavbarProps {
  onOpenCreate: () => void;
  onOpenGuide: () => void;
  onHomeClick: () => void;
  onOpenExplorer?: (query?: string) => void;
  isExplorerActive?: boolean;
  onOpenReferral?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreate,
  onOpenGuide,
  onHomeClick,
  onOpenReferral,
}) => {
  const { currentUser, logout, updateProfile } = useAuth();
  const {
    publicKey,
    balance,
    network,
    setNetwork,
    connect,
    requestAirdrop,
    isAirdropping,
    airdropSuccess,
    currentSlot,
    isNodeOnline,
    txHistory,
  } = useWallet();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedOfficialCa, setCopiedOfficialCa] = useState(false);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [handleInput, setHandleInput] = useState("");

  const OFFICIAL_CA = "4akoUeUJcay3tQUc3BJbqGtaCwPanZ12xm7dLaunchit";

  const handleCopyOfficialCa = () => {
    navigator.clipboard.writeText(OFFICIAL_CA);
    setCopiedOfficialCa(true);
    setTimeout(() => setCopiedOfficialCa(false), 1800);
  };

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
      {/* Official $LAUNCHIT Contract Address Banner */}
      <div
        style={{
          background: "linear-gradient(90deg, rgba(255, 96, 0, 0.18) 0%, rgba(20, 241, 149, 0.14) 50%, rgba(255, 96, 0, 0.18) 100%)",
          borderBottom: "1px solid rgba(255, 96, 0, 0.35)",
          padding: "7px 14px",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "10px",
            fontSize: "0.78rem",
          }}
        >
          <span style={{ fontWeight: 800, color: "#ff8c37", letterSpacing: "0.3px" }}>
            🔥 OFFICIAL $LAUNCHIT CA:
          </span>
          <button
            type="button"
            onClick={handleCopyOfficialCa}
            title="Click to copy official $LAUNCHIT Contract Address"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              borderRadius: "6px",
              background: "rgba(5, 7, 13, 0.78)",
              border: "1px solid rgba(20, 241, 149, 0.45)",
              color: "var(--solana-green)",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.76rem",
            }}
          >
            <span className="mono">{OFFICIAL_CA}</span>
            {copiedOfficialCa ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "#14f195" }}>
                <Check size={12} /> Copied!
              </span>
            ) : (
              <Copy size={12} color="#94a3b8" />
            )}
          </button>
          <a
            href={`/?mint=${OFFICIAL_CA}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 10px",
              borderRadius: "6px",
              background: "linear-gradient(135deg, #ff6000 0%, #ff8c37 100%)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "0.74rem",
              textDecoration: "none",
            }}
          >
            <span>Trade $LAUNCHIT Live</span>
          </a>
          <a
            href="https://x.com/seeItLaunchIt"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 10px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              color: "#e2e8f0",
              fontWeight: 700,
              fontSize: "0.74rem",
              textDecoration: "none",
            }}
          >
            <span>@seeItLaunchIt on X</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

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
              width: "44px",
              height: "44px",
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

        {/* Center / Nav Items */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a
            href={
              network === "mainnet-beta"
                ? "https://solscan.io"
                : "https://solscan.io/?cluster=devnet"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{
              fontSize: "0.85rem",
              padding: "8px 14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              textDecoration: "none",
              color: "#cbd5e1",
            }}
            title="Open Solscan Block Explorer in a new tab"
          >
            <Activity size={15} color="var(--solana-green)" />
            <span>Solscan</span>
            <ExternalLink size={12} color="var(--text-muted)" />
          </a>

          <button
            onClick={onOpenGuide}
            className="btn-secondary"
            style={{ fontSize: "0.85rem", padding: "8px 14px" }}
          >
            <BookOpen size={16} color="var(--solana-cyan)" />
            <span>How It Works</span>
          </button>

          {onOpenReferral && (
            <button
              onClick={onOpenReferral}
              className="btn-secondary"
              style={{
                fontSize: "0.85rem",
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 140, 55, 0.12)",
                border: "1px solid rgba(255, 140, 55, 0.4)",
                color: "#ff8c37",
                fontWeight: 700,
              }}
              title="Invite friends & earn 20% on-chain trading fees"
            >
              <Gift size={16} color="#ff8c37" />
              <span>Refer & Earn</span>
            </button>
          )}

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
                color: network === "mainnet-beta" ? "#ff8c37" : "var(--text-muted)",
                padding: "4px 8px",
                borderRadius: "4px",
                fontWeight: 600,
              }}
            >
              Mainnet
            </button>
          </div>

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
                  border: airdropSuccess ? "1.5px solid #10b981" : "1px solid rgba(255, 96, 0, 0.4)",
                  borderRadius: "var(--radius-md)",
                  padding: "6px 12px",
                  cursor: "pointer",
                  boxShadow: airdropSuccess ? "0 0 20px rgba(16, 185, 129, 0.4)" : "none",
                  transition: "all 0.3s ease",
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
                  <div className="mono" style={{ fontSize: "0.74rem", color: "var(--solana-green)", fontWeight: 800 }}>
                    {balance.toFixed(4)} SOL
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
                      <div style={{ overflow: "hidden", flex: 1 }}>
                        {isEditingHandle ? (
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <input
                              type="text"
                              value={handleInput}
                              onChange={(e) => setHandleInput(e.target.value)}
                              placeholder="handle"
                              style={{
                                width: "100%",
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "6px",
                                padding: "4px 8px",
                                color: "#fff",
                                fontSize: "0.82rem",
                              }}
                            />
                            <button
                              onClick={() => {
                                const clean = handleInput.trim().replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "");
                                if (clean) updateProfile({ username: clean, displayName: clean });
                                setIsEditingHandle(false);
                              }}
                              className="btn-primary"
                              style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff" }}>
                              @{currentUser.username}
                            </div>
                            <button
                              onClick={() => {
                                setHandleInput(currentUser.username);
                                setIsEditingHandle(true);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#ff8c37",
                                fontSize: "0.72rem",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              Edit @handle
                            </button>
                          </div>
                        )}
                        <div className="mono" style={{ fontSize: "0.75rem", color: "var(--solana-green)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginTop: "2px" }}>
                          Wallet: {shortAddr}
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid: Balance, Karma, Following, Followers */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "rgba(255, 255, 255, 0.03)", padding: "10px", borderRadius: "8px" }}>
                      <div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Solana Balance</span>
                        <span className="mono" style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--solana-green)" }}>
                          {balance.toFixed(4)} SOL
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Reputation</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ff8c37" }}>
                          {currentUser.reputationKarma || 100} Karma
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Following</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--solana-cyan)" }}>
                          {currentUser.following?.length || 0}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Followers</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fbbf24" }}>
                          {currentUser.followersCount || 0}
                        </span>
                      </div>
                    </div>

                    {/* Referrals Banner in Profile */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, rgba(255, 140, 55, 0.12), rgba(20, 241, 149, 0.08))",
                        border: "1px solid rgba(255, 140, 55, 0.3)",
                        borderRadius: "10px",
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Referral Rewards</div>
                        <div className="mono" style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--solana-green)" }}>
                          {(currentUser.referralEarningsSol || 0).toFixed(4)} SOL
                        </div>
                      </div>
                      {onOpenReferral && (
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            onOpenReferral();
                          }}
                          style={{
                            background: "rgba(255, 140, 55, 0.2)",
                            border: "1px solid rgba(255, 140, 55, 0.45)",
                            color: "#ff8c37",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Gift size={12} />
                          <span>Invite Link</span>
                        </button>
                      )}
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
                        onClick={connect}
                        className="btn-secondary"
                        style={{ fontSize: "0.8rem", padding: "8px 12px", justifyContent: "center" }}
                      >
                        <span>Switch Solana Wallet</span>
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
                        <span>Disconnect Wallet</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Guest / In-App Solana Wallet Pill */
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                onClick={handleCopyAddr}
                title="Click to copy your Solana Address"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "var(--bg-surface-elevated)",
                  border: airdropSuccess
                    ? "1.5px solid #10b981"
                    : "1px solid rgba(255, 96, 0, 0.4)",
                  borderRadius: "var(--radius-md)",
                  padding: "6px 12px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: airdropSuccess ? "0 0 20px rgba(16, 185, 129, 0.5)" : "none",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #14f195 0%, #9945ff 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                    boxShadow: "0 0 10px rgba(20, 241, 149, 0.4)",
                  }}
                >
                  ◎
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "0.73rem", fontWeight: 700, color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>{shortAddr || "Not Connected"}</span>
                    {copiedAddr ? <Check size={12} color="#10b981" /> : <Copy size={11} color="#64748b" />}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: "0.82rem",
                      color: airdropSuccess ? "#10b981" : "var(--solana-green)",
                      fontWeight: 800,
                      transition: "color 0.3s ease",
                    }}
                  >
                    {balance.toFixed(2)} SOL
                  </div>
                </div>
              </div>

              <button
                onClick={connect}
                className="btn-secondary"
                style={{ padding: "6px 10px", fontSize: "0.76rem", borderColor: "rgba(255, 255, 255, 0.18)" }}
              >
                <User size={13} color="#cbd5e1" />
                <span>Connect Wallet</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Solana Live Telemetry Modal */}
      {showExplorer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: "20px",
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "680px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px",
              border: "1.5px solid rgba(20, 241, 149, 0.4)",
              boxShadow: "0 0 40px rgba(20, 241, 149, 0.25), 0 20px 50px rgba(0,0,0,0.9)",
              borderRadius: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: isNodeOnline ? "#14f195" : "#ef4444", boxShadow: isNodeOnline ? "0 0 12px #14f195" : "none" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                  SOLANA NETWORK ACTIVITY
                </h3>
              </div>
              <button
                onClick={() => setShowExplorer(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "260px", overflowY: "auto" }}>
              {txHistory.map((tx, idx) => (
                <div
                  key={`${tx.signature}-${idx}`}
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff" }}>
                        {tx.message}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: "0.7rem", color: "var(--solana-green)", fontWeight: 700 }}>
                      Slot #{tx.slot}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
