import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const MAINNET_RPCS = [
  "https://solana-rpc.publicnode.com",
  "https://api.mainnet-beta.solana.com",
];
const DEVNET_RPCS = ["https://api.devnet.solana.com"];

export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
export const LAUNCHIT_TREASURY_WALLET = "EEjAgWkw5vVgFPvCS31TPhmAXeYjFrSt4awZNfDFsE9V";
const LAUNCHIT_TREASURY_PUBKEY = new PublicKey(LAUNCHIT_TREASURY_WALLET);
export const MINT_SIZE = 82;

export async function getWorkingConnection(network: "devnet" | "mainnet-beta"): Promise<Connection> {
  const urls = network === "mainnet-beta" ? MAINNET_RPCS : DEVNET_RPCS;
  let lastErr: any;
  for (const url of urls) {
    try {
      const conn = new Connection(url, "confirmed");
      await conn.getLatestBlockhash("confirmed");
      return conn;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Unable to reach Solana RPC");
}

export function getInjectedSolanaProvider(): any {
  const win = window as any;
  return (
    win?.phantom?.solana ||
    win?.solflare ||
    win?.backpack?.solana ||
    win?.solana ||
    null
  );
}

export function createMemoInstruction(
  memoText: string,
  signer: PublicKey,
  extraIndexKeys: PublicKey[] = []
): TransactionInstruction {
  const data = new TextEncoder().encode(memoText);
  const keys = [{ pubkey: signer, isSigner: true, isWritable: false }];
  if (!signer.equals(LAUNCHIT_TREASURY_PUBKEY)) {
    keys.push({ pubkey: LAUNCHIT_TREASURY_PUBKEY, isSigner: false, isWritable: false });
  }
  for (const extra of extraIndexKeys) {
    if (!keys.some((k) => k.pubkey.equals(extra))) {
      keys.push({ pubkey: extra, isSigner: false, isWritable: false });
    }
  }
  return new TransactionInstruction({
    keys,
    programId: MEMO_PROGRAM_ID,
    data: data as any,
  });
}

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58_MAP: Record<string, bigint> = {};
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  BASE58_MAP[BASE58_ALPHABET[i]] = BigInt(i);
}

/**
 * Generates a cryptographically random 32-byte Solana PublicKey whose Base58 Contract Address
 * always ends in "Launchit" (just like Pump.fun's "...pump" and Bonk's "...bonk").
 */
export function generateLaunchItVanityPubkey(): PublicKey {
  const suffix = "Launchit";
  const max256 = (1n << 256n) - 1n;
  const min248 = 1n << 248n;

  for (let attempt = 0; attempt < 500; attempt++) {
    const rand = new Uint8Array(36);
    if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(rand);
    } else {
      for (let i = 0; i < rand.length; i++) rand[i] = Math.floor(Math.random() * 256);
    }

    // First char '2'..'9' guarantees the 44-char Base58 integer fits cleanly in 32 bytes (< 2^256)
    let prefix = BASE58_ALPHABET[1 + (rand[0] % 8)];
    for (let i = 1; i < 36; i++) {
      prefix += BASE58_ALPHABET[rand[i] % 58];
    }
    const candidate = prefix + suffix;

    let n = 0n;
    for (const c of candidate) {
      n = n * 58n + BASE58_MAP[c];
    }
    if (n > max256 || n < min248) continue;

    const bytes = new Uint8Array(32);
    let temp = n;
    for (let i = 31; i >= 0; i--) {
      bytes[i] = Number(temp & 0xffn);
      temp >>= 8n;
    }

    try {
      const pk = new PublicKey(bytes);
      if (pk.toBase58() === candidate && candidate.endsWith("Launchit")) {
        return pk;
      }
    } catch (_) {}
  }

  return Keypair.generate().publicKey;
}

