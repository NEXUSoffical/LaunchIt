import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            margin: "40px auto",
            maxWidth: "600px",
            padding: "24px",
            borderRadius: "16px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1.5px solid rgba(239, 68, 68, 0.4)",
            color: "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <AlertTriangle size={28} color="#ef4444" />
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#ef4444" }}>
                Component Render Error Intercepted
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                The terminal encountered an unexpected issue while rendering this token.
              </p>
            </div>
          </div>

          <div
            className="mono"
            style={{
              padding: "12px",
              borderRadius: "8px",
              background: "rgba(0, 0, 0, 0.6)",
              fontSize: "0.78rem",
              color: "#ff8c37",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              maxHeight: "150px",
              overflowY: "auto",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {this.state.error?.message || "Unknown error"}
            {this.state.error?.stack && `\n\n${this.state.error.stack}`}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={this.handleReset}
              className="btn-primary"
              style={{ flex: 1, padding: "10px", justifyContent: "center" }}
            >
              <ArrowLeft size={16} />
              <span>Back to Token Feed</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary"
              style={{ padding: "10px 16px" }}
            >
              <RefreshCw size={16} />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
