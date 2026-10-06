export interface Token {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  creator: string;
  creatorHandle?: string;
  creatorWallet?: string | null;
  launcherWallet?: string | null;
  feeSplit?: "creator_100" | "split_50_50" | "launcher_100";
  unclaimedCreatorFeesSol?: number;
  claimedCreatorFeesSol?: number;
  unclaimedLauncherFeesSol?: number;
  claimedLauncherFeesSol?: number;
  marketCapSol: number;
  marketCapUsd: number;
  priceSol: number;
  progressPercent: number;
  realSolReserves: number;
  realTokenReserves: number; // in tokens
  volume24hSol: number;
  repliesCount: number;
  isGraduated: boolean;
  createdAt: number;
  socials: {
    twitter?: string;
    telegram?: string;
    website?: string;
  };
}

export interface Trade {
  id: string;
  mint: string;
  user: string;
  isBuy: boolean;
  solAmount: number;
  tokenAmount: number;
  priceSol: number;
  timestamp: number;
  txHash: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