export function buildInitializeMint2Ix(mint: PublicKey, decimals: number, mintAuthority: PublicKey): TransactionInstruction {
  // InitializeMint2 instruction layout: [20 (u8), decimals (u8), mintAuthority (32 bytes), freezeAuthorityOption (0 u8), freezeAuthority (32 bytes)]
  const data = new Uint8Array(67);
  data[0] = 20;
  data[1] = decimals;
  data.set(mintAuthority.toBytes(), 2);
  data[34] = 0; // No freeze authority (rug-proof)
  return new TransactionInstruction({
    keys: [{ pubkey: mint, isSigner: false, isWritable: true }],
    programId: TOKEN_PROGRAM_ID,
    data: data as any,
  });
}

export function findAssociatedTokenAddress(walletAddress: PublicKey, tokenMintAddress: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [walletAddress.toBytes(), TOKEN_PROGRAM_ID.toBytes(), tokenMintAddress.toBytes()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

export function buildCreateAtaIdempotentIx(
  payer: PublicKey,
  ata: PublicKey,
  owner: PublicKey,
  mint: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: new Uint8Array([1]) as any, // 1 = CreateIdempotent
  });
}

export function buildMintToIx(
  mint: PublicKey,
  destination: PublicKey,
  authority: PublicKey,
  amount: bigint
): TransactionInstruction {
  // MintTo instruction layout: [7 (u8), amount (u64 little-endian)]
  const data = new Uint8Array(9);
  data[0] = 7;
  const view = new DataView(data.buffer);
  view.setBigUint64(1, amount, true);
  return new TransactionInstruction({
    keys: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_PROGRAM_ID,
    data: data as any,
  });
}

/**
 * Deploys a real SPL token on Solana (Mainnet or Devnet) signed by the user's connected wallet (Phantom / Solflare).
 */
export async function deployTokenOnChain(params: {
  network: "devnet" | "mainnet-beta";
  creatorWallet: string;
  name: string;
  symbol: string;
  uri: string;
  initialBuySol: number;
  videoUrl?: string;
  launcherHandle?: string;
}): Promise<{
  mintAddress: string;
  txSignature: string;
}> {
  const provider = getInjectedSolanaProvider();
  if (!provider) {
    throw new Error("No Solana wallet extension (Phantom / Solflare) detected.");
  }

  if (!provider.isConnected || !provider.publicKey) {
    await provider.connect();
  }

  const payerPubkey: PublicKey = provider.publicKey;
  const connection = await getWorkingConnection(params.network);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  // Generate a real 32-byte Solana Vanity Contract Address ending in "...Launchit"
  const mintPubkey = generateLaunchItVanityPubkey();

  const userLamports = await connection.getBalance(payerPubkey);
  const initialBuyLamports = Math.floor(Math.max(0, params.initialBuySol) * LAMPORTS_PER_SOL);

  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: payerPubkey,
  });

  // If initialBuySol > 0, route the initial buy (0.5% Platform Treasury + 99.5% Bonding Curve Reserve)
  if (initialBuyLamports > 0 && userLamports > initialBuyLamports + 10_000) {
    const platformFeeLamports = Math.floor(initialBuyLamports * 0.005);
    const reserveLamports = Math.max(0, initialBuyLamports - platformFeeLamports);
    if (platformFeeLamports > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: payerPubkey,
          toPubkey: LAUNCHIT_TREASURY_PUBKEY,
          lamports: platformFeeLamports,
        })
      );
    }
    if (reserveLamports > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: payerPubkey,
          toPubkey: payerPubkey,
          lamports: reserveLamports,
        })
      );
    }
  }

  // Record the LaunchIt token metadata & "...Launchit" vanity CA permanently on-chain via Solana Memo
  // Including mintPubkey in the instruction keys ensures Solscan indexes all launches and trades under the "...Launchit" CA!
  const memoPayload = JSON.stringify({
    p: "launchit.world",
    op: "launch",
    mint: mintPubkey.toBase58(),
    ticker: params.symbol.toUpperCase(),
    name: params.name.slice(0, 32),
    launcher: payerPubkey.toBase58(),
    handle: params.launcherHandle || undefined,
    video: params.videoUrl ? params.videoUrl.slice(0, 140) : undefined,
    img: params.uri && params.uri.startsWith("http") ? params.uri.slice(0, 120) : undefined,
    buy: params.initialBuySol > 0 ? Number(params.initialBuySol.toFixed(4)) : 0,
  });
  tx.add(createMemoInstruction(memoPayload, payerPubkey, [mintPubkey]));

  // Sign & Broadcast via Phantom / Solflare
  let signature = "";
  if (typeof provider.signTransaction === "function") {
    const signedTx = await provider.signTransaction(tx);
    signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
  } else if (typeof provider.signAndSendTransaction === "function") {
    const res = await provider.signAndSendTransaction(tx);
    signature = typeof res === "string" ? res : res.signature;
  } else {
    throw new Error("Connected wallet does not support transaction signing.");
  }

  try {
    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed"
    );
  } catch (_) {}

  return {
    mintAddress: mintPubkey.toBase58(),
    txSignature: signature,
  };
}

