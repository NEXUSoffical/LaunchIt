export interface Token {
  id: string;
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
