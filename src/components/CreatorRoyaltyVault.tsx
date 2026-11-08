import React, { useState } from "react";
import { Token } from "../types";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import { claimRoyaltiesOnChain } from "../services/solanaOnChain";
import {
  Coins,
  CheckCircle2,
  ShieldCheck,
  X,
  ExternalLink,
  Zap,
  Wallet,
} from "lucide-react";

interface CreatorRoyaltyVaultProps {
  token: Token;
  onUpdateToken: (updated: Token) => void;
}

export const CreatorRoyaltyVault: React.FC<CreatorRoyaltyVaultProps> = ({
  token,
  onUpdateToken,
}) => {
  const { publicKey, network, executeTradeAssets, notifyTx } = useWallet();
  const { currentUser } = useAuth();

  const [claimType, setClaimType] = useState<"creator" | "launcher" | null>(null);
  const [payoutAddress, setPayoutAddress] = useState(publicKey || currentUser?.solanaWallet || "");
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccessTx, setClaimSuccessTx] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const split = token.feeSplit || "split_50_50";
  const creatorSol = token.unclaimedCreatorFeesSol || 0;
  const launcherSol = token.unclaimedLauncherFeesSol || 0;

  const getResolvedCreatorHandle = (): string => {
    if (
      token.creatorHandle &&
      token.creatorHandle !== "@creator" &&
      token.creatorHandle !== "@tiktok_creator"
    ) {
      return token.creatorHandle;
    }
    const videoUrl = token.videoUrl || token.socials?.website || "";
    if (videoUrl) {
      const match = videoUrl.match(/@([^/?#]+)/);
      if (match) return `@${match[1]}`;
    }
    if (
      token.creator &&
      token.creator.startsWith("@") &&
      token.creator !== "@creator" &&
      token.creator !== "@tiktok_creator"
    ) {
      return token.creator;
    }
    return "";
  };

  const creatorHandle = getResolvedCreatorHandle();
  const connectedWallet = publicKey || currentUser?.solanaWallet || "";
  const connectedHandle = currentUser?.username ? `@${currentUser.username.toLowerCase()}` : "";

  const isAuthorizedForRole = (role: "creator" | "launcher"): boolean => {
    if (role === "launcher") {
      if (token.launcherWallet && connectedWallet && token.launcherWallet === connectedWallet) {
        return true;
      }
      if (
        token.launcherHandle &&
        connectedHandle &&
        token.launcherHandle.toLowerCase() === connectedHandle
      ) {
        return true;
      }
      return !token.launcherWallet;
    } else {
      if (token.creatorWallet && connectedWallet && token.creatorWallet === connectedWallet) {
        return true;
      }
      if (
        creatorHandle &&
        connectedHandle &&
        creatorHandle.toLowerCase() === connectedHandle
      ) {
        return true;
      }
      if (token.launcherWallet && connectedWallet && token.launcherWallet === connectedWallet && !token.creatorWallet) {
        return true;
      }
      return false;
    }
  };

  const handleOpenClaimModal = (role: "creator" | "launcher") => {
    setClaimType(role);
    setPayoutAddress(publicKey || currentUser?.solanaWallet || "");
    setClaimSuccessTx(null);
    setAuthError(null);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimType) return;
    setAuthError(null);

    const targetWallet = (payoutAddress || connectedWallet).trim();
    if (!targetWallet || targetWallet.length < 32) {
      setAuthError("Please connect your wallet or enter a valid Solana wallet address.");
      return;
    }

    if (!isAuthorizedForRole(claimType)) {
      setAuthError(
        claimType === "creator"
          ? `Connected wallet (${connectedWallet.slice(0, 6)}...) does not match creator ${creatorHandle || token.creatorWallet || "record"}.`
          : `Connected wallet (${connectedWallet.slice(0, 6)}...) does not match launcher ${token.launcherWallet?.slice(0, 6) || token.launcherHandle || "record"}.`
      );
      return;
    }

    const claimSol = claimType === "creator" ? creatorSol : launcherSol;

    setIsClaiming(true);
    try {
      const { txSignature } = await claimRoyaltiesOnChain({
        network,
        mintAddress: token.mint,
        symbol: token.symbol,
        role: claimType,
        claimSolAmount: claimSol,
        payoutWallet: targetWallet,
      });

      if (claimSol > 0) {
        executeTradeAssets({
          solDelta: claimSol,
          mint: token.mint,
          tokenDelta: 0,
        });
      }

      const updatedToken: Token =
        claimType === "creator"
          ? {
              ...token,
              creatorWallet: targetWallet,
              unclaimedCreatorFeesSol: 0,
              claimedCreatorFeesSol: (token.claimedCreatorFeesSol || 0) + claimSol,
            }
          : {
              ...token,
              launcherWallet: targetWallet,
              unclaimedLauncherFeesSol: 0,
              claimedLauncherFeesSol: (token.claimedLauncherFeesSol || 0) + claimSol,
            };

      onUpdateToken(updatedToken);
      setClaimSuccessTx(txSignature);
      notifyTx(
        txSignature,
        `CLAIMED ${claimSol.toFixed(4)} SOL ${claimType.toUpperCase()} ROYALTIES ($${token.symbol})`
      );
    } catch (err: any) {
      setAuthError(err?.message || "Wallet signature cancelled or failed.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: "16px 20px",
        background:
          "linear-gradient(135deg, rgba(255, 96, 0, 0.08) 0%, rgba(20, 241, 149, 0.05) 100%)",
        border: "1px solid rgba(255, 96, 0, 0.3)",
        borderRadius: "var(--radius-md)",
      }}
    >
      {/* Top Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Coins size={18} color="#ff8c37" />
          <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#fff" }}>
            1% Creator Royalty Vaults
          </span>
        </div>

        <span
          style={{
            fontSize: "0.72rem",
            padding: "4px 10px",
            borderRadius: "999px",
            background: "rgba(153, 69, 255, 0.15)",
            color: "#c084fc",
            border: "1px solid rgba(153, 69, 255, 0.35)",
            fontWeight: 700,
          }}
        >
          ⚡{" "}
          {split === "creator_100"
            ? "100% Video Creator"
            : split === "launcher_100"
            ? "100% Coin Launcher"
            : "50 / 50 Split (Creator & Launcher)"}
        </span>
      </div>

      {/* Vaults Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "12px",
        }}
      >
        {/* Creator Vault */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(10, 11, 16, 0.65)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Video Owner:{" "}
              <b style={{ color: "var(--solana-cyan)" }}>
                {creatorHandle || (token.creatorWallet ? `${token.creatorWallet.slice(0, 4)}...${token.creatorWallet.slice(-4)}` : "Unclaimed")}
              </b>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
              <span
                className="mono"
                style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--solana-green)" }}
              >
                {creatorSol.toFixed(4)} SOL
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                (${(creatorSol * 150).toFixed(2)})
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenClaimModal("creator")}
            className={creatorSol > 0 ? "btn-primary" : "btn-secondary"}
            style={{ padding: "8px 12px", fontSize: "0.75rem" }}
          >
            {token.creatorWallet && creatorSol === 0 ? "Wallet Linked" : "Claim as Creator"}
          </button>
        </div>

        {/* Launcher Vault */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(10, 11, 16, 0.65)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Coin Launcher:{" "}
              <b style={{ color: "#ff8c37" }}>
                {token.launcherWallet
                  ? `${token.launcherWallet.slice(0, 4)}...${token.launcherWallet.slice(-4)}`
                  : token.launcherHandle || "Unlinked"}
              </b>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
              <span
                className="mono"
                style={{ fontSize: "1.1rem", fontWeight: 800, color: "#ff8c37" }}
              >
                {launcherSol.toFixed(4)} SOL
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                (${(launcherSol * 150).toFixed(2)})
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenClaimModal("launcher")}
            className="btn-primary"
            style={{ padding: "8px 12px", fontSize: "0.75rem" }}
          >
            {launcherSol > 0
              ? "Claim Fees"
              : token.launcherWallet
              ? "Payout Linked"
              : "Link Wallet"}
          </button>
        </div>
      </div>

      {/* On-Chain Wallet Claim Modal */}
      {claimType && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.82)",
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
              maxWidth: "460px",
              padding: "24px",
              border: "1px solid rgba(255, 96, 0, 0.4)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={20} color="var(--solana-green)" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                  {claimType === "creator"
                    ? "Claim Video Creator Royalties"
                    : "Claim Coin Launcher Royalties"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setClaimType(null)}
                style={{ background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {claimSuccessTx ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px 0",
                  textAlign: "center",
                }}
              >
                <CheckCircle2 size={42} color="var(--solana-green)" />
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#ffffff" }}>
                  Royalties Claimed & Linked On-Chain!
                </div>
                <a
                  href={`https://solscan.io/tx/${encodeURIComponent(claimSuccessTx)}${
                    network === "devnet" ? "?cluster=devnet" : ""
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ padding: "8px 14px", fontSize: "0.8rem" }}
                >
                  <span>View Transaction on Solscan</span>
                  <ExternalLink size={13} />
                </a>
                <button
                  type="button"
                  onClick={() => setClaimType(null)}
                  className="btn-primary"
                  style={{ width: "100%", marginTop: "6px" }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleClaimSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.82rem",
                  }}
                >
                  <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>
                    Unclaimed {claimType === "creator" ? "Creator" : "Launcher"} Vault Balance:
                  </div>
                  <div className="mono" style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--solana-green)" }}>
                    {(claimType === "creator" ? creatorSol : launcherSol).toFixed(4)} SOL
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      marginBottom: "6px",
                    }}
                  >
                    Destination Solana Wallet Address
                  </label>
                  <div style={{ position: "relative" }}>
                    <Wallet
                      size={15}
                      color="var(--text-muted)"
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    />
                    <input
                      type="text"
                      required
                      value={payoutAddress}
                      onChange={(e) => setPayoutAddress(e.target.value)}
                      placeholder="Your Solana wallet address..."
                      className="mono"
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 36px",
                        borderRadius: "8px",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        color: "#ffffff",
                        fontSize: "0.82rem",
                      }}
                    />
                  </div>
                </div>

                {authError && (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "rgba(239, 68, 68, 0.14)",
                      border: "1px solid rgba(239, 68, 68, 0.35)",
                      color: "#fca5a5",
                      fontSize: "0.78rem",
                    }}
                  >
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isClaiming}
                  className="btn-primary"
                  style={{ width: "100%", padding: "12px" }}
                >
                  <Zap size={16} />
                  <span>
                    {isClaiming
                      ? "Waiting for Wallet Signature..."
                      : (claimType === "creator" ? creatorSol : launcherSol) > 0
                      ? `Sign & Claim ${(claimType === "creator" ? creatorSol : launcherSol).toFixed(4)} SOL`
                      : "Sign & Verify Payout Wallet"}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
