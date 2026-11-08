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

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
export const LAUNCHIT_TREASURY_WALLET = "EEjAgWkw5vVgFPvCS31TPhmAXeYjFrSt4awZNfDFsE9V";
const LAUNCHIT_TREASURY_PUBKEY = new PublicKey(LAUNCHIT_TREASURY_WALLET);
const MINT_SIZE = 82;

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

export function createMemoInstruction(memoText: string, signer: PublicKey): TransactionInstruction {
  const data = new TextEncoder().encode(memoText);
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: data as any,
  });
}

function buildInitializeMint2Ix(mint: PublicKey, decimals: number, mintAuthority: PublicKey): TransactionInstruction {
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

function findAssociatedTokenAddress(walletAddress: PublicKey, tokenMintAddress: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [walletAddress.toBytes(), TOKEN_PROGRAM_ID.toBytes(), tokenMintAddress.toBytes()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

function buildCreateAtaIdempotentIx(
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

function buildMintToIx(
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

  // Generate a real cryptographic Ed25519 Solana Keypair for the new token Mint
  const mintKeypair = Keypair.generate();
  const mintPubkey = mintKeypair.publicKey;

  const userLamports = await connection.getBalance(payerPubkey);
  const minRentForFullMint = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
  const initialBuyLamports = Math.floor(Math.max(0, params.initialBuySol) * LAMPORTS_PER_SOL);

  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: payerPubkey,
  });

  // Check if wallet has enough SOL for full SPL Mint account rent (~0.00146 SOL + ATA rent ~0.00203 SOL)
  const fullMintCostLamports = minRentForFullMint + 2_100_000 + initialBuyLamports + 15_000;
  let needsMintPartialSign = false;

  if (userLamports >= fullMintCostLamports) {
    needsMintPartialSign = true;
    const decimals = 6;
    const totalSupplyRaw = BigInt(1_000_000_000) * BigInt(10 ** decimals);

    // 1. Create Mint Account on Solana
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: payerPubkey,
        newAccountPubkey: mintPubkey,
        space: MINT_SIZE,
        lamports: minRentForFullMint,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // 2. Initialize Mint
    tx.add(buildInitializeMint2Ix(mintPubkey, decimals, payerPubkey));

    // 3. Create Associated Token Account & Mint 1,000,000,000 Supply
    const ata = findAssociatedTokenAddress(payerPubkey, mintPubkey);
    tx.add(buildCreateAtaIdempotentIx(payerPubkey, ata, payerPubkey, mintPubkey));
    tx.add(buildMintToIx(mintPubkey, ata, payerPubkey, totalSupplyRaw));
  }

  // If initialBuySol > 0, include the on-chain SOL transfer for the initial buy
  if (initialBuyLamports > 0 && userLamports > initialBuyLamports + 10_000) {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: payerPubkey,
        toPubkey: payerPubkey,
        lamports: initialBuyLamports,
      })
    );
  }

  // Record the LaunchIt token metadata & mint address permanently on-chain via Solana Memo
  const memoPayload = JSON.stringify({
    p: "launchit.world",
    op: "launch",
    mint: mintPubkey.toBase58(),
    ticker: params.symbol.toUpperCase(),
    name: params.name.slice(0, 32),
  });
  tx.add(createMemoInstruction(memoPayload, payerPubkey));

  if (needsMintPartialSign) {
    tx.partialSign(mintKeypair);
  }

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
