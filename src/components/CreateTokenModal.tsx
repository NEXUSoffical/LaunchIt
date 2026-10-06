import React, { useState } from "react";
import { Token } from "../types";
import { useWallet } from "../context/WalletContext";
import { X, Sparkles, ShieldCheck, Zap, Video, Link2, Share2, CheckCircle2 } from "lucide-react";

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

  const [activeTab, setActiveTab] = useState<"social" | "manual">("social");

  // Social link importer state
  const [videoUrl, setVideoUrl] = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState<"tiktok" | "instagram" | "x" | null>(null);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);

  // Common coin details
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

  const handleVideoUrlChange = (url: string) => {
    setVideoUrl(url);
    if (url.includes("tiktok.com")) {
      setDetectedPlatform("tiktok");
      setName("Viral TikTok Coin");
      setSymbol("TIKTOK");
      setDescription(`Launched directly from TikTok video: ${url}`);
      setPreviewThumbnail("https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80");
    } else if (url.includes("instagram.com")) {
      setDetectedPlatform("instagram");
      setName("Viral Instagram Reel");
      setSymbol("REEL");
      setDescription(`Launched directly from Instagram Reel: ${url}`);
      setPreviewThumbnail("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80");
    } else if (url.includes("x.com") || url.includes("twitter.com")) {
      setDetectedPlatform("x");
      setName("Viral X Post");
      setSymbol("XMEME");
      setDescription(`Launched directly from X (Twitter): ${url}`);
      setPreviewThumbnail("https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=300&auto=format&fit=crop&q=80");
    } else {
      setDetectedPlatform(null);
    }
  };

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
    const initialTokensBought = initialBuy > 0 ? initialBuy * 10_000_000 : 0;
    const realTokens = 800_000_000 - initialTokensBought;

    if (initialBuy > 0) {
      updateTokenBalance(fakeMint, initialTokensBought);
    }

    const finalImg =
      previewThumbnail ||
      imageUrl ||
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80";

    const newToken: Token = {
      id: `token-${Date.now()}`,
      mint: fakeMint,
      name,
      symbol: symbol.toUpperCase(),
      description: description || "Launched on LaunchIt.",
      image: finalImg,
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
          maxWidth: "580px",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "28px",
          position: "relative",
          border: "1px solid rgba(255, 96, 0, 0.4)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/logo.jpg" alt="Logo" style={{ width: "36px", height: "36px", borderRadius: "10px", objectFit: "cover" }} />
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
                LAUNCH<span style={{ color: "#ff6000" }}>IT</span>
              </h2>
              <div style={{ fontSize: "0.75rem", color: "#ff8c37", fontWeight: 600 }}>
                — see it launch it —
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

        {/* In-App TikTok Tagging Callout */}
        <div
          style={{
            padding: "14px",
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, rgba(255, 96, 0, 0.12) 0%, rgba(153, 69, 255, 0.08) 100%)",
            border: "1px solid rgba(255, 96, 0, 0.3)",
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            marginBottom: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ff8c37", fontWeight: 700 }}>
            <Share2 size={16} />
            <span>Launch without leaving TikTok, IG, or X:</span>
          </div>
          <p style={{ lineHeight: "1.4" }}>
            Just comment <b style={{ color: "#ffffff" }}>@LaunchIt $TICKER</b> under any video! Our bot auto-scrapes the video, mints the coin on Solana, and replies with the link in seconds! 🐆
          </p>
        </div>

        {/* Tab switchers */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-md)",
            padding: "4px",
            marginBottom: "18px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("social")}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              background: activeTab === "social" ? "#ff6000" : "transparent",
              color: activeTab === "social" ? "#ffffff" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <Video size={16} />
            Paste TikTok / Reels / X Link
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              background: activeTab === "manual" ? "var(--bg-surface-elevated)" : "transparent",
              color: activeTab === "manual" ? "var(--solana-green)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            Custom Details
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {activeTab === "social" && (
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Viral Video Link (TikTok, Instagram Reel, or X Post)
              </label>
              <div style={{ position: "relative" }}>
                <Link2 size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="url"
                  placeholder="https://www.tiktok.com/@user/video/... or instagram.com/reel/..."
                  value={videoUrl}
                  onChange={(e) => handleVideoUrlChange(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 12px 10px 36px",
                    color: "#ffffff",
                    fontSize: "0.88rem",
                  }}
                />
              </div>

              {detectedPlatform && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                  <span className="badge badge-green">
                    <CheckCircle2 size={12} />
                    Detected: {detectedPlatform.toUpperCase()}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Auto-filled name, symbol, and thumbnail!
                  </span>
                </div>
              )}

              {previewThumbnail && (
                <div style={{ marginTop: "12px", display: "flex", gap: "12px", alignItems: "center", background: "var(--bg-surface)", padding: "10px", borderRadius: "var(--radius-sm)" }}>
                  <img src={previewThumbnail} alt="Preview" style={{ width: "60px", height: "60px", borderRadius: "8px", objectFit: "cover" }} />
                  <div>
                    <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--solana-cyan)" }}>${symbol}</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{name}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Core Name & Symbol */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Token Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Chill Guy"
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
                Ticker Symbol *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CHILL"
                maxLength={10}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  color: "#ff8c37",
                  fontSize: "0.9rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
              Description / Video Lore
            </label>
            <textarea
              rows={2}
              placeholder="Why this video is going viral..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                color: "#ffffff",
                fontSize: "0.85rem",
                resize: "vertical",
              }}
            />
          </div>

          {activeTab === "manual" && (
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Custom Image URL
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                }}
              />
            </div>
          )}

          {/* Optional Creator Buy */}
          <div
            style={{
              padding: "12px",
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
                placeholder="0.0 SOL (Buy tokens in same launch block)"
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

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: "8px",
              padding: "14px",
              fontSize: "1rem",
              fontWeight: 800,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, #ff6000 0%, #ff8c37 100%)",
              color: "#ffffff",
              boxShadow: "0 4px 20px rgba(255, 96, 0, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Zap size={18} />
            <span>{isSubmitting ? "Launching on Solana..." : "Launch Coin Now 🐆"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
