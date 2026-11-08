import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "data", "launchit_db.json");
const TREASURY_WALLET = "EEjAgWkw5vVgFPvCS31TPhmAXeYjFrSt4awZNfDFsE9V";
const RPC_ENDPOINTS = [
  "https://solana-rpc.publicnode.com",
  "https://api.mainnet-beta.solana.com",
];

const defaultState = () => ({
  tokens: [],
  trades: [],
  theses: {}, // keyed by mint: CoinThesis[]
  messages: {}, // keyed by mint: ChatMessage[]
  updatedAt: Date.now(),
});

// In-memory store for serverless warm instances + disk persistence when available
let memoryStore = null;
let lastChainSyncAt = 0;

function loadStore() {
  if (!memoryStore) {
    memoryStore = defaultState();
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
  } else {
    // In local dev where file is writable, also sync from disk if newer
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf8");
        const parsed = JSON.parse(raw);
        if ((parsed.updatedAt || 0) > (memoryStore.updatedAt || 0)) {
          memoryStore = parsed;
        }
      }
    } catch (_) {}
  }
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
    // Read-only filesystem in Vercel serverless environment uses memoryStore + On-Chain Solana Recovery
  }
}

async function rpcCall(method, params) {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "launchit-chain-recovery",
          method,
          params,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.result !== undefined) {
          return data.result;
        }
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Automatic Cold-Start Recovery from Solana Mainnet Memo Transactions
 */
export async function recoverFromSolanaChain() {
  const now = Date.now();
  if (now - lastChainSyncAt < 25_000) {
    return loadStore();
  }
  lastChainSyncAt = now;

  const store = loadStore();
  try {
    const signatures = await rpcCall("getSignaturesForAddress", [
      TREASURY_WALLET,
      { limit: 150 },
    ]);
    if (!Array.isArray(signatures) || signatures.length === 0) {
      return store;
    }

    // Process oldest to newest so launches are created before trades
    const chronological = [...signatures].reverse();
    let changed = false;

    for (const sigInfo of chronological) {
      if (sigInfo.err || !sigInfo.memo) continue;
      const jsonStart = sigInfo.memo.indexOf("{");
      const jsonEnd = sigInfo.memo.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) continue;

      let memo = null;
      try {
        memo = JSON.parse(sigInfo.memo.slice(jsonStart, jsonEnd + 1));
      } catch (_) {
        continue;
      }

      if (!memo || memo.p !== "launchit.world") continue;
      const txTime = sigInfo.blockTime ? sigInfo.blockTime * 1000 : Date.now();

      if (memo.op === "launch" && memo.mint && memo.ticker) {
        const exists = store.tokens.some((t) => t.mint === memo.mint);
        if (!exists) {
          const initialBuy = Number(memo.buy) || 0;
          const realSol = initialBuy * 0.99;
          const recoveredToken = {
            id: `token-${txTime}`,
            mint: memo.mint,
            name: memo.name || memo.ticker,
            symbol: String(memo.ticker).toUpperCase(),
            description: memo.video || "",
            image: memo.img || "/logo.jpg",
            videoUrl: memo.video || undefined,
            creator: memo.handle || (memo.launcher ? `${memo.launcher.slice(0, 4)}...${memo.launcher.slice(-4)}` : ""),
            creatorHandle: memo.handle || undefined,
            launcherHandle: memo.handle || undefined,
            launcherWallet: memo.launcher || TREASURY_WALLET,
            feeSplit: "split_50_50",
            unclaimedCreatorFeesSol: 0,
            unclaimedLauncherFeesSol: initialBuy * 0.005,
            claimedCreatorFeesSol: 0,
            claimedLauncherFeesSol: 0,
            marketCapSol: 30 + realSol,
            marketCapUsd: (30 + realSol) * 150,
            priceSol: 0.00000003,
            progressPercent: (realSol / 85.0) * 100,
            realSolReserves: realSol,
            realTokenReserves: 800_000_000,
            volume24hSol: initialBuy,
            repliesCount: 0,
            isGraduated: false,
            createdAt: txTime,
            socials: {
              website: memo.video || undefined,
            },
          };
          store.tokens.push(recoveredToken);
          changed = true;
        }
      } else if ((memo.op === "buy" || memo.op === "sell") && memo.mint && sigInfo.signature) {
        const tradeExists = store.trades.some(
          (tr) => tr.txHash === sigInfo.signature || tr.id === `chain-${sigInfo.signature.slice(0, 12)}`
        );
        if (!tradeExists) {
          const solAmt = Number(memo.sol) || 0;
          const tokAmt = Number(memo.tokens) || 0;
          const isBuy = memo.op === "buy";

          const tokIdx = store.tokens.findIndex((t) => t.mint === memo.mint);
          let spotPrice = 0.00000003;
          if (tokIdx >= 0) {
            const tok = store.tokens[tokIdx];
            const curPrice = tok.priceSol || 0.00000003;
            const step = Math.min(0.35, Math.max(0.025, (solAmt / 10.0) * 0.12 + 0.03));
            spotPrice = isBuy
              ? curPrice * (1 + step)
              : Math.max(0.00000001, curPrice * (1 - step * 0.8));
            const newSolRes = isBuy
              ? (tok.realSolReserves || 0) + solAmt * 0.99
              : Math.max(0, (tok.realSolReserves || 0) - solAmt);
            const newTokRes = isBuy
              ? Math.max(0, (tok.realTokenReserves || 800_000_000) - tokAmt)
              : (tok.realTokenReserves || 800_000_000) + tokAmt;
            const mcSol = spotPrice * 1_000_000_000;

            store.tokens[tokIdx] = {
              ...tok,
              priceSol: spotPrice,
              marketCapSol: mcSol,
              marketCapUsd: mcSol * 150,
              realSolReserves: newSolRes,
              realTokenReserves: newTokRes,
              progressPercent: Math.min(100, (newSolRes / 85.0) * 100),
              volume24hSol: (tok.volume24hSol || 0) + solAmt,
              unclaimedLauncherFeesSol: (tok.unclaimedLauncherFeesSol || 0) + solAmt * 0.005,
            };
          }

          store.trades.push({
            id: `chain-${sigInfo.signature.slice(0, 12)}`,
            mint: memo.mint,
            user: "Solana Trader",
            isBuy,
            solAmount: solAmt,
            tokenAmount: tokAmt,
            priceSol: spotPrice,
            timestamp: txTime,
            txHash: sigInfo.signature,
          });
          changed = true;
        }
      }
    }

    if (changed) {
      store.tokens.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      store.trades.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      saveStore(store);
    }
  } catch (_) {}

  return store;
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
        } else if (
          (incoming.volume24hSol || 0) > (store.tokens[idx].volume24hSol || 0) ||
          (incoming.videoUrl && !store.tokens[idx].videoUrl)
        ) {
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  await recoverFromSolanaChain();

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
