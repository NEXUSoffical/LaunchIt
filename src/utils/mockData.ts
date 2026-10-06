import { Token, Trade } from "../types";

export const INITIAL_TOKENS: Token[] = [
  {
    id: "tiktok-test",
    mint: "GenTEST8v9k3L1mF5c0uW7aR2jX6nQ4pZ0sT8dY4bA1vC2e",
    name: "Test Viral Coin",
    symbol: "TEST",
    description: "Launched directly from TikTok video: https://www.tiktok.com/@phil_john_jean/video/7693373843641060629 via LaunchIt Extension.",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
    creator: "@phil_john_jean",
    marketCapSol: 30.0,
    marketCapUsd: 4500,
    priceSol: 0.00000003,
    progressPercent: 0.0,
    realSolReserves: 0.0,
    realTokenReserves: 800_000_000,
    volume24hSol: 0.0,
    repliesCount: 0,
    isGraduated: false,
    createdAt: 1728217000000,
    socials: {
      website: "https://www.tiktok.com/@phil_john_jean/video/7693373843641060629",
    },
  },
];

export const INITIAL_TRADES: Trade[] = [];
