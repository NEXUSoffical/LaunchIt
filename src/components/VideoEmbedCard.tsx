import React, { useState, useEffect, useRef } from "react";
import { Token } from "../types";
import { ChatMessage } from "../types/auth";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import {
  fetchSharedCommunityForMint,
  subscribeSharedDb,
  syncAddMessage,
} from "../services/dbSync";
import {
  Video,
  ExternalLink,
  Link2,
  Check,
  Edit3,
  Upload,
  Heart,
  MessageSquare,
  Send,
  Volume2,
  VolumeX,
} from "lucide-react";

interface VideoEmbedCardProps {
  token: Token;
  onUpdateToken?: (updatedToken: Token) => void;
  isActive?: boolean;
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
  isActive,
}) => {
  const { currentUser } = useAuth();
  const { publicKey } = useWallet();

  const cardRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const currentVideoUrl = extractVideoUrlFromToken(token);
  const [resolvedTiktokId, setResolvedTiktokId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputUrl, setInputUrl] = useState(currentVideoUrl);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");

  // IntersectionObserver to detect when video scrolls into/out of view
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsIntersecting(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsIntersecting(entry.isIntersecting);
        });
      },
      {
        threshold: 0.45,
      }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const shouldPlay = isActive !== undefined ? isActive : isIntersecting;

  // Autoplay when scrolled onto, pause when scrolled away
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (shouldPlay) {
      video.muted = isMuted;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser policy blocked unmuted playback, fallback to muted autoplay
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      }
    } else {
      video.pause();
    }
  }, [shouldPlay, isMuted]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (videoRef.current.paused && shouldPlay) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // Comments synced with shared database
  const [comments, setComments] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(`launchit_chat_${token.mint}`);
      if (stored) {
        const parsed: ChatMessage[] = JSON.parse(stored);
        return parsed.filter((m) => !m.authorId?.startsWith("usr_seed_"));
      }
    } catch (_) {}
    return [];
  });

  useEffect(() => {
    setInputUrl(extractVideoUrlFromToken(token));
    setResolvedTiktokId(null);
  }, [token.mint, token.videoUrl, token.socials?.website]);

  useEffect(() => {
    let active = true;
    fetchSharedCommunityForMint(token.mint, [], comments).then((res) => {
      if (!active) return;
      if (Array.isArray(res.messages)) {
        setComments(res.messages);
      }
    });

    const unsubscribe = subscribeSharedDb({
      onMessagesUpdate: (mint, updatedMessages) => {
        if (mint === token.mint) {
          setComments(updatedMessages);
        }
      },
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [token.mint]);

  // Resolve short TikTok links via TikTok oEmbed
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

  const userIdentifier = publicKey || currentUser?.id || currentUser?.solanaWallet || "anon";
  const currentLikes = Array.isArray(token.likes) ? token.likes : [];
  const hasLiked = currentLikes.includes(userIdentifier);

  const handleToggleLike = () => {
    if (!onUpdateToken) return;
    const nextLikes = hasLiked
      ? currentLikes.filter((id) => id !== userIdentifier)
      : [...currentLikes, userIdentifier];
    onUpdateToken({
      ...token,
      likes: nextLikes,
    });
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const authorName =
      currentUser?.username ||
      (publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : "Trader");

    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      mint: token.mint,
      authorId: userIdentifier,
      authorUsername: authorName,
      authorAvatar: currentUser?.avatarUrl || "/logo.jpg",
      text: commentInput.trim(),
      timestamp: Date.now(),
    };

    const nextComments = [...comments, newMsg];
    setComments(nextComments);
    try {
      localStorage.setItem(`launchit_chat_${token.mint}`, JSON.stringify(nextComments));
    } catch (_) {}
    syncAddMessage(newMsg);

    if (onUpdateToken) {
      onUpdateToken({
        ...token,
        repliesCount: nextComments.length,
      });
    }
    setCommentInput("");
  };

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
      ref={cardRef}
      className="glass-panel"
      style={{
        padding: "16px",
        border: "1px solid rgba(255, 96, 0, 0.28)",
        background:
          "linear-gradient(180deg, rgba(255, 96, 0, 0.06) 0%, rgba(15, 17, 24, 0.94) 100%)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
              src={
                shouldPlay
                  ? `https://www.tiktok.com/player/v1/${effectiveVideo.id}?autoplay=1&mute=1&music_info=1&description=1&rel=0`
                  : `https://www.tiktok.com/player/v1/${effectiveVideo.id}?autoplay=0&music_info=1&description=1&rel=0`
              }
              title={`${token.name} TikTok Video`}
              style={{
                width: "100%",
                height: "420px",
                border: "none",
                display: "block",
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}

          {effectiveVideo.type === "youtube" && (
            <iframe
              src={
                shouldPlay
                  ? `https://www.youtube.com/embed/${effectiveVideo.id}?autoplay=1&mute=1&loop=1&playlist=${effectiveVideo.id}&playsinline=1&rel=0`
                  : `https://www.youtube.com/embed/${effectiveVideo.id}?autoplay=0&rel=0`
              }
              title={`${token.name} YouTube Video`}
              style={{
                width: "100%",
                height: "360px",
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
                height: "420px",
                border: "none",
                display: "block",
              }}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}

          {effectiveVideo.type === "direct" && (
            <div style={{ position: "relative", width: "100%", background: "#000" }}>
              <video
                ref={videoRef}
                src={effectiveVideo.url}
                autoPlay
                playsInline
                loop
                muted={isMuted}
                controls
                style={{
                  width: "100%",
                  maxHeight: "360px",
                  objectFit: "contain",
                  display: "block",
                  background: "#000",
                }}
              />
              <button
                type="button"
                onClick={toggleMute}
                style={{
                  position: "absolute",
                  bottom: "48px",
                  right: "12px",
                  background: "rgba(0, 0, 0, 0.75)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#fff",
                  borderRadius: "999px",
                  padding: "5px 12px",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  zIndex: 10,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                }}
                title={isMuted ? "Click to unmute" : "Click to mute"}
              >
                {isMuted ? (
                  <>
                    <VolumeX size={14} color="#ff8c37" />
                    <span>Unmute</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={14} color="var(--solana-green)" />
                    <span>Mute</span>
                  </>
                )}
              </button>
            </div>
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

      {/* TikTok-Style Like & Comment Action Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          paddingTop: "4px",
        }}
      >
        <button
          type="button"
          onClick={handleToggleLike}
          style={{
            flex: 1,
            padding: "9px 14px",
            borderRadius: "10px",
            background: hasLiked
              ? "linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(255, 96, 0, 0.2) 100%)"
              : "var(--bg-surface)",
            border: hasLiked
              ? "1px solid rgba(244, 63, 94, 0.6)"
              : "1px solid var(--border-subtle)",
            color: hasLiked ? "#fb7185" : "#ffffff",
            fontWeight: 800,
            fontSize: "0.84rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Heart
            size={16}
            fill={hasLiked ? "#f43f5e" : "none"}
            color={hasLiked ? "#f43f5e" : "#ffffff"}
          />
          <span>
            {currentLikes.length} {currentLikes.length === 1 ? "Like" : "Likes"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          style={{
            flex: 1,
            padding: "9px 14px",
            borderRadius: "10px",
            background: showComments
              ? "rgba(255, 96, 0, 0.14)"
              : "var(--bg-surface)",
            border: showComments
              ? "1px solid rgba(255, 96, 0, 0.4)"
              : "1px solid var(--border-subtle)",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "0.84rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            cursor: "pointer",
          }}
        >
          <MessageSquare size={16} color="#ff8c37" />
          <span>
            {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
          </span>
        </button>
      </div>

      {/* Live Video Comments Drawer */}
      {showComments && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Comment Input Form */}
          <form onSubmit={handlePostComment} style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder={`Comment on $${token.symbol} video...`}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              style={{
                flex: 1,
                background: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#ffffff",
                fontSize: "0.8rem",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={!commentInput.trim()}
              className="btn-primary"
              style={{
                padding: "8px 12px",
                fontSize: "0.78rem",
                opacity: commentInput.trim() ? 1 : 0.5,
              }}
            >
              <Send size={13} />
              <span>Post</span>
            </button>
          </form>

          {/* Comments List */}
          <div
            style={{
              maxHeight: "145px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {comments.length > 0 ? (
              [...comments].reverse().map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.03)",
                    fontSize: "0.78rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: "#ff8c37" }}>
                      @{c.authorUsername.replace(/^@/, "")}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                      {new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div style={{ color: "var(--text-primary)", lineHeight: 1.35 }}>{c.text}</div>
                </div>
              ))
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "10px 0",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                }}
              >
                No comments yet — be the first to comment on this video!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
