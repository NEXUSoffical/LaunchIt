import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Token, Trade } from "../types";
import { CoinThesis, ChatMessage } from "../types/auth";

export interface SharedDbSnapshot {
  tokens: Token[];
  trades: Trade[];
  theses: Record<string, CoinThesis[]>;
  messages: Record<string, ChatMessage[]>;
  updatedAt: number;
}

type SyncCallbacks = {
  onTokensUpdate?: (tokens: Token[]) => void;
  onTradesUpdate?: (trades: Trade[]) => void;
  onThesesUpdate?: (mint: string, theses: CoinThesis[]) => void;
  onMessagesUpdate?: (mint: string, messages: ChatMessage[]) => void;
};

let realtimeChannel: RealtimeChannel | null = null;
const listeners = new Set<SyncCallbacks>();
let latestSnapshot: SharedDbSnapshot = {
  tokens: [],
  trades: [],
  theses: {},
  messages: {},
  updatedAt: 0,
};

function notifyTokens(tokens: Token[]) {
  latestSnapshot.tokens = tokens;
  for (const l of listeners) {
    l.onTokensUpdate?.(tokens);
  }
}

function notifyTrades(trades: Trade[]) {
  latestSnapshot.trades = trades;
  for (const l of listeners) {
    l.onTradesUpdate?.(trades);
  }
}

function notifyTheses(mint: string, theses: CoinThesis[]) {
  latestSnapshot.theses[mint] = theses;
  for (const l of listeners) {
    l.onThesesUpdate?.(mint, theses);
  }
}

function notifyMessages(mint: string, messages: ChatMessage[]) {
  latestSnapshot.messages[mint] = messages;
  for (const l of listeners) {
    l.onMessagesUpdate?.(mint, messages);
  }
}

/**
 * Fetch shared database state from the server API (/api/launchit-db) and Supabase tables
 */
export async function fetchSharedDatabase(
  localTokens: Token[] = [],
  localTrades: Trade[] = []
): Promise<SharedDbSnapshot> {
  try {
    // 1. Push any existing real local tokens/trades into the shared database via BULK_SYNC
    const res = await fetch("/api/launchit-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "BULK_SYNC",
        payload: {
          tokens: localTokens,
          trades: localTrades,
        },
      }),
    });

    if (res.ok) {
      const data: SharedDbSnapshot = await res.json();
      latestSnapshot = data;
    }
  } catch (_) {}

  // 2. Also query Supabase relational tables if configured
  try {
    const { data: sbTokens, error: sbErr } = await supabase
      .from("launchit_tokens")
      .select("payload")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!sbErr && Array.isArray(sbTokens) && sbTokens.length > 0) {
      const mergedMap = new Map<string, Token>();
      for (const t of latestSnapshot.tokens) mergedMap.set(t.mint, t);
      for (const row of sbTokens) {
        const tok = row.payload as Token;
        if (tok?.mint && !mergedMap.has(tok.mint)) {
          mergedMap.set(tok.mint, tok);
        }
      }
      latestSnapshot.tokens = Array.from(mergedMap.values()).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
      );
    }
  } catch (_) {}

  return latestSnapshot;
}

/**
 * Subscribe to real-time updates across all browsers via Supabase Realtime Broadcast + API polling
 */
