import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Sparkles,
  Rocket,
  MessageSquare,
  FileText,
  ShieldCheck,
  TrendingUp,
  Share2,
  Lock,
  User,
  Mail,
  Zap,
  CheckCircle2,
  ArrowRight,
  Flame,
  Layers,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { Token } from "../types";

interface LandingHomePageProps {
  previewTokens?: Token[];
}

export const LandingHomePage: React.FC<LandingHomePageProps> = ({ previewTokens = [] }) => {
  const { register, login, resetPassword, loginAsDemo, isLoading } = useAuth();

  const [mode, setMode] = useState<"register" | "login">("register");

  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [isResetMode, setIsResetMode] = useState(false);
  const [newResetPassword, setNewResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const res = await register({
      username,
      email,
      password,
    });

    if (!res.success) {
      setErrorMessage(res.error || "Failed to create account.");
    } else {
      setSuccessMessage("Account created successfully! Entering LaunchIt...");
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const res = await login({
      usernameOrEmail: loginIdentifier,
      password: loginPassword,
    });

    if (!res.success) {
      setErrorMessage(res.error || "Failed to sign in.");
    } else {
      setSuccessMessage("Welcome back! Entering LaunchIt...");
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const res = await resetPassword(loginIdentifier, newResetPassword);

    if (!res.success) {
      setErrorMessage(res.error || "Failed to reset password.");
    } else {
      setSuccessMessage("Password updated successfully! Entering LaunchIt...");
    }
  };

  const displayTokens = previewTokens.slice(0, 3);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-dark)" }}>
      {/* Top Bar */}
      <header
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          padding: "16px 0",
          background: "rgba(14, 19, 29, 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src="/logo.jpg"
              alt="LaunchIt"
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                objectFit: "cover",
                border: "1.5px solid rgba(255, 96, 0, 0.6)",
                boxShadow: "0 0 14px rgba(255, 96, 0, 0.35)",
              }}
            />
            <div>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, letterSpacing: "-0.5px" }}>
                LAUNCH<span style={{ color: "#ff6000" }}>IT</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#ff8c37", fontWeight: 600 }}>
                — see it launch it —
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span
              className="badge"
              style={{
                background: "rgba(20, 241, 149, 0.12)",
                color: "var(--solana-green)",
                border: "1px solid rgba(20, 241, 149, 0.3)",
              }}
            >
              ● Solana Devnet Live
            </span>
            <button
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setErrorMessage(null);
                const el = document.getElementById("auth-portal");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="btn-secondary"
              style={{ fontSize: "0.85rem", padding: "8px 16px" }}
            >
              {mode === "register" ? "Already have an account? Sign In" : "Need an account? Sign Up"}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: "60px 0 40px", position: "relative" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: "860px", margin: "0 auto 48px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px",
                borderRadius: "999px",
                background: "rgba(255, 96, 0, 0.12)",
                border: "1px solid rgba(255, 96, 0, 0.4)",
                color: "#ff8c37",
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "20px",
              }}
            >
              <Flame size={16} />
              <span>The Next-Gen Social Bonding Curve Network</span>
            </div>

            <h1
              style={{
                fontSize: "clamp(2.3rem, 5vw, 3.8rem)",
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: "-1.5px",
                marginBottom: "20px",
              }}
            >
              See It. Launch It. <br />
              <span className="gradient-text-solana">Trade It. Debate It.</span>
            </h1>

            <p
              style={{
                fontSize: "1.15rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                maxWidth: "740px",
                margin: "0 auto 28px",
              }}
            >
              LaunchIt is far more than a pump pad. It is the complete social headquarters for memecoins:
              post in-depth <b>investment theses</b>, chat live in <b>token holder rooms</b>, debate alpha,
              and launch viral coins directly from TikTok in 1-click.
            </p>

            {/* Note banner regarding TikTok vs Website */}
            <div
              style={{
                background: "rgba(20, 241, 149, 0.08)",
                border: "1px solid rgba(20, 241, 149, 0.25)",
                borderRadius: "14px",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                textAlign: "left",
                maxWidth: "760px",
                margin: "0 auto",
              }}
            >
              <Zap size={24} color="var(--solana-green)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: "0.88rem", color: "#e2e8f0", lineHeight: 1.5 }}>
                <b style={{ color: "var(--solana-green)" }}>No account needed to launch from TikTok:</b> Anyone can
                deploy a viral token straight from a TikTok video via our Chrome extension. But to access the full
                web platform, trade on bonding curves, chat with holders, and publish coin theses, you must create
                an official account.
              </div>
            </div>
          </div>

          {/* Main Auth Portal Box */}
          <div
            id="auth-portal"
            style={{
              maxWidth: "520px",
              margin: "0 auto 60px",
              background: "rgba(14, 19, 29, 0.95)",
              border: "1px solid rgba(255, 96, 0, 0.4)",
              borderRadius: "20px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 96, 0, 0.15)",
              overflow: "hidden",
            }}
          >
            {/* Header Tabs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                borderBottom: "1px solid var(--border-subtle)",
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setErrorMessage(null);
                }}
                style={{
                  padding: "16px 12px",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: mode === "register" ? "#ff8c37" : "var(--text-muted)",
                  background: mode === "register" ? "rgba(255, 96, 0, 0.08)" : "transparent",
                  borderBottom: mode === "register" ? "3px solid #ff6000" : "3px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Sparkles size={16} />
                <span>Create Official Account</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMessage(null);
                }}
                style={{
                  padding: "16px 12px",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: mode === "login" ? "#14f195" : "var(--text-muted)",
                  background: mode === "login" ? "rgba(20, 241, 149, 0.08)" : "transparent",
                  borderBottom: mode === "login" ? "3px solid #14f195" : "3px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Lock size={16} />
                <span>Sign In</span>
              </button>
            </div>

            <div style={{ padding: "28px" }}>
              {errorMessage && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.5)",
                    color: "#fca5a5",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    fontSize: "0.85rem",
                    marginBottom: "18px",
                    lineHeight: 1.4,
                  }}
                >
                  ⚠️ {errorMessage}
                </div>
              )}

              {successMessage && (
                <div
                  style={{
                    background: "rgba(20, 241, 149, 0.15)",
                    border: "1px solid rgba(20, 241, 149, 0.5)",
                    color: "#6ee7b7",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    fontSize: "0.85rem",
                    marginBottom: "18px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{successMessage}</span>
                </div>
              )}

              {mode === "register" ? (
                <form onSubmit={handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Choose Official Username <span style={{ color: "#ff6000" }}>*</span>
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "10px",
                        padding: "0 14px",
                      }}
                    >
                      <span style={{ color: "#ff8c37", fontWeight: 700, marginRight: "4px" }}>@</span>
                      <input
                        type="text"
                        placeholder="alphatrader"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          color: "#fff",
                          padding: "12px 0",
                          fontSize: "0.95rem",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                      This is your public identity in token chatrooms, coin theses, and trading logs.
                    </span>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Email Address <span style={{ color: "#ff6000" }}>*</span>
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "10px",
                        padding: "0 14px",
                        gap: "10px",
                      }}
                    >
                      <Mail size={16} color="var(--text-muted)" />
                      <input
                        type="email"
                        placeholder="trader@launchit.fun"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          color: "#fff",
                          padding: "12px 0",
                          fontSize: "0.95rem",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Password <span style={{ color: "#ff6000" }}>*</span>
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "10px",
                        padding: "0 14px",
                        gap: "10px",
                      }}
                    >
                      <Lock size={16} color="var(--text-muted)" />
                      <input
                        type={showRegPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          color: "#fff",
                          padding: "12px 0",
                          fontSize: "0.95rem",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted)",
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                        title={showRegPassword ? "Hide password" : "Show password"}
                      >
                        {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary"
                    style={{
                      padding: "14px",
                      fontSize: "1rem",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #ff6000 0%, #ff8c37 100%)",
                      color: "#fff",
                      boxShadow: "0 6px 20px rgba(255, 96, 0, 0.4)",
                    }}
                  >
                    <Rocket size={18} />
                    <span>{isLoading ? "Creating Account..." : "Create Account & Enter Platform"}</span>
                  </button>
                </form>
              ) : isResetMode ? (
                <form onSubmit={handleResetSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div
                    style={{
                      background: "rgba(255, 96, 0, 0.12)",
                      border: "1px solid rgba(255, 96, 0, 0.35)",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "0.82rem",
                      color: "#ff8c37",
                      lineHeight: 1.4,
                    }}
                  >
                    <b>🔑 Reset Password:</b> Enter your username or email and your new password to instantly update your account and sign in.
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Username or Email
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "10px",
                        padding: "0 14px",
                        gap: "10px",
                      }}
                    >
                      <User size={16} color="var(--text-muted)" />
                      <input
                        type="text"
                        placeholder="Username or email"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        required
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          color: "#fff",
                          padding: "12px 0",
                          fontSize: "0.95rem",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Enter New Password
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "10px",
                        padding: "0 14px",
                        gap: "10px",
                      }}
                    >
                      <KeyRound size={16} color="var(--text-muted)" />
                      <input
                        type={showResetPassword ? "text" : "password"}
                        placeholder="Enter new password (min 4 chars)"
                        value={newResetPassword}
                        onChange={(e) => setNewResetPassword(e.target.value)}
                        required
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          color: "#fff",
                          padding: "12px 0",
                          fontSize: "0.95rem",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted)",
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                        title={showResetPassword ? "Hide password" : "Show password"}
                      >
                        {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary"
                    style={{
                      padding: "14px",
                      fontSize: "1rem",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #ff6000 0%, #ff8c37 100%)",
                      color: "#fff",
                    }}
                  >
                    <KeyRound size={18} />
                    <span>{isLoading ? "Updating Password..." : "Update Password & Sign In"}</span>
                  </button>

                  <div style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(false);
                        setErrorMessage(null);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      ← Back to standard Sign In
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Username or Email
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "10px",
                        padding: "0 14px",
                        gap: "10px",
                      }}
                    >
                      <User size={16} color="var(--text-muted)" />
                      <input
                        type="text"
                        placeholder="Username or email"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        required
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          color: "#fff",
                          padding: "12px 0",
                          fontSize: "0.95rem",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <label
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetMode(true);
                          setErrorMessage(null);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ff8c37",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Forgot / Reset Password?
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "10px",
                        padding: "0 14px",
                        gap: "10px",
                      }}
                    >
                      <Lock size={16} color="var(--text-muted)" />
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          color: "#fff",
                          padding: "12px 0",
                          fontSize: "0.95rem",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted)",
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                        title={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary"
                    style={{
                      padding: "14px",
                      fontSize: "1rem",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, var(--solana-green) 0%, #0ebb71 100%)",
                      color: "#07090e",
                    }}
                  >
                    <ArrowRight size={18} />
                    <span>{isLoading ? "Signing In..." : "Sign In & Enter Platform"}</span>
                  </button>
                </form>
              )}

              {/* Instant 1-Click Demo Shortcut */}
              <div
                style={{
                  marginTop: "20px",
                  paddingTop: "16px",
                  borderTop: "1px solid var(--border-subtle)",
                  textAlign: "center",
                }}
              >
                <button
                  type="button"
                  onClick={loginAsDemo}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px dashed rgba(255, 255, 255, 0.2)",
                    borderRadius: "10px",
                    padding: "10px 16px",
                    color: "var(--text-secondary)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Zap size={15} color="#ff8c37" />
                  <span>Instant 1-Click Demo Sign In (Preview as @solana_og)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Social Platform Capabilities Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              maxWidth: "1100px",
              margin: "0 auto 60px",
            }}
          >
            <div
              className="glass-panel"
              style={{
                padding: "24px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(255, 96, 0, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <FileText size={22} color="#ff8c37" />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px" }}>
                Post & Read Coin Theses
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Publish bullish or bearish research writeups, outline target market caps, and earn karma from fellow
                traders who like and cite your analysis.
              </p>
            </div>

            <div
              className="glass-panel"
              style={{
                padding: "24px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(20, 241, 149, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <MessageSquare size={22} color="var(--solana-green)" />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px" }}>
                Live Coin Chatrooms
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Chat in real time with buyers, holders, and creators directly inside the trading terminal for every
                coin on the bonding curve.
              </p>
            </div>

            <div
              className="glass-panel"
              style={{
                padding: "24px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(0, 240, 255, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <Rocket size={22} color="var(--solana-cyan)" />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px" }}>
                TikTok "See It, Launch It"
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Turn viral videos into live tokens in 1-click without any account or upfront capital. Full royalty
                shares are held for creators in the Royalty Vault.
              </p>
            </div>

            <div
              className="glass-panel"
              style={{
                padding: "24px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(153, 69, 255, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <ShieldCheck size={22} color="#c084fc" />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px" }}>
                SPL Token-2022 Standard
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Native embedded metadata, rug-proof immutable curves, and automated Raydium liquidity pooling upon
                graduating at 85 SOL.
              </p>
            </div>
          </div>

          {/* Teaser Preview of Tokens */}
          {displayTokens.length > 0 && (
            <div style={{ maxWidth: "1000px", margin: "0 auto 60px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingUp size={18} color="var(--solana-green)" />
                  <span style={{ fontSize: "1.05rem", fontWeight: 800 }}>Live Trending Curves</span>
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Sign up above to trade & view theses
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                {displayTokens.map((t) => (
                  <div
                    key={t.id}
                    className="glass-panel"
                    style={{
                      padding: "16px",
                      borderRadius: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <img
                        src={t.image}
                        alt={t.name}
                        style={{ width: "42px", height: "42px", borderRadius: "10px", objectFit: "cover" }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>{t.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#ff8c37", fontWeight: 700 }}>${t.symbol}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Market Cap:</span>
                      <span className="mono" style={{ color: "var(--solana-green)", fontWeight: 700 }}>
                        {t.marketCapSol.toFixed(1)} SOL
                      </span>
                    </div>

                    <div style={{ height: "6px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "3px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, t.progressPercent)}%`,
                          background: "linear-gradient(90deg, #ff6000, #14f195)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: "auto",
          borderTop: "1px solid var(--border-subtle)",
          padding: "24px 0",
          color: "var(--text-muted)",
          fontSize: "0.8rem",
          background: "var(--bg-surface)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src="/logo.jpg"
              alt="LaunchIt"
              style={{ width: "24px", height: "24px", borderRadius: "6px", objectFit: "cover" }}
            />
            <div>
              <b>LAUNCH<span style={{ color: "#ff6000" }}>IT</span></b> • <span style={{ color: "#ff8c37" }}>see it launch it</span>
            </div>
          </div>
          <div>
            Built with SPL Token-2022 • Accounts Required for Web Platform • Free TikTok Deployments
          </div>
        </div>
      </footer>
    </div>
  );
};
