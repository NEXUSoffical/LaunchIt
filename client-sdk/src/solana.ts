import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";

export const PROGRAM_ID = new PublicKey(
  "Launch1111111111111111111111111111111111111"
);

export const CONFIG_SEED = Buffer.from("launchpad_config");
export const BONDING_CURVE_SEED = Buffer.from("bonding_curve");
export const CURVE_VAULT_SEED = Buffer.from("curve_vault");

export function getLaunchpadConfigPDA(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
}

export function getBondingCurvePDA(
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BONDING_CURVE_SEED, mint.toBuffer()],
    programId
  );
}

export function getCurveVaultPDA(
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [CURVE_VAULT_SEED, mint.toBuffer()],
    programId
  );
}

export function getUserTokenAccount(
  mint: PublicKey,
  owner: PublicKey,
  tokenProgramId: PublicKey = TOKEN_2022_PROGRAM_ID
): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner, false, tokenProgramId);
}

export function createEnsureAtaInstruction(
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  tokenProgramId: PublicKey = TOKEN_2022_PROGRAM_ID
): TransactionInstruction {
  const ata = getUserTokenAccount(mint, owner, tokenProgramId);
  return createAssociatedTokenAccountIdempotentInstruction(
    payer,
    ata,
    owner,
    mint,
    tokenProgramId
  );
}
