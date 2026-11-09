import React, { useState } from "react";
import { useAuth, WalletProviderName } from "../context/AuthContext";
import { X, Wallet, ShieldCheck, Zap, AlertCircle } from "lucide-react";

export const ConnectWalletModal: React.FC = () => {
  const { isAuthModalOpen, authModalPrompt, closeAuthModal, connectWalletAuth, isLoading } = useAuth();
  const [preferredHandle, setPreferredHandle] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleConnect = async (provider: WalletProviderName) => {
    setErrorMsg(null);
    const res = await connectWalletAuth(provider, preferredHandle.trim() || undefined);
    if (!res.success) {
      setErrorMsg(res.error || "Could not connect wallet.");
    } else {
      closeAuthModal();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={closeAuthModal}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "440px",
          borderRadius: "20px",
          padding: "24px",
          border: "1px solid rgba(255, 96, 0, 0.35)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 96, 0, 0.2)",
          position: "relative",
          background: "linear-gradient(180deg, #131722 0%, #0c0f17 100%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          style={{
            position: "absolute",
            top: "18px",
            right: "18px",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "var(--text-muted)",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          title="Close (Keep browsing)"
        >
          <X size={16} />
        </button>

        {/* Header Icon + Title */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "rgba(255, 96, 0, 0.15)",
              border: "1px solid rgba(255, 96, 0, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              boxShadow: "0 0 20px rgba(255, 96, 0, 0.25)",
            }}
          >
            <Wallet size={26} color="#ff6000" />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: "0 0 6px", color: "#ffffff" }}>
            Connect Solana Wallet
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
            {authModalPrompt || "Connect your wallet to trade, like, comment, and launch coins."}
          </p>
        </div>

        {/* Optional Username Handle Input */}
        <div style={{ marginBottom: "18px" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
            Choose a handle (optional):
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "0 12px",
            }}
          >
            <span style={{ color: "#ff8c37", fontWeight: 700, fontSize: "0.9rem", marginRight: "4px" }}>@</span>
            <input
              type="text"
              placeholder="your_handle"
              value={preferredHandle}
              onChange={(e) => setPreferredHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#ffffff",
                padding: "10px 0",
                fontSize: "0.88rem",
              }}
            />
          </div>
        </div>

        {/* Wallet Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Phantom */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleConnect("phantom")}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #ab9ff2 0%, #7c66dc 100%)",
              color: "#ffffff",
              fontSize: "0.92rem",
              fontWeight: 800,
              border: "none",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 14px rgba(124, 102, 220, 0.3)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.2rem" }}>👻</span>
              <span>Phantom Wallet</span>
            </span>
            <span style={{ fontSize: "0.72rem", background: "rgba(0,0,0,0.25)", padding: "2px 7px", borderRadius: "5px" }}>
              Popular
            </span>
          </button>

          {/* Solflare */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleConnect("solflare")}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #ff6000 0%, #ff8c37 100%)",
              color: "#ffffff",
              fontSize: "0.92rem",
              fontWeight: 800,
              border: "none",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 14px rgba(255, 96, 0, 0.25)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.2rem" }}>☀️</span>
              <span>Solflare Wallet</span>
            </span>
            <span style={{ fontSize: "0.72rem", opacity: 0.9 }}>Solana</span>
          </button>

          {/* Backpack */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleConnect("backpack")}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              background: "var(--bg-surface-elevated)",
              color: "#ffffff",
              fontSize: "0.9rem",
              fontWeight: 700,
              border: "1px solid var(--border-subtle)",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.1rem" }}>🎒</span>
              <span>Backpack / Injected Wallet</span>
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Solana</span>
          </button>

          {/* Instant Embedded Browser Wallet (No extension required) */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleConnect("embedded")}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              background: "rgba(20, 241, 149, 0.1)",
              border: "1px dashed rgba(20, 241, 149, 0.45)",
              color: "var(--solana-green)",
              fontSize: "0.9rem",
              fontWeight: 800,
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "4px",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Zap size={16} />
              <span>Instant 1-Click Wallet</span>
            </span>
            <span style={{ fontSize: "0.72rem", background: "rgba(20, 241, 149, 0.2)", padding: "2px 7px", borderRadius: "5px" }}>
              No App Needed
            </span>
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div
            style={{
              marginTop: "14px",
              padding: "10px 12px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#ef4444",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer info */}
        <div
          style={{
            marginTop: "18px",
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.74rem",
            color: "var(--text-muted)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <ShieldCheck size={13} color="var(--solana-green)" />
            <span>Non-custodial Solana SPL</span>
          </span>
          <button
            onClick={closeAuthModal}
            style={{
              background: "transparent",
              border: "none",
              color: "#ff8c37",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.74rem",
              padding: 0,
            }}
          >
            Continue browsing as guest →
          </button>
        </div>
      </div>
    </div>
  );
};
