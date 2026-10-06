export interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  description?: string;
  image?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface OnChainBondingCurve {
  mint: string;
  creator: string;
  virtualSolReserves: bigint;
  virtualTokenReserves: bigint;
  realSolReserves: bigint;
  realTokenReserves: bigint;
  tokenTotalSupply: bigint;
  complete: boolean;
  createdAt: number;
}

export interface TradeRecord {
  id: string;
  mint: string;
  user: string;
  isBuy: boolean;
  solAmount: number;
  tokenAmount: number;
  timestamp: number;
  txHash: string;
}

export interface LaunchpadToken {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  creator: string;
  marketCapSol: number;
  marketCapUsd: number;
  priceSol: number;
  progressPercent: number;
  realSolReserves: number;
  realTokenReserves: number;
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
