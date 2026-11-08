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

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,90}$/;
const ipRateLimits = new Map();

function isValidSolanaAddress(addr) {
  return typeof addr === "string" && addr.length >= 32 && addr.length <= 48 && BASE58_REGEX.test(addr);
}

function isValidTxSignature(sig) {
  return typeof sig === "string" && sig.length >= 43 && sig.length <= 92 && BASE58_REGEX.test(sig);
}

function sanitizeText(str, maxLen = 300) {
  if (typeof str !== "string") return "";
  return str.replace(/[\u0000-\u001F\u007F<>]/g, "").trim().slice(0, maxLen);
}

function sanitizeSafeUrl(url, fallback = "") {
  if (typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (trimmed === "/logo.jpg") return trimmed;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(trimmed) && trimmed.length < 350_000) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.slice(0, 500);
  }
  return fallback;
}

function sanitizeLikes(likes) {
  if (!Array.isArray(likes)) return [];
  const unique = new Set();
  for (const item of likes) {
    if (typeof item === "string" && item.length >= 4 && item.length <= 64) {
      unique.add(item.replace(/[^a-zA-Z0-9_.-]/g, ""));
    }
    if (unique.size >= 5000) break;
  }
  return Array.from(unique);
}

function sanitizeIncomingToken(incoming, existing = null) {
  if (!incoming || !isValidSolanaAddress(incoming.mint)) return null;

  const safePrice = Number.isFinite(Number(incoming.priceSol)) && Number(incoming.priceSol) > 0
    ? Math.min(1000, Math.max(0.000000001, Number(incoming.priceSol)))
    : existing?.priceSol || 0.00000003;

  const safeSolReserves = Number.isFinite(Number(incoming.realSolReserves)) && Number(incoming.realSolReserves) >= 0
    ? Math.min(100_000, Number(incoming.realSolReserves))
    : existing?.realSolReserves || 0;

  const safeTokenReserves = Number.isFinite(Number(incoming.realTokenReserves)) && Number(incoming.realTokenReserves) >= 0
    ? Math.min(1_000_000_000, Number(incoming.realTokenReserves))
    : existing?.realTokenReserves ?? 800_000_000;

  const safeVolume = Number.isFinite(Number(incoming.volume24hSol)) && Number(incoming.volume24hSol) >= 0
    ? Math.max(existing?.volume24hSol || 0, Math.min(10_000_000, Number(incoming.volume24hSol)))
    : existing?.volume24hSol || 0;

  const safeMarketCapSol = safePrice * 1_000_000_000;

  // SECURITY: Once a token exists, its mint, launcherWallet, creatorWallet, symbol, name, and createdAt are IMMUTABLE.
  // Nobody can hijack a coin's 0.5% launcher royalty wallet or overwrite ownership via API requests.
  return {
    ...(existing || {}),
    id: existing?.id || sanitizeText(incoming.id, 64) || `token-${Date.now()}`,
    mint: existing ? existing.mint : incoming.mint,
    name: existing ? existing.name : sanitizeText(incoming.name, 60) || "Untitled Meme",
    symbol: existing ? existing.symbol : sanitizeText(incoming.symbol, 16).toUpperCase() || "MEME",
    description: existing?.description || sanitizeText(incoming.description, 500),
    image: existing?.image && existing.image !== "/logo.jpg"
      ? existing.image
      : sanitizeSafeUrl(incoming.image, "/logo.jpg"),
    videoUrl: existing?.videoUrl || sanitizeSafeUrl(incoming.videoUrl, undefined) || undefined,
    creator: existing?.creator || sanitizeText(incoming.creator, 60),
    creatorHandle: existing?.creatorHandle || sanitizeText(incoming.creatorHandle, 40) || undefined,
    launcherHandle: existing?.launcherHandle || sanitizeText(incoming.launcherHandle, 40) || undefined,
    launcherWallet: existing?.launcherWallet && isValidSolanaAddress(existing.launcherWallet)
      ? existing.launcherWallet
      : isValidSolanaAddress(incoming.launcherWallet)
      ? incoming.launcherWallet
      : TREASURY_WALLET,
    creatorWallet: existing?.creatorWallet && isValidSolanaAddress(existing.creatorWallet)
      ? existing.creatorWallet
      : isValidSolanaAddress(incoming.creatorWallet)
      ? incoming.creatorWallet
      : undefined,
    feeSplit: "split_50_50",
    unclaimedCreatorFeesSol: 0,
    unclaimedLauncherFeesSol: Number.isFinite(Number(incoming.unclaimedLauncherFeesSol)) && Number(incoming.unclaimedLauncherFeesSol) >= 0
      ? Math.min(10_000, Number(incoming.unclaimedLauncherFeesSol))
      : existing?.unclaimedLauncherFeesSol || 0,
    claimedCreatorFeesSol: existing?.claimedCreatorFeesSol || 0,
    claimedLauncherFeesSol: Number.isFinite(Number(incoming.claimedLauncherFeesSol)) && Number(incoming.claimedLauncherFeesSol) >= 0
      ? Math.max(existing?.claimedLauncherFeesSol || 0, Number(incoming.claimedLauncherFeesSol))
      : existing?.claimedLauncherFeesSol || 0,
    marketCapSol: safeMarketCapSol,
    marketCapUsd: safeMarketCapSol * 150,
    priceSol: safePrice,
    progressPercent: Math.min(100, Math.max(0, (safeSolReserves / 85.0) * 100)),
    realSolReserves: safeSolReserves,
    realTokenReserves: safeTokenReserves,
    volume24hSol: safeVolume,
    repliesCount: Math.max(existing?.repliesCount || 0, Number(incoming.repliesCount) || 0),
    likes: Array.isArray(incoming.likes) ? sanitizeLikes(incoming.likes) : sanitizeLikes(existing?.likes),
    isGraduated: Boolean(existing?.isGraduated || safeSolReserves >= 85),
    createdAt: existing?.createdAt || Number(incoming.createdAt) || Date.now(),
    socials: existing?.socials || {
      twitter: sanitizeSafeUrl(incoming.socials?.twitter, undefined),
      telegram: sanitizeSafeUrl(incoming.socials?.telegram, undefined),
      website: sanitizeSafeUrl(incoming.socials?.website, undefined),
    },
  };
}

