import React, { useState } from "react";
import { Token } from "../types";
import { useWallet } from "../context/WalletContext";
import { X, Sparkles, Image, ShieldCheck, Zap } from "lucide-react";

interface CreateTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenCreated: (token: Token) => void;
}

export const CreateTokenModal: React.FC<CreateTokenModalProps> = ({
  isOpen,
  onClose,
  onTokenCreated,
}) => {
  const { balance, deductSol, updateTokenBalance } = useWallet();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [website, setWebsite] = useState("");
  const [initialBuySol, setInitialBuySol] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !symbol) return;

    setIsSubmitting(true);

    const initialBuy = parseFloat(initialBuySol) || 0;
    if (initialBuy > 0) {
      deductSol(initialBuy);
    }

    // Generate simulated mint address
    const fakeMint = `Gen${Math.random().toString(36).substring(2, 8).toUpperCase()}${Math.random().toString(36).substring(2, 10)}Xv7`;

    // Calculate initial curve states
    const realSol = initialBuy * 0.99;
    const initialTokensBought = initialBuy > 0 ? (initialBuy * 10_000_000) : 0;
    const realTokens = 800_000_000 - initialTokensBought;

    if (initialBuy > 0) {
      updateTokenBalance(fakeMint, initialTokensBought);
    }

    const defaultImg = imageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80";

    const newToken: Token = {
      id: `token-${Date.now()}`,
      mint: fakeMint,
      name,
      symbol: symbol.toUpperCase(),
      description: description || "No description provided.",
      image: defaultImg,
      creator: "You (Sol9...8jE1)",
      marketCapSol: 30.0 + realSol,
      marketCapUsd: (30.0 + realSol) * 150,
      priceSol: 0.00000003,
      progressPercent: (realSol / 85.0) * 100,
      realSolReserves: realSol,
      realTokenReserves: realTokens,
      volume24hSol: initialBuy,
      repliesCount: 0,
      isGraduated: false,
      createdAt: Date.now(),
      socials: {
        twitter: twitter || undefined,
        telegram: telegram || undefined,
        website: website || undefined,
      },
    };

    onTokenCreated(newToken);
    setIsSubmitting(false);
    onClose();
  };

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
          maxWidth: "540px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "28px",
          position: "relative",
          border: "1px solid rgba(153, 69, 255, 0.3)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #14F195 0%, #9945FF 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={20} color="#07090e" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Launch Token-2022 Coin</h2>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Zero Metaplex Fees • 100% Fair Launch Curve
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: "transparent", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Free Token-2022 Info Callout */}
        <div
          style={{
            padding: "12px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(20, 241, 149, 0.08)",
            border: "1px solid rgba(20, 241, 149, 0.2)",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <ShieldCheck size={18} color="var(--solana-green)" style={{ flexShrink: 0 }} />
          <span>
            Using <b>Token-2022 embedded metadata pointer</b>. Mint cost is just ~0.002 SOL rent instead of 0.02 SOL Metaplex legacy fees.
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Token Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Cyber Matrix"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Ticker / Symbol *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MATRIX"
                maxLength={10}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  color: "var(--solana-cyan)",
                  fontSize: "0.9rem",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
              Description
            </label>
            <textarea
              rows={3}
              placeholder="What makes your coin unique? Lore, vision, roadmap..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 12px",
                color: "#ffffff",
                fontSize: "0.88rem",
                resize: "vertical",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
              Image URL / Logo
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="url"
                placeholder="https://... (or leave empty for cyber logo)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                style={{
                  flex: 1,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                }}
              />
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Preview"
                  style={{ width: "42px", height: "42px", borderRadius: "8px", objectFit: "cover" }}
                />
              )}
            </div>
          </div>

          {/* Socials Accordion */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Twitter (X)
              </label>
              <input
                type="text"
                placeholder="https://x.com/..."
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 10px",
                  color: "#ffffff",
                  fontSize: "0.8rem",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Telegram
              </label>
              <input
                type="text"
                placeholder="https://t.me/..."
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 10px",
                  color: "#ffffff",
                  fontSize: "0.8rem",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Website
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 10px",
                  color: "#ffffff",
                  fontSize: "0.8rem",
                }}
              />
            </div>
          </div>

          {/* Optional Creator Initial Buy */}
          <div
            style={{
              padding: "14px",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "6px" }}>
              <span style={{ fontWeight: 600 }}>Initial Creator Buy (Optional)</span>
              <span style={{ color: "var(--text-muted)" }}>Balance: {balance.toFixed(2)} SOL</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="0.0 (Buy tokens in deployment tx)"
                value={initialBuySol}
                onChange={(e) => setInitialBuySol(e.target.value)}
                className="mono"
                style={{
                  flex: 1,
                  background: "var(--bg-dark)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                }}
              />
              <span className="mono" style={{ color: "var(--solana-green)", fontWeight: 700 }}>SOL</span>
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{
              marginTop: "8px",
              padding: "14px",
              fontSize: "1rem",
              width: "100%",
            }}
          >
            <Zap size={18} />
            <span>{isSubmitting ? "Minting Token-2022..." : "Create & Launch on Bonding Curve"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
