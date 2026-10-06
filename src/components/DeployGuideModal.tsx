import React from "react";
import { X, CheckCircle, Terminal, Globe, Cpu, Shield, ArrowRight } from "lucide-react";

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
        backgroundColor: "rgba(0, 0, 0, 0.8)",
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
          maxWidth: "680px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "32px",
          position: "relative",
          border: "1px solid rgba(0, 240, 255, 0.3)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>$0 100% Free Deployment Architecture</h2>
              <span className="badge badge-green">Zero Cost</span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>
              How this launchpad runs with zero subscription fees, zero server costs, and free devnet testing.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{ background: "transparent", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Steps List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
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
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--solana-cyan)", color: "#000", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem" }}>1</div>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Smart Contract: Solana Playground (Zero Local Setup)</h4>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              You don't need a heavy Rust toolchain installed locally. Open <b>beta.solpg.io</b> in your browser, paste the Rust files from <code>program/src/</code>, click <b>Build & Deploy to Devnet</b>. It automatically funds your devnet wallet and deploys for free!
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
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--solana-green)", color: "#000", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem" }}>2</div>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Token-2022: Saves ~0.02 SOL Per Launch</h4>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Standard launchpads (like Pump.fun) use Metaplex Token Metadata which costs ~0.015-0.02 SOL per launch. Our launchpad uses <b>Token-2022's on-chain metadata pointer extension</b>, eliminating Metaplex rent and allowing instant on-chain token creation for just ~0.002 SOL!
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
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--solana-purple)", color: "#fff", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem" }}>3</div>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Zero Server Hosting: Vercel or Cloudflare Pages</h4>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Because our architecture uses <b>client-side direct Solana WebSockets</b>, you do not need an expensive Node.js server. Simply run <code>npm run build</code> and host the <code>dist/</code> folder on Vercel or Cloudflare Pages for 100% free with custom domain and SSL.
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
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--solana-amber)", color: "#000", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem" }}>4</div>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Free RPC Tiers: Helius & QuickNode</h4>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Get a free API key at <b>helius.dev</b> (100k daily credits + WebSocket webhooks) or use public Devnet RPC <code>https://api.devnet.solana.com</code>.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="btn-primary"
          style={{ width: "100%", marginTop: "24px", padding: "12px" }}
        >
          Got it! Take me to Launchpad
        </button>
      </div>
    </div>
  );
};