export function subscribeSharedDb(callbacks: SyncCallbacks): () => void {
  listeners.add(callbacks);

  if (!realtimeChannel) {
    realtimeChannel = supabase.channel("launchit_global_sync_v1", {
      config: { broadcast: { self: false } },
    });

    realtimeChannel
      .on("broadcast", { event: "UPSERT_TOKEN" }, ({ payload }) => {
        if (!payload?.token?.mint) return;
        const incoming: Token = payload.token;
        const exists = latestSnapshot.tokens.some((t) => t.mint === incoming.mint);
        const nextTokens = exists
          ? latestSnapshot.tokens.map((t) => (t.mint === incoming.mint ? { ...t, ...incoming } : t))
          : [incoming, ...latestSnapshot.tokens];
        notifyTokens(nextTokens);
      })
      .on("broadcast", { event: "ADD_TRADE" }, ({ payload }) => {
        if (payload?.trade?.id) {
          const trade: Trade = payload.trade;
          if (!latestSnapshot.trades.some((t) => t.id === trade.id)) {
            notifyTrades([trade, ...latestSnapshot.trades]);
          }
        }
        if (payload?.updatedToken?.mint) {
          const updated: Token = payload.updatedToken;
          const nextTokens = latestSnapshot.tokens.some((t) => t.mint === updated.mint)
            ? latestSnapshot.tokens.map((t) => (t.mint === updated.mint ? { ...t, ...updated } : t))
            : [updated, ...latestSnapshot.tokens];
          notifyTokens(nextTokens);
        }
      })
      .on("broadcast", { event: "UPSERT_THESIS" }, ({ payload }) => {
        if (!payload?.thesis?.id || !payload?.thesis?.mint) return;
        const thesis: CoinThesis = payload.thesis;
        const mint = thesis.mint;
        const current = latestSnapshot.theses[mint] || [];
        const exists = current.some((t) => t.id === thesis.id);
        const next = exists
          ? current.map((t) => (t.id === thesis.id ? thesis : t))
          : [thesis, ...current];
        notifyTheses(mint, next);
      })
      .on("broadcast", { event: "ADD_MESSAGE" }, ({ payload }) => {
        if (!payload?.message?.id || !payload?.message?.mint) return;
        const msg: ChatMessage = payload.message;
        const mint = msg.mint;
        if (!mint) return;
        const current: ChatMessage[] = latestSnapshot.messages[mint] || [];
        if (!current.some((m: ChatMessage) => m.id === msg.id)) {
          notifyMessages(mint, [...current, msg]);
        }
      })
      .on("broadcast", { event: "PEER_SYNC_REQUEST" }, () => {
        if (latestSnapshot.tokens.length > 0 || latestSnapshot.trades.length > 0) {
          realtimeChannel?.send({
            type: "broadcast",
            event: "PEER_SYNC_RESPONSE",
            payload: {
              tokens: latestSnapshot.tokens,
              trades: latestSnapshot.trades.slice(0, 100),
            },
          });
        }
      })
      .on("broadcast", { event: "PEER_SYNC_RESPONSE" }, ({ payload }) => {
        if (Array.isArray(payload?.tokens) && payload.tokens.length > 0) {
          const map = new Map<string, Token>();
          for (const t of latestSnapshot.tokens) map.set(t.mint, t);
          let added = false;
          for (const incoming of payload.tokens) {
            if (incoming?.mint && !map.has(incoming.mint)) {
              map.set(incoming.mint, incoming);
              added = true;
            }
          }
          if (added) {
            const merged = Array.from(map.values()).sort(
              (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
            );
            notifyTokens(merged);
          }
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          realtimeChannel?.send({
            type: "broadcast",
            event: "PEER_SYNC_REQUEST",
            payload: {},
          });
        }
      });
  }

  return () => {
    listeners.delete(callbacks);
  };
}

/**
 * Upsert a newly launched or updated token to the shared database + Supabase Realtime
 */
export async function syncUpsertToken(token: Token): Promise<void> {
  // 1. Update local snapshot
  const exists = latestSnapshot.tokens.some((t) => t.mint === token.mint);
  latestSnapshot.tokens = exists
    ? latestSnapshot.tokens.map((t) => (t.mint === token.mint ? token : t))
    : [token, ...latestSnapshot.tokens];

  // 2. Broadcast via Supabase Realtime immediately
  try {
    realtimeChannel?.send({
      type: "broadcast",
      event: "UPSERT_TOKEN",
      payload: { token },
    });
  } catch (_) {}

  // 3. Persist to /api/launchit-db
  try {
    await fetch("/api/launchit-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPSERT_TOKEN",
        payload: { token },
      }),
    });
  } catch (_) {}

  // 4. Persist to Supabase Postgres table if available
  try {
    await supabase.from("launchit_tokens").upsert({
      mint: token.mint,
      payload: token,
      created_at: token.createdAt || Date.now(),
      updated_at: new Date().toISOString(),
    });
  } catch (_) {}
}

/**
 * Record a real buy/sell trade + updated token reserves across all connected users
 */
