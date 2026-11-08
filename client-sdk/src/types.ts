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
  virtualOrbitReserves: bigint;
  virtualTokenReserves: bigint;
  realOrbitReserves: bigint;
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
  orbitAmount: number;
  tokenAmount: number;
  feeTreasury: number;
  feeBurned: number;
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
  marketCapOrbit: number;
  marketCapUsd: number;
  priceOrbit: number;
  progressPercent: number; // 0% to 100% (Achieved Orbit)
  realOrbitReserves: number;
  realTokenReserves: number;
  volume24hOrbit: number;
  repliesCount: number;
  isGraduated: boolean;    // "In Orbit"
  createdAt: number;
  socials: {
    twitter?: string;
    telegram?: string;
    website?: string;
  };
}

export interface OrbitBurnStats {
  totalBurned: number;
  recentBurns: Array<{
    amount: number;
    reason: string;
    timestamp: number;
  }>;
}

