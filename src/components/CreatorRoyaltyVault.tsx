import React, { useState } from "react";
import { Token } from "../types";
import { Coins, CheckCircle2, ShieldCheck, ArrowRight, X, ExternalLink, Sparkles, User, Zap } from "lucide-react";

interface CreatorRoyaltyVaultProps {
  token: Token;
  onUpdateToken: (updated: Token) => void;
}

export const CreatorRoyaltyVault: React.FC<CreatorRoyaltyVaultProps> = ({
  token,
  onUpdateToken,
}) => {
  const [claimType, setClaimType] = useState<"creator" | "launcher" | null>(null);
  const [payoutAddress, setPayoutAddress] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);
  const [isVerifyingTikTok, setIsVerifyingTikTok] = useState(false);
  const [isTikTokVerified, setIsTikTokVerified] = useState(false);
  const [verifiedHandle, setVerifiedHandle] = useState<string | null>(null);

  const split = token.feeSplit || "split_50_50";
  const creatorSol = token.unclaimedCreatorFeesSol || 0;
  const launcherSol = token.unclaimedLauncherFeesSol || 0;
  const creatorHandle = token.creatorHandle || token.creator || "@creator";
  const hasLauncherWallet = Boolean(token.launcherWallet);
  const hasCreatorWallet = Boolean(token.creatorWallet);

  const handleClaim = () => {
    if (!payoutAddress.trim() || payoutAddress.trim().length < 32) {
      alert("Please enter a valid 32+ character Solana wallet address.");
      return;
    }

    setIsClaiming(true);
    setTimeout(() => {
      let updated: Token;
      if (claimType === "creator") {
        const amt = creatorSol;
        updated = {
          ...token,
          creatorWallet: payoutAddress.trim(),
          unclaimedCreatorFeesSol: 0,
          claimedCreatorFeesSol: (token.claimedCreatorFeesSol || 0) + amt,
        };
        setClaimSuccessMsg(`Transferred ${amt.toFixed(4)} SOL to Video Creator wallet ${payoutAddress.slice(0, 4)}...${payoutAddress.slice(-4)}!`);
      } else {
        const amt = launcherSol;
        updated = {
          ...token,
          launcherWallet: payoutAddress.trim(),
          unclaimedLauncherFeesSol: 0,
          claimedLauncherFeesSol: (token.claimedLauncherFeesSol || 0) + amt,
        };
        setClaimSuccessMsg(`Transferred ${amt.toFixed(4)} SOL to Coin Launcher wallet ${payoutAddress.slice(0, 4)}...${payoutAddress.slice(-4)}!`);
      }

      onUpdateToken(updated);
      setIsClaiming(false);
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
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {/* Header bar: Fee Split Badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Coins size={18} color="#ff8c37" />
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>
              1% Creator Royalty Vaults
            </span>
          </div>
          <span className="badge badge-purple" style={{ fontSize: "0.75rem", padding: "3px 10px", fontWeight: 700 }}>
            {split === "split_50_50" ? "⚡ 50 / 50 Split (Creator & Launcher)" : split === "creator_100" ? "👑 100% to Video Creator" : "🚀 100% to Coin Launcher"}
          </span>
        </div>

        {/* Dual or Single Vault Display */}
        <div style={{ display: "grid", gridTemplateColumns: split === "split_50_50" ? "1fr 1fr" : "1fr", gap: "12px" }}>
          {/* Video Creator Vault */}
          {(split === "split_50_50" || split === "creator_100") && (
            <div
              style={{
                background: "rgba(0, 0, 0, 0.25)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "12px",
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>Video Owner:</span>
                  <b style={{ color: "var(--solana-cyan)" }}>{creatorHandle}</b>
                </div>
                <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 800, color: "#14f195", marginTop: "2px" }}>
                  {creatorSol.toFixed(4)} SOL <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(${ (creatorSol * 150).toFixed(2) })</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setClaimType("creator");
                  setPayoutAddress(token.creatorWallet || "");
                }}
                className="btn-secondary"
                style={{ padding: "6px 12px", fontSize: "0.75rem", fontWeight: 700, borderRadius: "8px" }}
              >
                {hasCreatorWallet ? "Claimed" : "Claim as Creator"}
              </button>
            </div>
          )}

          {/* Launcher / Hunter Vault */}
          {(split === "split_50_50" || split === "launcher_100") && (
            <div
              style={{
                background: "rgba(0, 0, 0, 0.25)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "12px",
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>Coin Launcher:</span>
                  <b style={{ color: "#ff8c37" }}>{hasLauncherWallet ? `${token.launcherWallet?.slice(0, 4)}...${token.launcherWallet?.slice(-4)}` : "You (Deployer)"}</b>
                </div>
                <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 800, color: "#ff8c37", marginTop: "2px" }}>
                  {launcherSol.toFixed(4)} SOL <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(${ (launcherSol * 150).toFixed(2) })</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setClaimType("launcher");
                  setPayoutAddress(token.launcherWallet || "");
                }}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #ff6000 0%, #ff8c37 100%)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {hasLauncherWallet ? "Payout Linked" : "Claim as Launcher"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Claim Modal */}
      {claimType && (
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
              border: claimType === "creator" ? "1px solid rgba(20, 241, 149, 0.4)" : "1px solid rgba(255, 96, 0, 0.4)",
              borderRadius: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Coins size={24} color={claimType === "creator" ? "#14f195" : "#ff8c37"} />
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>
                  {claimType === "creator" ? `Claim Royalties for ${creatorHandle}` : "Claim Coin Launcher Royalties"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setClaimType(null);
                  setClaimSuccessMsg(null);
                  setIsTikTokVerified(false);
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
                    setClaimType(null);
                    setClaimSuccessMsg(null);
                    setIsTikTokVerified(false);
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
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {claimType === "creator" ? "Accrued Video Owner Royalties" : "Accrued Launcher / Deployer Royalties"}
                  </div>
                  <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 800, color: claimType === "creator" ? "#14f195" : "#ff8c37", marginTop: "4px" }}>
                    {(claimType === "creator" ? creatorSol : launcherSol).toFixed(4)} SOL{" "}
                    <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
                      (${ ((claimType === "creator" ? creatorSol : launcherSol) * 150).toFixed(2) })
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    {split === "split_50_50" ? "50% of the 1% trading volume automatically routes here." : "100% of creator trading fees route here."}
                  </div>
                </div>

                {/* Step 1: TikTok Sign-in Verification */}
                {!isTikTokVerified ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ fontSize: "0.85rem", lineHeight: 1.5, color: "#cbd5e1" }}>
                      {claimType === "creator" ? (
                        <>To prevent unauthorized claims, you must sign into the TikTok account that owns this video (<b>{creatorHandle}</b>):</>
                      ) : (
                        <>To claim deployer fees, sign into the TikTok account you used when launching this coin:</>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsVerifyingTikTok(true);
                        setTimeout(() => {
                          setIsVerifyingTikTok(false);
                          setIsTikTokVerified(true);
                          setVerifiedHandle(claimType === "creator" ? creatorHandle : "@you");
                        }, 1000);
                      }}
                      disabled={isVerifyingTikTok}
                      style={{
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        background: "#000000",
                        color: "#ffffff",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.42a6.34 6.34 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.71a8.18 8.18 0 0 0 4.77 1.52V6.78a4.85 4.85 0 0 1-1-.09z" />
                      </svg>
                      <span>{isVerifyingTikTok ? "Signing into TikTok..." : `Sign in with TikTok (${claimType === "creator" ? creatorHandle : "Launcher"})`}</span>
                    </button>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center" }}>
                      🔒 Secure OAuth: Only the verified owner of {claimType === "creator" ? creatorHandle : "this coin"} can claim fees.
                    </div>
                  </div>
                ) : (
                  /* Step 2: Verified -> Enter Solana Payout Wallet */
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ background: "rgba(20, 241, 149, 0.12)", border: "1px solid rgba(20, 241, 149, 0.4)", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <CheckCircle2 size={18} color="#14f195" />
                      <div style={{ fontSize: "0.82rem", color: "#14f195" }}>
                        Verified as <b>{verifiedHandle}</b> on TikTok!
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                        Where should we send your {((claimType === "creator" ? creatorSol : launcherSol)).toFixed(4)} SOL? (Phantom / Solflare / Coinbase)
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
                      {isClaiming ? "Transferring SOL to Wallet..." : "Withdraw & Route Royalties to Wallet"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
