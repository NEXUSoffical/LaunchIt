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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payoutAddress, setPayoutAddress] = useState(publicKey || currentUser?.solanaWallet || "");
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccessTx, setClaimSuccessTx] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // 0.5% of every trade goes to the Coin Launcher
  const launcherSol = (token.unclaimedLauncherFeesSol || 0) + (token.unclaimedCreatorFeesSol || 0);
  const connectedWallet = publicKey || currentUser?.solanaWallet || "";

  // SECURITY: Strictly verify cryptographic Solana wallet address match ONLY.
  // Never authorize royalty claims based on mutable usernames/handles.
  const isAuthorizedLauncher = (): boolean => {
    if (!token.launcherWallet || !connectedWallet) {
      return false;
    }
    return token.launcherWallet === connectedWallet;
  };

  const handleOpenClaimModal = () => {
    setPayoutAddress(token.launcherWallet || publicKey || currentUser?.solanaWallet || "");
    setClaimSuccessTx(null);
    setAuthError(null);
    setIsModalOpen(true);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const targetWallet = (token.launcherWallet || payoutAddress || connectedWallet).trim();
    if (!targetWallet || targetWallet.length < 32) {
      setAuthError("Please connect your wallet or enter a valid Solana wallet address.");
      return;
    }

    if (!isAuthorizedLauncher()) {
      setAuthError(
        `Access Denied: Only the original Coin Launcher wallet (${
          token.launcherWallet
            ? `${token.launcherWallet.slice(0, 6)}...${token.launcherWallet.slice(-4)}`
            : "unassigned"
        }) can sign to claim royalties for $${token.symbol}.`
      );
      return;
    }

    setIsClaiming(true);
    try {
      const { txSignature } = await claimRoyaltiesOnChain({
        network,
        mintAddress: token.mint,
        symbol: token.symbol,
        role: "launcher",
        claimSolAmount: launcherSol,
        payoutWallet: token.launcherWallet || targetWallet,
        expectedLauncherWallet: token.launcherWallet,
      });

      if (launcherSol > 0) {
        executeTradeAssets({
          solDelta: launcherSol,
          mint: token.mint,
          tokenDelta: 0,
        });
      }

      const updatedToken: Token = {
        ...token,
        feeSplit: "split_50_50",
        launcherWallet: token.launcherWallet || targetWallet,
        unclaimedLauncherFeesSol: 0,
        unclaimedCreatorFeesSol: 0,
        claimedLauncherFeesSol: (token.claimedLauncherFeesSol || 0) + launcherSol,
      };

      onUpdateToken(updatedToken);
      setClaimSuccessTx(txSignature);
      notifyTx(
        txSignature,
        `CLAIMED ${launcherSol.toFixed(4)} SOL LAUNCHER ROYALTIES ($${token.symbol})`
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
            Coin Launcher Royalty Vault (0.5% of All Trades)
          </span>
        </div>

        <span
          style={{
            fontSize: "0.72rem",
            padding: "4px 10px",
            borderRadius: "999px",
            background: "rgba(255, 96, 0, 0.16)",
            color: "#ff8c37",
            border: "1px solid rgba(255, 96, 0, 0.4)",
            fontWeight: 700,
          }}
        >
          ⚡ 0.5% Launcher Royalty + 0.5 SOL Graduation Bonus
        </span>
      </div>

      {/* Single Launcher Royalty Vault */}
      <div
        style={{
          padding: "12px 16px",
          borderRadius: "var(--radius-sm)",
          background: "rgba(10, 11, 16, 0.65)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
            Coin Launcher:{" "}
            <b style={{ color: "#ff8c37" }}>
              {token.launcherHandle
                ? `${token.launcherHandle}${
                    token.launcherWallet
                      ? ` (${token.launcherWallet.slice(0, 4)}...${token.launcherWallet.slice(-4)})`
                      : ""
                  }`
                : token.launcherWallet
                ? `${token.launcherWallet.slice(0, 4)}...${token.launcherWallet.slice(-4)}`
                : "Unlinked"}
            </b>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
            <span
              className="mono"
              style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--solana-green)" }}
            >
              {launcherSol.toFixed(4)} SOL
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              (${(launcherSol * 150).toFixed(2)} unclaimed royalties)
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenClaimModal}
          className="btn-primary"
          style={{ padding: "8px 16px", fontSize: "0.78rem" }}
        >
          {launcherSol > 0
            ? `Claim ${launcherSol.toFixed(4)} SOL`
            : token.launcherWallet
            ? "Payout Wallet Linked"
            : "Link Payout Wallet"}
        </button>
      </div>

      {/* On-Chain Wallet Claim Modal */}
      {isModalOpen && (
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
                  Claim Coin Launcher Royalties
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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
                  Launcher Royalties Claimed On-Chain!
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
                  onClick={() => setIsModalOpen(false)}
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
                    Unclaimed Coin Launcher Royalty Balance (1% of all trades):
                  </div>
                  <div className="mono" style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--solana-green)" }}>
                    {launcherSol.toFixed(4)} SOL
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
                      : launcherSol > 0
                      ? `Sign & Claim ${launcherSol.toFixed(4)} SOL`
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
