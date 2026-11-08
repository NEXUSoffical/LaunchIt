import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "data", "launchit_db.json");

const defaultState = () => ({
  tokens: [],
  trades: [],
  theses: {}, // keyed by mint: CoinThesis[]
  messages: {}, // keyed by mint: ChatMessage[]
  updatedAt: Date.now(),
});

// In-memory store for serverless warm instances + disk persistence when available
let memoryStore = defaultState();

function loadStore() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      const parsed = JSON.parse(raw);
      memoryStore = {
        tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
        trades: Array.isArray(parsed.trades) ? parsed.trades : [],
        theses: parsed.theses && typeof parsed.theses === "object" ? parsed.theses : {},
        messages: parsed.messages && typeof parsed.messages === "object" ? parsed.messages : {},
        updatedAt: parsed.updatedAt || Date.now(),
      };
    }
  } catch (_) {}
  return memoryStore;
}

function saveStore(store) {
  store.updatedAt = Date.now();
  memoryStore = store;
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (_) {
    // Read-only filesystem in some serverless environments falls back to memoryStore + Supabase
  }
}

export function applyDbAction(action, payload) {
  const store = loadStore();

  if (action === "UPSERT_TOKEN" && payload?.token?.mint) {
    const incoming = payload.token;
    const idx = store.tokens.findIndex((t) => t.mint === incoming.mint);
    if (idx >= 0) {
      store.tokens[idx] = { ...store.tokens[idx], ...incoming };
    } else {
      store.tokens.unshift(incoming);
    }
    store.tokens.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    saveStore(store);
  } else if (action === "ADD_TRADE" && payload?.trade?.id) {
    const trade = payload.trade;
    if (!store.trades.some((t) => t.id === trade.id)) {
      store.trades.unshift(trade);
      if (store.trades.length > 500) store.trades = store.trades.slice(0, 500);
    }
    if (payload.updatedToken?.mint) {
      const idx = store.tokens.findIndex((t) => t.mint === payload.updatedToken.mint);
      if (idx >= 0) {
        store.tokens[idx] = { ...store.tokens[idx], ...payload.updatedToken };
      } else {
        store.tokens.unshift(payload.updatedToken);
      }
    }
    saveStore(store);
  } else if (action === "UPSERT_THESIS" && payload?.thesis?.id && payload?.thesis?.mint) {
    const thesis = payload.thesis;
    const mint = thesis.mint;
    if (!Array.isArray(store.theses[mint])) store.theses[mint] = [];
    const idx = store.theses[mint].findIndex((t) => t.id === thesis.id);
    if (idx >= 0) {
      store.theses[mint][idx] = thesis;
    } else {
      store.theses[mint].unshift(thesis);
    }
    saveStore(store);
  } else if (action === "ADD_MESSAGE" && payload?.message?.id && payload?.message?.mint) {
    const msg = payload.message;
    const mint = msg.mint;
    if (!Array.isArray(store.messages[mint])) store.messages[mint] = [];
    if (!store.messages[mint].some((m) => m.id === msg.id)) {
      store.messages[mint].push(msg);
      if (store.messages[mint].length > 300) {
        store.messages[mint] = store.messages[mint].slice(-300);
      }
      // Also bump token repliesCount
      const tIdx = store.tokens.findIndex((t) => t.mint === mint);
      if (tIdx >= 0) {
        store.tokens[tIdx].repliesCount = store.messages[mint].length;
      }
      saveStore(store);
    }
  } else if (action === "BULK_SYNC" && payload) {
    let changed = false;
    if (Array.isArray(payload.tokens)) {
      for (const incoming of payload.tokens) {
        if (!incoming?.mint) continue;
        const idx = store.tokens.findIndex((t) => t.mint === incoming.mint);
        if (idx === -1) {
          store.tokens.push(incoming);
          changed = true;
        } else if ((incoming.volume24hSol || 0) > (store.tokens[idx].volume24hSol || 0)) {
          store.tokens[idx] = { ...store.tokens[idx], ...incoming };
          changed = true;
        }
      }
      store.tokens.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    if (Array.isArray(payload.trades)) {
      for (const tr of payload.trades) {
        if (tr?.id && !store.trades.some((x) => x.id === tr.id)) {
          store.trades.push(tr);
          changed = true;
        }
      }
      store.trades.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    if (payload.theses && typeof payload.theses === "object") {
      for (const [mint, list] of Object.entries(payload.theses)) {
        if (!Array.isArray(list)) continue;
        if (!Array.isArray(store.theses[mint])) store.theses[mint] = [];
        for (const th of list) {
          if (!th?.id) continue;
          const idx = store.theses[mint].findIndex((x) => x.id === th.id);
          if (idx === -1) {
            store.theses[mint].push(th);
            changed = true;
          } else if ((th.likes?.length || 0) !== (store.theses[mint][idx].likes?.length || 0)) {
            store.theses[mint][idx] = th;
            changed = true;
          }
        }
      }
    }
    if (payload.messages && typeof payload.messages === "object") {
      for (const [mint, list] of Object.entries(payload.messages)) {
        if (!Array.isArray(list)) continue;
        if (!Array.isArray(store.messages[mint])) store.messages[mint] = [];
        for (const msg of list) {
          if (msg?.id && !store.messages[mint].some((x) => x.id === msg.id)) {
            store.messages[mint].push(msg);
            changed = true;
          }
        }
        store.messages[mint].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      }
    }
    if (changed) saveStore(store);
  }

  return store;
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    const store = loadStore();
    return res.status(200).json(store);
  }

  if (req.method === "POST") {
    const { action, payload } = req.body || {};
    const store = applyDbAction(action, payload);
    return res.status(200).json(store);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
