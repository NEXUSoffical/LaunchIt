import React from "react";
import { X, Video, Zap, Crown, Rocket, GraduationCap, ShieldCheck } from "lucide-react";

interface DeployGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeployGuideModal: React.FC<DeployGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: "16px",
      }}
    >
      <div
        className="glass-panel-elevated"
        style={{
          width: "100%",
          maxWidth: "660px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "32px",
          position: "relative",
          border: "1px solid rgba(255, 96, 0, 0.4)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src="/logo.jpg"
              alt="LaunchIt"
              style={{ width: "42px", height: "42px", borderRadius: "10px", objectFit: "cover", border: "1px solid #ff6000" }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 900 }}>
                  How LAUNCH<span style={{ color: "#ff6000" }}>IT</span> Works
                </h2>
                <span className="badge badge-green">Solana Mainnet</span>
              </div>
              <p style={{ fontSize: "0.82rem", color: "#ff8c37", fontWeight: 600, marginTop: "2px" }}>
                — see it launch it — The Viral Video Launchpad on Solana
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: "transparent", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Steps List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Step 1 */}
          <div
            style={{
              padding: "16px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: "rgba(255, 96, 0, 0.18)",
                  color: "#ff8c37",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Video size={16} />
              </div>
              <h4 style={{ fontSize: "0.98rem", fontWeight: 800 }}>
                1. Turn Any Viral Video Into a Tradeable Solana Coin
              </h4>
            </div>
            <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Click <b>Launch Coin</b> and paste a link from <b>TikTok, YouTube Shorts, Instagram Reels</b>, or upload an <code>.mp4</code> clip. LaunchIt automatically pulls the creator handle and embeds the playable video right inside the coin.
            </p>
          </div>

          {/* Step 2 */}
          <div
            style={{
              padding: "16px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: "rgba(20, 241, 149, 0.16)",
                  color: "var(--solana-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap size={16} />
              </div>
              <h4 style={{ fontSize: "0.98rem", fontWeight: 800 }}>
                2. Scroll Like TikTok & 1-Click Buy With Your Wallet
              </h4>
            </div>
            <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Flip vertically through live video coins on the main feed using your mouse wheel or arrow keys. When you find a video you believe in, hit <b>0.05 SOL, 0.1 SOL, 0.5 SOL, or 1 SOL</b> to buy immediately on-chain with Phantom or Solflare without leaving the video feed.
            </p>
          </div>

          {/* Step 3 */}
          <div
            style={{
              padding: "16px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.18)",
                  color: "var(--solana-amber)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Crown size={16} />
              </div>
              <h4 style={{ fontSize: "0.98rem", fontWeight: 800 }}>
                3. 1% Coin Launcher Royalty Vault (100% to You)
              </h4>
            </div>
            <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Every buy and sell on the bonding curve routes a <b>1% royalty fee</b> directly to the <b>Coin Launcher</b>—the person who minted and launched the coin. Spot a viral video early, launch the coin, and earn <b>100% of the 1% trading royalties</b> on all volume!
            </p>
          </div>

          {/* Step 4 */}
          <div
            style={{
              padding: "16px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: "rgba(153, 69, 255, 0.18)",
                  color: "var(--solana-purple)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GraduationCap size={16} />
              </div>
              <h4 style={{ fontSize: "0.98rem", fontWeight: 800 }}>
                4. Fair-Launch Bonding Curve & 85 SOL Raydium Graduation
              </h4>
            </div>
            <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Every coin launches fairly with <b>1,000,000,000 supply</b> and zero pre-allocation. Once the bonding curve accumulates <b>85 SOL</b> in liquidity, the coin automatically graduates and migrates liquidity to Raydium.
            </p>
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--solana-green)" }}>
            <ShieldCheck size={16} />
            <span>100% Wallet-Linked • Zero Email/Password Required</span>
          </div>
          <button onClick={onClose} className="btn-primary" style={{ padding: "10px 24px" }}>
            <Rocket size={16} />
            <span>Start Scrolling & Launching</span>
          </button>
        </div>
      </div>
    </div>
  );
};
