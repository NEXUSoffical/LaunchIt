import React, { useState } from "react";
import { Token } from "../types";
import { Coins, CheckCircle2, ShieldCheck, ArrowRight, X, ExternalLink, Sparkles } from "lucide-react";

interface CreatorRoyaltyVaultProps {
  token: Token;
  onUpdateToken: (updated: Token) => void;
}

export const CreatorRoyaltyVault: React.FC<CreatorRoyaltyVaultProps> = ({
  token,
  onUpdateToken,
}) => {
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [payoutAddress, setPayoutAddress] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);

  const unclaimedSol = token.unclaimedCreatorFeesSol || 0;
  const unclaimedUsd = unclaimedSol * 150;
  const creatorHandle = token.creatorHandle || token.creator || "@creator";
  const isClaimed = Boolean(token.creatorWallet);

  const handleClaim = () => {
    if (!payoutAddress.trim() || payoutAddress.trim().length < 32) {
      alert("Please enter a valid 32+ character Solana wallet address.");
      return;
    }

    setIsClaiming(true);
    setTimeout(() => {
      const claimedAmount = unclaimedSol;
      const updated: Token = {
        ...token,
        creatorWallet: payoutAddress.trim(),
        unclaimedCreatorFeesSol: 0,
        claimedCreatorFeesSol: (token.claimedCreatorFeesSol || 0) + claimedAmount,
      };

      onUpdateToken(updated);
      setIsClaiming(false);
      setClaimSuccessMsg(`Successfully claimed ${claimedAmount.toFixed(4)} SOL to ${payoutAddress.slice(0, 4)}...${payoutAddress.slice(-4)}!`);
    }, 1200);
  };

  return (
    <>
      <div
        className="glass-panel"
        style={{
          padding: "18px 20px",
          background: "linear-gradient(135deg, rgba(255, 96, 0, 0.08) 0%, rgba(20, 241, 149, 0.05) 100%)",
          border: "1px solid rgba(255, 96, 0, 0.35)",
          borderRadius: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #ff6000 0%, #ff8c37 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 4px 15px rgba(255, 96, 0, 0.4)",
            }}
          >
            <Coins size={22} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>
                Creator Royalty Vault:
              </span>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--solana-cyan)" }}>
                {creatorHandle}
              </span>
              <span className="badge badge-purple" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>
                1% Fee Escrow
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "2px" }}>
              <span className="mono" style={{ fontSize: "1.25rem", fontWeight: 800, color: "#14f195" }}>
                {unclaimedSol.toFixed(4)} SOL
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                ≈ ${unclaimedUsd.toFixed(2)} USD {isClaimed ? "(Wallet Linked)" : "(Unclaimed)"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsClaimModalOpen(true)}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #14f195 0%, #00f0ff 100%)",
            color: "#0a0e17",
            fontWeight: 800,
            fontSize: "0.85rem",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 16px rgba(20, 241, 149, 0.3)",
            transition: "transform 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <Sparkles size={16} />
          <span>{isClaimed ? "Manage Payouts" : "Claim Creator Royalties"}</span>
        </button>
      </div>

      {/* Claim Modal */}
      {isClaimModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 300,
            padding: "16px",
          }}
        >
          <div
            className="glass-panel-elevated"
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "28px",
              position: "relative",
              border: "1px solid rgba(20, 241, 149, 0.4)",
              borderRadius: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Coins size={24} color="#14f195" />
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>
                  Claim Royalties for {creatorHandle}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsClaimModalOpen(false);
                  setClaimSuccessMsg(null);
                }}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {claimSuccessMsg ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <CheckCircle2 size={48} color="#14f195" style={{ margin: "0 auto 12px" }} />
                <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#14f195" }}>Payout Address Registered!</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "6px" }}>
                  {claimSuccessMsg}
                </p>
                <button
                  onClick={() => {
                    setIsClaimModalOpen(false);
                    setClaimSuccessMsg(null);
                  }}
                  className="btn-primary"
                  style={{ marginTop: "16px", width: "100%" }}
                >
                  Done
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: "12px", padding: "14px", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Accrued Unclaimed Royalties</div>
                  <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 800, color: "#14f195", marginTop: "4px" }}>
                    {unclaimedSol.toFixed(4)} SOL <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>(${unclaimedUsd.toFixed(2)})</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    1% of all buys and sells automatically stream into this vault permanently.
                  </div>
                </div>

                <div style={{ fontSize: "0.85rem", lineHeight: 1.5, color: "#cbd5e1" }}>
                  <b>Are you {creatorHandle} on TikTok?</b><br />
                  Prove ownership by connecting your TikTok or pasting your Solana payout wallet below to withdraw your accumulated royalties:
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Your Solana Payout Wallet Address (Phantom / Solflare / Coinbase)
                  </label>
                  <input
                    type="text"
                    value={payoutAddress}
                    onChange={(e) => setPayoutAddress(e.target.value)}
                    placeholder="e.g. 7WdK...9R2e"
                    className="mono"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      color: "#fff",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                <button
                  onClick={handleClaim}
                  disabled={isClaiming || !payoutAddress.trim()}
                  className="btn-primary"
                  style={{
                    padding: "14px",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {isClaiming ? "Verifying & Transferring SOL..." : "Claim & Route Royalties to Wallet"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
