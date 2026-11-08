import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Coins,
  Sparkles,
  X,
  ExternalLink,
} from "lucide-react";

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, getReferralLink } = useAuth();
  const { connect } = useWallet();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const referralLink = currentUser ? getReferralLink() : "https://www.launchit.world";
  const friendsCount = currentUser?.referralCount || 0;
  const earningsSol = currentUser?.referralEarningsSol || 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = encodeURIComponent(
    `🔥 Trade viral TikTok & video meme coins live on Solana at LaunchIt!\n\nUse my invite link for 0 SOL creation & instant trading:\n${referralLink}\n\n#LaunchIt #Solana $LAUNCHIT`
  );
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${shareText}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "linear-gradient(180deg, #121824 0%, #0c1017 100%)",
          border: "1px solid rgba(255, 140, 55, 0.35)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 140, 55, 0.15)",
          borderRadius: "20px",
          padding: "24px",
          position: "relative",
          color: "#fff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#94a3b8",
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, rgba(255, 96, 0, 0.25), rgba(245, 158, 11, 0.25))",
              border: "1px solid rgba(255, 140, 55, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Gift size={24} color="#ff8c37" />
          </div>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 900, margin: 0, letterSpacing: "-0.3px" }}>
              Refer Friends & Earn <span style={{ color: "#ff8c37" }}>SOL</span>
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
              Earn 20% of platform trading fees on everyone you invite, forever!
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "10px",
            margin: "20px 0",
          }}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", color: "#94a3b8", fontSize: "0.72rem", marginBottom: "4px" }}>
              <Users size={12} />
              <span>Friends Invited</span>
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff" }}>
              {friendsCount}
            </div>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", color: "var(--solana-green)", fontSize: "0.72rem", marginBottom: "4px" }}>
              <Coins size={12} />
              <span>SOL Earned</span>
            </div>
            <div className="mono" style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--solana-green)" }}>
              {earningsSol.toFixed(4)}
            </div>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", color: "#ff8c37", fontSize: "0.72rem", marginBottom: "4px" }}>
              <Sparkles size={12} />
              <span>Fee Split</span>
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ff8c37" }}>
              20%
            </div>
          </div>
        </div>

        {/* Link Share Box */}
        {currentUser ? (
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "8px" }}>
              Your Unique Invite Link
            </label>
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "10px",
                padding: "8px 12px",
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: "0.82rem",
                  color: "var(--solana-cyan)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {referralLink}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  background: copied ? "var(--solana-green)" : "rgba(255, 140, 55, 0.2)",
                  color: copied ? "#000" : "#ff8c37",
                  border: copied ? "none" : "1px solid rgba(255, 140, 55, 0.4)",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>

            {/* Share on X button */}
            <div style={{ marginTop: "12px" }}>
              <a
                href={twitterShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "10px 16px",
                  background: "#1d9bf0",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                  borderRadius: "10px",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(29, 155, 240, 0.4)",
                  transition: "transform 0.15s ease",
                  boxSizing: "border-box",
                }}
              >
                <Share2 size={16} />
                <span>Share Invite on X (Twitter)</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: "16px",
              background: "rgba(255, 96, 0, 0.08)",
              border: "1px dashed rgba(255, 96, 0, 0.3)",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "#cbd5e1" }}>
              Connect your Solana wallet to unlock your unique referral link and start earning.
            </p>
            <button
              onClick={() => {
                connect();
                onClose();
              }}
              className="btn-primary"
              style={{ padding: "8px 16px", fontSize: "0.85rem" }}
            >
              Connect Wallet to Earn
            </button>
          </div>
        )}

        {/* How it works */}
        <div style={{ marginTop: "24px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "16px" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
            How Referrals Work
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{ background: "rgba(255, 140, 55, 0.2)", color: "#ff8c37", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800, flexShrink: 0 }}>
                1
              </div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8", lineHeight: "1.4" }}>
                <strong style={{ color: "#fff" }}>Share your invite link:</strong> Post it on X, TikTok, Discord, or Telegram.
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{ background: "rgba(20, 241, 149, 0.2)", color: "var(--solana-green)", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800, flexShrink: 0 }}>
                2
              </div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8", lineHeight: "1.4" }}>
                <strong style={{ color: "#fff" }}>Friends trade coins:</strong> Whenever someone who signed up via your link buys or sells on LaunchIt.
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{ background: "rgba(0, 240, 255, 0.2)", color: "var(--solana-cyan)", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800, flexShrink: 0 }}>
                3
              </div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8", lineHeight: "1.4" }}>
                <strong style={{ color: "#fff" }}>Instant SOL Rewards:</strong> 20% of LaunchIt platform fees route directly to you non-custodially on-chain!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
