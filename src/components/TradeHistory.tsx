import React from "react";
import { Trade } from "../types";
import { ExternalLink } from "lucide-react";

interface TradeHistoryProps {
  trades: Trade[];
  tokenSymbol: string;
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({
  trades,
  tokenSymbol,
}) => {
  return (
    <div
      className="glass-panel"
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Recent Trades</h3>
        <span className="badge badge-green" style={{ fontSize: "0.7rem" }}>
          Live WebSockets
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-subtle)", textAlign: "left" }}>
              <th style={{ padding: "8px 6px" }}>Type</th>
              <th style={{ padding: "8px 6px" }}>SOL</th>
              <th style={{ padding: "8px 6px" }}>${tokenSymbol}</th>
              <th style={{ padding: "8px 6px" }}>Trader</th>
              <th style={{ padding: "8px 6px" }}>Time</th>
              <th style={{ padding: "8px 6px", textAlign: "right" }}>Tx</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => {
              const secondsAgo = Math.max(1, Math.floor((Date.now() - trade.timestamp) / 1000));
              const timeDisplay = secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`;

              return (
                <tr
                  key={trade.id}
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                    transition: "background 0.2s",
                  }}
                >
                  <td style={{ padding: "10px 6px" }}>
                    <span
                      style={{
                        color: trade.isBuy ? "#10b981" : "#ef4444",
                        fontWeight: 700,
                      }}
                    >
                      {trade.isBuy ? "BUY" : "SELL"}
                    </span>
                  </td>
                  <td className="mono" style={{ padding: "10px 6px", fontWeight: 600 }}>
                    {trade.solAmount.toFixed(2)}
                  </td>
                  <td className="mono" style={{ padding: "10px 6px", color: "var(--text-secondary)" }}>
                    {(trade.tokenAmount / 1e6).toFixed(2)}M
                  </td>
                  <td className="mono" style={{ padding: "10px 6px", color: "var(--solana-cyan)" }}>
                    {trade.user}
                  </td>
                  <td style={{ padding: "10px 6px", color: "var(--text-muted)" }}>
                    {timeDisplay}
                  </td>
                  <td style={{ padding: "10px 6px", textAlign: "right" }}>
                    <a
                      href={`https://solscan.io/tx/${trade.txHash}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "2px" }}
                    >
                      <span className="mono" style={{ fontSize: "0.75rem" }}>{trade.txHash.slice(0, 6)}</span>
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
