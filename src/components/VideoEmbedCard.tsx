import React, { useState, useEffect } from "react";
import { Token } from "../types";
import { Video, ExternalLink, Link2, Check, Edit3, Upload } from "lucide-react";

interface VideoEmbedCardProps {
  token: Token;
  onUpdateToken?: (updatedToken: Token) => void;
}

type ParsedVideo =
  | { type: "tiktok"; id: string; originalUrl: string }
  | { type: "youtube"; id: string; originalUrl: string }
  | { type: "instagram"; id: string; originalUrl: string }
  | { type: "direct"; url: string; originalUrl: string }
  | { type: "external"; originalUrl: string };

function extractVideoUrlFromToken(token: Token): string {
  if (token.videoUrl && token.videoUrl.trim()) return token.videoUrl.trim();

  const candidates = [
    token.socials?.website,
    token.socials?.twitter,
    ...(token.description?.match(/https?:\/\/[^\s"'<>]+/g) || []),
  ].filter(Boolean) as string[];

  for (const url of candidates) {
    const lower = url.toLowerCase();
    if (
      lower.includes("tiktok.com") ||
      lower.includes("youtube.com") ||
      lower.includes("youtu.be") ||
      lower.includes("instagram.com/reel") ||
      lower.includes("instagram.com/p/") ||
      lower.endsWith(".mp4") ||
      lower.endsWith(".webm") ||
      lower.startsWith("data:video/")
    ) {
      return url;
    }
  }

  return "";
}

function parseVideoSource(url: string): ParsedVideo | null {
  if (!url || !url.trim()) return null;
  const clean = url.trim();

  if (
    clean.startsWith("data:video/") ||
    /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(clean)
  ) {
    return { type: "direct", url: clean, originalUrl: clean };
  }

  // TikTok standard URL: https://www.tiktok.com/@user/video/7432109876543210123
  const tiktokMatch = clean.match(/tiktok\.com\/.*?(?:video|v)\/(\d{15,22})/i);
  if (tiktokMatch) {
    return { type: "tiktok", id: tiktokMatch[1], originalUrl: clean };
  }

  // YouTube / YouTube Shorts
  const ytShorts = clean.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (ytShorts) {
    return { type: "youtube", id: ytShorts[1], originalUrl: clean };
  }
  const ytWatch = clean.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytWatch) {
    return { type: "youtube", id: ytWatch[1], originalUrl: clean };
  }

  // Instagram Reels / Posts
  const igMatch = clean.match(/instagram\.com\/(?:reel|reels|p)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch) {
    return { type: "instagram", id: igMatch[1], originalUrl: clean };
  }

  return { type: "external", originalUrl: clean };
}

export const VideoEmbedCard: React.FC<VideoEmbedCardProps> = ({
  token,
  onUpdateToken,
}) => {
  const currentVideoUrl = extractVideoUrlFromToken(token);
  const [resolvedTiktokId, setResolvedTiktokId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputUrl, setInputUrl] = useState(currentVideoUrl);

  useEffect(() => {
    setInputUrl(extractVideoUrlFromToken(token));
    setResolvedTiktokId(null);
  }, [token.mint, token.videoUrl, token.socials?.website]);

  // If user pasted a short TikTok link (e.g. vm.tiktok.com) or TikTok link without numeric ID, resolve via TikTok oEmbed
  useEffect(() => {
    if (!currentVideoUrl || !currentVideoUrl.toLowerCase().includes("tiktok.com")) {
      return;
    }
    const parsed = parseVideoSource(currentVideoUrl);
    if (parsed?.type === "tiktok") return;

    let cancelled = false;
    fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(currentVideoUrl)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const embedIdMatch =
          String(data.embed_product_id || "").match(/^\d{15,22}$/) ||
          String(data.html || "").match(/data-video-id="(\d{15,22})"/);
        if (embedIdMatch) {
          setResolvedTiktokId(embedIdMatch[1] || embedIdMatch[0]);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentVideoUrl]);

  const parsed = parseVideoSource(currentVideoUrl);
  const effectiveVideo: ParsedVideo | null =
    parsed?.type === "external" && resolvedTiktokId
      ? { type: "tiktok", id: resolvedTiktokId, originalUrl: currentVideoUrl }
      : parsed;

  const handleSaveVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputUrl.trim();
    if (!trimmed || !onUpdateToken) return;

    const updated: Token = {
      ...token,
      videoUrl: trimmed,
      socials: {
        ...token.socials,
        website: token.socials?.website || trimmed,
      },
    };
    onUpdateToken(updated);
    setIsEditing(false);
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: "18px",
        border: "1px solid rgba(255, 96, 0, 0.28)",
        background:
          "linear-gradient(180deg, rgba(255, 96, 0, 0.06) 0%, rgba(15, 17, 24, 0.92) 100%)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "rgba(255, 96, 0, 0.16)",
              border: "1px solid rgba(255, 96, 0, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ff8c37",
            }}
          >
            <Video size={15} />
          </div>
          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#ffffff" }}>
              Viral Source Video
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              {token.creatorHandle ? `Creator ${token.creatorHandle}` : `Watch & trade $${token.symbol}`}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {currentVideoUrl && !currentVideoUrl.startsWith("data:") && (
            <a
              href={currentVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{
                padding: "5px 9px",
                fontSize: "0.72rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>Original</span>
              <ExternalLink size={11} />
            </a>
          )}
          {onUpdateToken && (
            <button
              type="button"
              onClick={() => setIsEditing((v) => !v)}
              className="btn-secondary"
              style={{
                padding: "5px 9px",
                fontSize: "0.72rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Edit3 size={11} />
              <span>{currentVideoUrl ? "Change" : "Attach Video"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Attach / Update Video Form */}
      {(isEditing || !effectiveVideo) && onUpdateToken && (
        <form
          onSubmit={handleSaveVideo}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: effectiveVideo ? "14px" : "0",
            padding: "12px",
            borderRadius: "10px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>
            Paste a TikTok, YouTube Short, Instagram Reel, or direct `.mp4` link to embed the playable video for{" "}
            <b style={{ color: "#ff8c37" }}>${token.symbol}</b>:
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Link2
                size={14}
                color="var(--text-muted)"
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type="url"
                placeholder="https://www.tiktok.com/@creator/video/..."
                value={inputUrl.startsWith("data:") ? "" : inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px 8px 30px",
                  borderRadius: "8px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-subtle)",
                  color: "#ffffff",
                  fontSize: "0.8rem",
                }}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: "8px 12px", fontSize: "0.78rem", whiteSpace: "nowrap" }}
            >
              <Check size={14} />
              <span>Embed</span>
            </button>
          </div>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.74rem",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <Upload size={13} />
            <span>Or upload a video file (.mp4 / .webm)</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") {
                    const updated: Token = {
                      ...token,
                      videoUrl: reader.result,
                    };
                    onUpdateToken(updated);
                    setIsEditing(false);
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
        </form>
      )}

      {/* Playable Video Player */}
      {effectiveVideo && (
        <div
          style={{
            width: "100%",
            borderRadius: "12px",
            overflow: "hidden",
            background: "#000000",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {effectiveVideo.type === "tiktok" && (
            <iframe
              src={`https://www.tiktok.com/player/v1/${effectiveVideo.id}?music_info=1&description=1&rel=0`}
              title={`${token.name} TikTok Video`}
              style={{
                width: "100%",
                height: "540px",
                border: "none",
                display: "block",
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}

          {effectiveVideo.type === "youtube" && (
            <iframe
              src={`https://www.youtube.com/embed/${effectiveVideo.id}?rel=0`}
              title={`${token.name} YouTube Video`}
              style={{
                width: "100%",
                height: "440px",
                border: "none",
                display: "block",
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}

          {effectiveVideo.type === "instagram" && (
            <iframe
              src={`https://www.instagram.com/reel/${effectiveVideo.id}/embed`}
              title={`${token.name} Instagram Reel`}
              style={{
                width: "100%",
                height: "520px",
                border: "none",
                display: "block",
              }}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}

          {effectiveVideo.type === "direct" && (
            <video
              src={effectiveVideo.url}
              controls
              playsInline
              loop
              style={{
                width: "100%",
                maxHeight: "520px",
                display: "block",
                background: "#000",
              }}
            />
          )}

          {effectiveVideo.type === "external" && (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                External media link attached to <b>${token.symbol}</b>
              </div>
              <a
                href={effectiveVideo.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ padding: "8px 16px", fontSize: "0.8rem" }}
              >
                <span>Open Viral Clip</span>
                <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