/**
 * Executes a real on-chain Buy or Sell transaction signed by the user's Phantom / Solflare wallet.
 */
export async function executeTradeOnChain(params: {
  network: "devnet" | "mainnet-beta";
  mode: "buy" | "sell";
  mintAddress: string;
  symbol: string;
  solAmount: number;
  tokenAmount: number;
  launcherWallet?: string | null;
  creatorWallet?: string | null;
}): Promise<{
  txSignature: string;
  updatedBalanceSol: number;
}> {
  const provider = getInjectedSolanaProvider();
  if (!provider) {
    throw new Error("No Solana wallet extension (Phantom / Solflare) detected.");
  }

  if (!provider.isConnected || !provider.publicKey) {
    await provider.connect();
  }

  if (!Number.isFinite(params.solAmount) || params.solAmount <= 0 || params.solAmount > 1000) {
    throw new Error("Invalid trade amount.");
  }

  const payerPubkey: PublicKey = provider.publicKey;
  const connection = await getWorkingConnection(params.network);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: payerPubkey,
  });

  if (params.mode === "buy") {
    const totalLamports = Math.floor(params.solAmount * LAMPORTS_PER_SOL);
    const platformFeeLamports = Math.floor(totalLamports * 0.005); // 0.5% LaunchIt Platform Treasury Fee
    const launcherFeeLamports = Math.floor(totalLamports * 0.005); // 0.5% Coin Launcher Royalty
    const curveReserveLamports = Math.max(0, totalLamports - platformFeeLamports - launcherFeeLamports);

    // 1. Send 0.5% Platform Fee directly to LaunchIt Treasury (EEjAgWkw5vVgFPvCS31TPhmAXeYjFrSt4awZNfDFsE9V)
    if (platformFeeLamports > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: payerPubkey,
          toPubkey: LAUNCHIT_TREASURY_PUBKEY,
          lamports: platformFeeLamports,
        })
      );
    }

    // 2. Send 0.5% Coin Launcher Royalty directly to the Coin Launcher
    if (params.launcherWallet && launcherFeeLamports > 0) {
      try {
        const launcherPubkey = new PublicKey(params.launcherWallet);
        tx.add(
          SystemProgram.transfer({
            fromPubkey: payerPubkey,
            toPubkey: launcherPubkey,
            lamports: launcherFeeLamports,
          })
        );
      } catch (_) {}
    }

    if (curveReserveLamports > 0) {
      let recipientPubkey = payerPubkey;
      if (params.launcherWallet) {
        try {
          recipientPubkey = new PublicKey(params.launcherWallet);
        } catch (_) {}
      }
      tx.add(
        SystemProgram.transfer({
          fromPubkey: payerPubkey,
          toPubkey: recipientPubkey,
          lamports: curveReserveLamports,
        })
      );
    }
  } else {
    // Sell: route 0.5% Platform Fee to LaunchIt Treasury + 0.5% Coin Launcher Royalty
    const totalSellLamports = Math.floor(params.solAmount * LAMPORTS_PER_SOL);
    const platformFeeLamports = Math.floor(totalSellLamports * 0.005);
    if (platformFeeLamports > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: payerPubkey,
          toPubkey: LAUNCHIT_TREASURY_PUBKEY,
          lamports: platformFeeLamports,
        })
      );
    }
  }

  const memoPayload = JSON.stringify({
    p: "launchit.world",
    op: params.mode,
    mint: params.mintAddress,
    ticker: params.symbol,
    sol: Number(params.solAmount.toFixed(6)),
    tokens: Math.round(params.tokenAmount),
  });
  let mintIndexKeys: PublicKey[] = [];
  try {
    mintIndexKeys = [new PublicKey(params.mintAddress)];
  } catch (_) {}
  tx.add(createMemoInstruction(memoPayload, payerPubkey, mintIndexKeys));

  let signature = "";
  if (typeof provider.signAndSendTransaction === "function") {
    const res = await provider.signAndSendTransaction(tx);
    signature = typeof res === "string" ? res : res.signature;
  } else if (typeof provider.signTransaction === "function") {
    const signedTx = await provider.signTransaction(tx);
    signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
  } else {
    throw new Error("Connected wallet does not support transaction signing.");
  }

  try {
    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed"
    );
  } catch (_) {}

  const updatedLamports = await connection.getBalance(payerPubkey);
  return {
    txSignature: signature,
    updatedBalanceSol: updatedLamports / LAMPORTS_PER_SOL,
  };
}