export async function syncAddTrade(trade: Trade, updatedToken: Token): Promise<void> {
  if (!latestSnapshot.trades.some((t) => t.id === trade.id)) {
    latestSnapshot.trades = [trade, ...latestSnapshot.trades];
  }
  latestSnapshot.tokens = latestSnapshot.tokens.map((t) =>
    t.mint === updatedToken.mint ? updatedToken : t
  );

  // 1. Broadcast via Supabase Realtime
  try {
    realtimeChannel?.send({
      type: "broadcast",
      event: "ADD_TRADE",
      payload: { trade, updatedToken },
    });
  } catch (_) {}

  // 2. Persist to /api/launchit-db
  try {
    await fetch("/api/launchit-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_TRADE",
        payload: { trade, updatedToken },
      }),
    });
  } catch (_) {}

  // 3. Persist to Supabase Postgres tables if available
  try {
    await Promise.all([
      supabase.from("launchit_trades").upsert({
        id: trade.id,
        mint: updatedToken.mint,
        payload: trade,
        timestamp: trade.timestamp || Date.now(),
      }),
      supabase.from("launchit_tokens").upsert({
        mint: updatedToken.mint,
        payload: updatedToken,
        created_at: updatedToken.createdAt || Date.now(),
        updated_at: new Date().toISOString(),
      }),
    ]);
  } catch (_) {}
}

/**
 * Upsert a community Coin Thesis (or thesis like) to the shared database + Supabase Realtime
 */
export async function syncUpsertThesis(thesis: CoinThesis): Promise<void> {
  const mint = thesis.mint;
  const list = latestSnapshot.theses[mint] || [];
  const exists = list.some((t) => t.id === thesis.id);
  latestSnapshot.theses[mint] = exists
    ? list.map((t) => (t.id === thesis.id ? thesis : t))
    : [thesis, ...list];

  try {
    realtimeChannel?.send({
      type: "broadcast",
      event: "UPSERT_THESIS",
      payload: { thesis },
    });
  } catch (_) {}

  try {
    await fetch("/api/launchit-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPSERT_THESIS",
        payload: { thesis },
      }),
    });
  } catch (_) {}

  try {
    await supabase.from("launchit_theses").upsert({
      id: thesis.id,
      mint: thesis.mint,
      payload: thesis,
      created_at: thesis.createdAt || Date.now(),
    });
  } catch (_) {}
}

/**
 * Add a live community chat message to the shared database + Supabase Realtime
 */
export async function syncAddMessage(message: ChatMessage): Promise<void> {
  const mint = message.mint;
  if (!mint) return;
  const list: ChatMessage[] = latestSnapshot.messages[mint] || [];
  if (!list.some((m: ChatMessage) => m.id === message.id)) {
    latestSnapshot.messages[mint] = [...list, message];
  }

  try {
    realtimeChannel?.send({
      type: "broadcast",
      event: "ADD_MESSAGE",
      payload: { message },
    });
  } catch (_) {}

  try {
    await fetch("/api/launchit-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_MESSAGE",
        payload: { message },
      }),
    });
  } catch (_) {}

  try {
    await supabase.from("launchit_messages").upsert({
      id: message.id,
      mint: message.mint,
      payload: message,
      timestamp: message.timestamp || Date.now(),
    });
  } catch (_) {}
}

/**
 * Fetch shared theses and chat messages for a specific token mint
 */
export async function fetchSharedCommunityForMint(
  mint: string,
  localTheses: CoinThesis[] = [],
  localMessages: ChatMessage[] = []
): Promise<{ theses: CoinThesis[]; messages: ChatMessage[] }> {
  try {
    const res = await fetch("/api/launchit-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "BULK_SYNC",
        payload: {
          theses: localTheses.length > 0 ? { [mint]: localTheses } : {},
          messages: localMessages.length > 0 ? { [mint]: localMessages } : {},
        },
      }),
    });
    if (res.ok) {
      const data: SharedDbSnapshot = await res.json();
      latestSnapshot = data;
      return {
        theses: data.theses?.[mint] || localTheses,
        messages: data.messages?.[mint] || localMessages,
      };
    }
  } catch (_) {}

  return {
    theses: latestSnapshot.theses[mint] || localTheses,
    messages: latestSnapshot.messages[mint] || localMessages,
  };
}