export function applyDbAction(action, payload) {
  const store = loadStore();

  if (action === "UPSERT_TOKEN" && payload?.token?.mint) {
    const incoming = payload.token;
    if (!isValidSolanaAddress(incoming.mint)) return store;
    const idx = store.tokens.findIndex((t) => t.mint === incoming.mint);
    const sanitized = sanitizeIncomingToken(incoming, idx >= 0 ? store.tokens[idx] : null);
    if (!sanitized) return store;
    if (idx >= 0) {
      store.tokens[idx] = sanitized;
    } else {
      store.tokens.unshift(sanitized);
    }
    store.tokens.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    saveStore(store);
  } else if (action === "ADD_TRADE" && payload?.trade?.id) {
    const trade = payload.trade;
    const solAmt = Number(trade.solAmount);
    const tokAmt = Number(trade.tokenAmount);
    // Require a valid Solana transaction signature and positive finite amounts
    if (
      !isValidSolanaAddress(trade.mint) ||
      !isValidTxSignature(trade.txHash) ||
      !Number.isFinite(solAmt) ||
      solAmt <= 0 ||
      solAmt > 10_000 ||
      !Number.isFinite(tokAmt) ||
      tokAmt <= 0
    ) {
      return store;
    }

    const safeTrade = {
      id: sanitizeText(trade.id, 64),
      mint: trade.mint,
      user: sanitizeText(trade.user, 48) || "Trader",
      isBuy: Boolean(trade.isBuy),
      solAmount: solAmt,
      tokenAmount: tokAmt,
      priceSol: Number.isFinite(Number(trade.priceSol)) && Number(trade.priceSol) > 0
        ? Number(trade.priceSol)
        : 0.00000003,
      timestamp: Number(trade.timestamp) || Date.now(),
      txHash: trade.txHash,
    };

    if (!store.trades.some((t) => t.id === safeTrade.id || t.txHash === safeTrade.txHash)) {
      store.trades.unshift(safeTrade);
      if (store.trades.length > 500) store.trades = store.trades.slice(0, 500);
    }
    if (payload.updatedToken?.mint && payload.updatedToken.mint === safeTrade.mint) {
      const idx = store.tokens.findIndex((t) => t.mint === payload.updatedToken.mint);
      const sanitized = sanitizeIncomingToken(payload.updatedToken, idx >= 0 ? store.tokens[idx] : null);
      if (sanitized) {
        if (idx >= 0) {
          store.tokens[idx] = sanitized;
        } else {
          store.tokens.unshift(sanitized);
        }
      }
    }
    saveStore(store);
  } else if (action === "UPSERT_THESIS" && payload?.thesis?.id && payload?.thesis?.mint) {
    const thesis = payload.thesis;
    const mint = thesis.mint;
    if (!isValidSolanaAddress(mint)) return store;
    if (!Array.isArray(store.theses[mint])) store.theses[mint] = [];
    const safeThesis = {
      id: sanitizeText(thesis.id, 64),
      mint,
      authorId: sanitizeText(thesis.authorId, 64),
      authorUsername: sanitizeText(thesis.authorUsername, 40),
      authorAvatar: sanitizeSafeUrl(thesis.authorAvatar, "/logo.jpg"),
      title: sanitizeText(thesis.title, 120),
      content: sanitizeText(thesis.content, 1000),
      bullish: Boolean(thesis.bullish),
      likes: sanitizeLikes(thesis.likes),
      createdAt: Number(thesis.createdAt) || Date.now(),
    };
    const idx = store.theses[mint].findIndex((t) => t.id === safeThesis.id);
    if (idx >= 0) {
      // Preserve original author and content on existing thesis; only update likes
      store.theses[mint][idx] = {
        ...store.theses[mint][idx],
        likes: safeThesis.likes,
      };
    } else {
      store.theses[mint].unshift(safeThesis);
    }
    saveStore(store);
  } else if (action === "ADD_MESSAGE" && payload?.message?.id && payload?.message?.mint) {
    const msg = payload.message;
    const mint = msg.mint;
    if (!isValidSolanaAddress(mint)) return store;
    const cleanText = sanitizeText(msg.text, 500);
    if (!cleanText) return store;
    if (!Array.isArray(store.messages[mint])) store.messages[mint] = [];
    if (!store.messages[mint].some((m) => m.id === msg.id)) {
      store.messages[mint].push({
        id: sanitizeText(msg.id, 64),
        mint,
        authorId: sanitizeText(msg.authorId, 64),
        authorUsername: sanitizeText(msg.authorUsername, 40) || "anon",
        authorAvatar: sanitizeSafeUrl(msg.authorAvatar, "/logo.jpg"),
        text: cleanText,
        timestamp: Number(msg.timestamp) || Date.now(),
      });
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
      for (const incoming of payload.tokens.slice(0, 100)) {
        if (!incoming?.mint || !isValidSolanaAddress(incoming.mint)) continue;
        const idx = store.tokens.findIndex((t) => t.mint === incoming.mint);
        if (idx === -1) {
          const sanitized = sanitizeIncomingToken(incoming, null);
          if (sanitized) {
            store.tokens.push(sanitized);
            changed = true;
          }
        } else if (
          (incoming.volume24hSol || 0) > (store.tokens[idx].volume24hSol || 0) ||
          (incoming.videoUrl && !store.tokens[idx].videoUrl) ||
          (incoming.likes?.length || 0) !== (store.tokens[idx].likes?.length || 0) ||
          (incoming.repliesCount || 0) > (store.tokens[idx].repliesCount || 0)
        ) {
          const sanitized = sanitizeIncomingToken(incoming, store.tokens[idx]);
          if (sanitized) {
            store.tokens[idx] = sanitized;
            changed = true;
          }
        }
      }
      store.tokens.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    if (Array.isArray(payload.trades)) {
      for (const tr of payload.trades.slice(0, 200)) {
        if (
          tr?.id &&
          isValidSolanaAddress(tr.mint) &&
          isValidTxSignature(tr.txHash) &&
          !store.trades.some((x) => x.id === tr.id || x.txHash === tr.txHash)
        ) {
          store.trades.push({
            id: sanitizeText(tr.id, 64),
            mint: tr.mint,
            user: sanitizeText(tr.user, 48) || "Trader",
            isBuy: Boolean(tr.isBuy),
            solAmount: Math.max(0, Number(tr.solAmount) || 0),
            tokenAmount: Math.max(0, Number(tr.tokenAmount) || 0),
            priceSol: Math.max(0.00000001, Number(tr.priceSol) || 0.00000003),
            timestamp: Number(tr.timestamp) || Date.now(),
            txHash: tr.txHash,
          });
          changed = true;
        }
      }
      store.trades.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    if (changed) saveStore(store);
  }

  return store;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Per-IP rate limiting on write requests (max 45 POST requests per 60 seconds per IP)
  if (req.method === "POST") {
    const ip =
      (req.headers?.["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      "local";
    const now = Date.now();
    const record = ipRateLimits.get(ip) || { count: 0, resetAt: now + 60_000 };
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + 60_000;
    }
    record.count += 1;
    ipRateLimits.set(ip, record);
    if (record.count > 45) {
      return res.status(429).json({ error: "Too many requests. Please slow down." });
    }
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