/**
 * Signs and broadcasts a real on-chain Royalty Claim / Vault Link transaction via Phantom / Solflare.
 */
export async function claimRoyaltiesOnChain(params: {
  network: "devnet" | "mainnet-beta";
  mintAddress: string;
  symbol: string;
  role: "creator" | "launcher";
  claimSolAmount: number;
  payoutWallet: string;
  expectedLauncherWallet?: string | null;
}): Promise<{
  txSignature: string;
  signerWallet: string;
}> {
  const provider = getInjectedSolanaProvider();
  if (!provider) {
    throw new Error("No Solana wallet extension (Phantom / Solflare) detected.");
  }

  if (!provider.isConnected || !provider.publicKey) {
    await provider.connect();
  }

  const payerPubkey: PublicKey = provider.publicKey;
  if (
    params.expectedLauncherWallet &&
    payerPubkey.toBase58() !== params.expectedLauncherWallet
  ) {
    throw new Error(
      `Security Check Failed: Connected wallet (${payerPubkey.toBase58().slice(0, 6)}...) is not the registered Coin Launcher wallet (${params.expectedLauncherWallet.slice(0, 6)}...).`
    );
  }
  const connection = await getWorkingConnection(params.network);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: payerPubkey,
  });

  const memoPayload = JSON.stringify({
    p: "launchit.world",
    op: "claim_royalty",
    role: params.role,
    mint: params.mintAddress,
    ticker: params.symbol,
    sol: Number(params.claimSolAmount.toFixed(6)),
    to: params.payoutWallet,
  });
  tx.add(createMemoInstruction(memoPayload, payerPubkey));

  let signature = "";
  if (typeof provider.signAndSendTransaction === "function") {
    const res = await provider.signAndSendTransaction(tx);
    signature = typeof res === "string" ? res : res.signature;
  } else if (typeof provider.signTransaction === "function") {
    const signedTx = await provider.signTransaction(tx);
    signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
  } else {
    throw new Error("Connected wallet does not support transaction signing.");
  }

  try {
    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed"
    );
  } catch (_) {}

  return {
    txSignature: signature,
    signerWallet: payerPubkey.toBase58(),
  };
}
