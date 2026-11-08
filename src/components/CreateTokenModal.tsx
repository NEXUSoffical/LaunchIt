import React, { useState } from "react";
import { Token } from "../types";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import { ClientCurve } from "../utils/curve";
import { deployTokenOnChain } from "../services/solanaOnChain";
import { X, Zap, Video, Link2, Share2, CheckCircle2 } from "lucide-react";

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
  const { balance, network, publicKey, deductSol, updateTokenBalance, notifyTx } = useWallet();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"social" | "manual">("social");

  // Social link importer state
  const [videoUrl, setVideoUrl] = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState<"tiktok" | "instagram" | "x" | null>(null);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [scrapedCreator, setScrapedCreator] = useState<string | null>(null);

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

  const handleVideoUrlChange = async (url: string) => {
    setVideoUrl(url);
    setWebsite(url);

    // Extract @username from URL if present
    const handleMatch = url.match(/@([a-zA-Z0-9_.-]+)/);
    const extractedHandle = handleMatch ? `@${handleMatch[1]}` : null;
    if (extractedHandle) {
      setScrapedCreator(extractedHandle);
    }

    if (url.includes("tiktok.com")) {
      setDetectedPlatform("tiktok");
      try {
        const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.title) {
            const cleanTitle = data.title.split("#")[0].trim().slice(0, 32) || data.author_name || "";
            if (cleanTitle) setName(cleanTitle);
            setDescription(data.title);
          }
          if (data.author_name && !extractedHandle) {
            setScrapedCreator(`@${data.author_name}`);
          }
          if (data.thumbnail_url) {
            setPreviewThumbnail(data.thumbnail_url);
          }
        }
      } catch (_) {}
    } else if (url.includes("instagram.com")) {
      setDetectedPlatform("instagram");
    } else if (url.includes("x.com") || url.includes("twitter.com")) {
      setDetectedPlatform("x");
    } else {
      setDetectedPlatform(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !symbol) return;

    const initialBuy = parseFloat(initialBuySol) || 0;
    if (initialBuy > balance) {
      alert(`Insufficient SOL balance! You have ${balance.toFixed(4)} SOL.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const finalImg = previewThumbnail || imageUrl || "/logo.jpg";

      // Sign & broadcast real on-chain transaction via Phantom / Solflare
      const { mintAddress: mintAddr, txSignature } = await deployTokenOnChain({
        network,
        creatorWallet: publicKey || currentUser?.solanaWallet || "",
        name,
        symbol: symbol.toUpperCase(),
        uri: finalImg,
        initialBuySol: initialBuy,
      });

      if (initialBuy > 0) {
        deductSol(initialBuy);
      }

      const realSol = initialBuy * 0.99;
      const initialTokensBought =
        initialBuy > 0
          ? Math.round(ClientCurve.calculateBuyQuote(initialBuy, 0, 800_000_000).tokensOut || 0)
          : 0;
      const realTokens = 800_000_000 - initialTokensBought;

      if (initialTokensBought > 0) {
        updateTokenBalance(mintAddr, initialTokensBought);
      }

      const creatorIdentity =
        scrapedCreator || (currentUser ? `@${currentUser.username}` : "");

      const newToken: Token = {
        id: `token-${Date.now()}`,
        mint: mintAddr,
        name,
        symbol: symbol.toUpperCase(),
        description: description || "",
        image: finalImg,
        videoUrl: videoUrl.trim() || undefined,
        creator: creatorIdentity,
        creatorHandle: creatorIdentity,
        launcherHandle: currentUser ? `@${currentUser.username}` : creatorIdentity,
        launcherWallet: publicKey || currentUser?.solanaWallet || null,
        feeSplit: "split_50_50",
        unclaimedCreatorFeesSol: initialBuy * 0.005,
        unclaimedLauncherFeesSol: initialBuy * 0.005,
        claimedCreatorFeesSol: 0,
        claimedLauncherFeesSol: 0,
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
          website: website || videoUrl || undefined,
        },
      };

      onTokenCreated(newToken);
      notifyTx(
        txSignature,
        `TOKEN DEPLOYED ON-CHAIN: $${symbol.toUpperCase()} (${mintAddr.slice(0, 6)}...${mintAddr.slice(-4)})`
      );
      onClose();
    } catch (err: any) {
      alert(err?.message || "Transaction rejected or failed in wallet.");
    } finally {
      setIsSubmitting(false);
    }
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
            Just comment <b style={{ color: "#ffffff" }}>@launchit4 $TICKER</b> under any video! Our bot auto-scrapes the video, mints the coin on Solana, and replies with the link in seconds! 🐆
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
                    Auto-filled metadata {scrapedCreator ? `for creator ${scrapedCreator}` : ""}!
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

          <div style={{ display: " flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Token Image (Upload File or Image URL)
            </label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === "string") {
                        setImageUrl(reader.result);
                        setPreviewThumbnail(reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                }}
              />
              <input
                type="url"
                placeholder="Or paste image URL..."
                value={imageUrl.startsWith("data:") ? "" : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                style={{
                  flex: 1,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                }}
              />
            </div>
          </div>

          {/* Token-2022 Creation Fee & Optional Initial Buy */}
          <div
            style={{
              padding: "12px",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                background: "rgba(20, 241, 149, 0.08)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(20, 241, 149, 0.2)",
                fontSize: "0.75rem",
              }}
            >
              <span style={{ color: "var(--solana-green)", display: "flex", alignItems: "center", gap: "5px" }}>
                <span>⚡</span> Token-2022 Rent: <b>0.002 SOL</b>
              </span>
              <span style={{ color: "var(--text-muted)" }}>50/50 Creator & Launcher Royalty Split</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
              <span style={{ fontWeight: 600 }}>Initial Dev / Sniper Buy (Optional)</span>
              <span style={{ color: "var(--text-muted)" }}>Balance: {balance.toFixed(3)} SOL</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="0.0 SOL (Buy tokens in the same launch block)"
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
            <span>{isSubmitting ? "Minting on Solana..." : "Launch Coin on Solana 🚀"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
