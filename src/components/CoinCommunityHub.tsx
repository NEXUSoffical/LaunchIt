import React, { useState, useEffect } from "react";
import { Token } from "../types";
import { CoinThesis, ChatMessage } from "../types/auth";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import {
  FileText,
  MessageSquare,
  ThumbsUp,
  Share2,
  TrendingUp,
  TrendingDown,
  Send,
  Plus,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";

interface CoinCommunityHubProps {
  token: Token;
}

export const CoinCommunityHub: React.FC<CoinCommunityHubProps> = ({ token }) => {
  const { currentUser } = useAuth();
  const { userTokens } = useWallet();

  const [activeTab, setActiveTab] = useState<"theses" | "chat">("theses");

  // Theses state
  const [theses, setTheses] = useState<CoinThesis[]>(() => {
    try {
      const stored = localStorage.getItem(`launchit_theses_${token.mint}`);
      if (stored) return JSON.parse(stored);
    } catch (_) {}

    // Default sample thesis to seed active community feeling
    return [
      {
        id: `thesis-${token.mint}-1`,
        mint: token.mint,
        authorId: "usr_seed_1",
        authorUsername: "crypto_prophet",
        authorAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=crypto_prophet&backgroundColor=111420",
        title: `Why $${token.symbol} will easily graduate at 85 SOL and hit Raydium`,
        content: `Viral momentum is accelerating rapidly. The bonding curve constant product mechanics ensure high upside for early buyers. With 0% upfront token rent on Token-2022 and fair distribution, the organic meme velocity here is unmatched. Target is graduation within 48 hours.`,
        sentiment: "bullish",
        targetMarketCapSol: 150.0,
        likes: ["usr_demo_trader"],
        createdAt: Date.now() - 3600000 * 2,
      },
    ];
  });

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(`launchit_chat_${token.mint}`);
      if (stored) return JSON.parse(stored);
    } catch (_) {}

    return [
      {
        id: `msg-${token.mint}-1`,
        mint: token.mint,
        authorId: "usr_seed_2",
        authorUsername: "sol_alpha",
        authorAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=sol_alpha&backgroundColor=111420",
        text: `Just bought 2 SOL on the curve! Let's get $${token.symbol} graduated! 🚀`,
        timestamp: Date.now() - 1000 * 60 * 18,
      },
      {
        id: `msg-${token.mint}-2`,
        mint: token.mint,
        authorId: "usr_seed_3",
        authorUsername: "diamond_hands_sol",
        authorAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=diamond_hands_sol&backgroundColor=111420",
        text: `TikTok video virality is kicking in. Floor is holding strong.`,
        timestamp: Date.now() - 1000 * 60 * 5,
      },
    ];
  });

  // New thesis form state
  const [isPostingThesis, setIsPostingThesis] = useState(false);
  const [thesisTitle, setThesisTitle] = useState("");
  const [thesisContent, setThesisContent] = useState("");
  const [thesisSentiment, setThesisSentiment] = useState<"bullish" | "bearish">("bullish");
  const [thesisTargetCap, setThesisTargetCap] = useState("");

  // Chat input state
  const [chatInput, setChatInput] = useState("");
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem(`launchit_theses_${token.mint}`, JSON.stringify(theses));
    } catch (_) {}
  }, [theses, token.mint]);

  useEffect(() => {
    try {
      localStorage.setItem(`launchit_chat_${token.mint}`, JSON.stringify(messages));
    } catch (_) {}
  }, [messages, token.mint]);

  const handleLikeThesis = (thesisId: string) => {
    if (!currentUser) return;
    setTheses((prev) =>
      prev.map((t) => {
        if (t.id === thesisId) {
          const hasLiked = t.likes.includes(currentUser.id);
          const newLikes = hasLiked
            ? t.likes.filter((id) => id !== currentUser.id)
            : [...t.likes, currentUser.id];
          return { ...t, likes: newLikes };
        }
        return t;
      })
    );
  };

  const handleShareThesis = (thesis: CoinThesis) => {
    navigator.clipboard.writeText(
      `${window.location.origin}/?mint=${token.mint} - Read investment thesis on $${token.symbol} by @${thesis.authorUsername}`
    );
    setShareToast("Thesis link copied to clipboard!");
    setTimeout(() => setShareToast(null), 2000);
  };

  const handleCreateThesis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !thesisTitle.trim() || !thesisContent.trim()) return;

    const newThesis: CoinThesis = {
      id: `thesis-${Date.now()}`,
      mint: token.mint,
      authorId: currentUser.id,
      authorUsername: currentUser.username,
      authorAvatar: currentUser.avatarUrl,
      title: thesisTitle.trim(),
      content: thesisContent.trim(),
      sentiment: thesisSentiment,
      targetMarketCapSol: thesisTargetCap ? parseFloat(thesisTargetCap) : undefined,
      likes: [],
      createdAt: Date.now(),
    };

    setTheses([newThesis, ...theses]);
    setThesisTitle("");
    setThesisContent("");
    setThesisTargetCap("");
    setIsPostingThesis(false);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !chatInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      mint: token.mint,
      authorId: currentUser.id,
      authorUsername: currentUser.username,
      authorAvatar: currentUser.avatarUrl,
      text: chatInput.trim(),
      timestamp: Date.now(),
    };

    setMessages([...messages, newMsg]);
    setChatInput("");
  };

  const isUserHolding = Boolean(userTokens[token.mint] && userTokens[token.mint] > 0);

  return (
    <div
      className="glass-panel"
      style={{
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Toast Notification */}
      {shareToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "rgba(20, 241, 149, 0.95)",
            color: "#07090e",
            fontWeight: 700,
            padding: "10px 18px",
            borderRadius: "10px",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
          }}
        >
          <Check size={16} />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Tabs Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(255, 255, 255, 0.02)",
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setActiveTab("theses")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: activeTab === "theses" ? "rgba(255, 96, 0, 0.15)" : "transparent",
              color: activeTab === "theses" ? "#ff8c37" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: activeTab === "theses" ? "1px solid rgba(255, 96, 0, 0.3)" : "1px solid transparent",
            }}
          >
            <FileText size={16} />
            <span>Coin Theses ({theses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: activeTab === "chat" ? "rgba(20, 241, 149, 0.15)" : "transparent",
              color: activeTab === "chat" ? "var(--solana-green)" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: activeTab === "chat" ? "1px solid rgba(20, 241, 149, 0.3)" : "1px solid transparent",
            }}
          >
            <MessageSquare size={16} />
            <span>Live Chat ({messages.length})</span>
          </button>
        </div>

        {activeTab === "theses" && (
          <button
            onClick={() => setIsPostingThesis(!isPostingThesis)}
            className="btn-secondary"
            style={{ fontSize: "0.78rem", padding: "6px 12px", border: "1px solid #ff8c37", color: "#ff8c37" }}
          >
            <Plus size={14} />
            <span>{isPostingThesis ? "Cancel" : "Post Thesis"}</span>
          </button>
        )}
      </div>

      {/* Tab 1: Theses Content */}
      {activeTab === "theses" && (
        <div style={{ padding: "18px" }}>
          {/* Post Thesis Form */}
          {isPostingThesis && (
            <form
              onSubmit={handleCreateThesis}
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 96, 0, 0.3)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#fff" }}>
                  Write Investment Thesis as @{currentUser?.username}
                </span>

                {/* Sentiment toggle */}
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setThesisSentiment("bullish")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: thesisSentiment === "bullish" ? "rgba(20, 241, 149, 0.2)" : "transparent",
                      color: thesisSentiment === "bullish" ? "var(--solana-green)" : "var(--text-muted)",
                      border: "1px solid rgba(20, 241, 149, 0.3)",
                    }}
                  >
                    🚀 Bullish
                  </button>
                  <button
                    type="button"
                    onClick={() => setThesisSentiment("bearish")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: thesisSentiment === "bearish" ? "rgba(239, 68, 68, 0.2)" : "transparent",
                      color: thesisSentiment === "bearish" ? "var(--solana-red)" : "var(--text-muted)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                    }}
                  >
                    🐻 Bearish
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="Thesis headline (e.g. Why $SAMURAI will flip $GENESIS)"
                value={thesisTitle}
                onChange={(e) => setThesisTitle(e.target.value)}
                required
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "#fff",
                  fontSize: "0.85rem",
                }}
              />

              <textarea
                placeholder="Explain your fundamental, viral, or technical thesis for this coin..."
                rows={3}
                value={thesisContent}
                onChange={(e) => setThesisContent(e.target.value)}
                required
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "#fff",
                  fontSize: "0.85rem",
                  resize: "vertical",
                }}
              />

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="number"
                  step="any"
                  placeholder="Target MC (SOL) - Optional"
                  value={thesisTargetCap}
                  onChange={(e) => setThesisTargetCap(e.target.value)}
                  style={{
                    flex: 1,
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#fff",
                    fontSize: "0.82rem",
                  }}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    padding: "8px 18px",
                    fontSize: "0.85rem",
                    background: "linear-gradient(135deg, #ff6000 0%, #ff8c37 100%)",
                  }}
                >
                  Publish Thesis
                </button>
              </div>
            </form>
          )}

          {/* List of theses */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {theses.map((t) => {
              const hasLiked = currentUser ? t.likes.includes(currentUser.id) : false;

              return (
                <div
                  key={t.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img
                        src={t.authorAvatar}
                        alt={t.authorUsername}
                        style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#111420" }}
                      />
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fff" }}>
                          @{t.authorUsername}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {new Date(t.createdAt).toLocaleDateString()} at{" "}
                          {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        className="badge"
                        style={{
                          background:
                            t.sentiment === "bullish"
                              ? "rgba(20, 241, 149, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                          color:
                            t.sentiment === "bullish"
                              ? "var(--solana-green)"
                              : "var(--solana-red)",
                        }}
                      >
                        {t.sentiment === "bullish" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        <span>{t.sentiment.toUpperCase()}</span>
                      </span>

                      {t.targetMarketCapSol && (
                        <span
                          className="mono"
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--solana-cyan)",
                            background: "rgba(0, 240, 255, 0.1)",
                            padding: "3px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          Target: {t.targetMarketCapSol} SOL
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#f8fafc" }}>{t.title}</h4>

                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {t.content}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                      paddingTop: "10px",
                    }}
                  >
                    <button
                      onClick={() => handleLikeThesis(t.id)}
                      style={{
                        background: hasLiked ? "rgba(20, 241, 149, 0.15)" : "transparent",
                        color: hasLiked ? "var(--solana-green)" : "var(--text-muted)",
                        border: "1px solid " + (hasLiked ? "rgba(20, 241, 149, 0.3)" : "var(--border-subtle)"),
                        borderRadius: "6px",
                        padding: "4px 10px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <ThumbsUp size={13} />
                      <span>{t.likes.length} Likes</span>
                    </button>

                    <button
                      onClick={() => handleShareThesis(t)}
                      style={{
                        background: "transparent",
                        color: "var(--text-muted)",
                        border: "none",
                        fontSize: "0.78rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <Share2 size={13} />
                      <span>Share Thesis</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Live Chatroom */}
      {activeTab === "chat" && (
        <div style={{ display: "flex", flexDirection: "column", height: "360px" }}>
          {/* Messages scroll area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                }}
              >
                <img
                  src={m.authorAvatar}
                  alt={m.authorUsername}
                  style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#111420", flexShrink: 0 }}
                />
                <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "8px 12px", borderRadius: "10px", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#fff" }}>
                      @{m.authorUsername}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#e2e8f0", lineHeight: 1.4 }}>
                    {m.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chat input box */}
          <form
            onSubmit={handleSendChat}
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border-subtle)",
              background: "rgba(255, 255, 255, 0.02)",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              placeholder={`Chat about $${token.symbol} as @${currentUser?.username || "anon"}...`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              style={{
                flex: 1,
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "#fff",
                fontSize: "0.85rem",
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: "10px 16px", borderRadius: "8px" }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
