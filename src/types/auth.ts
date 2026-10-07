export interface UserAccount {
  id: string;
  username: string; // e.g. "cryptogod"
  email: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  twitterHandle?: string;
  solanaWallet: string; // public key
  balanceSol: number;
  userTokens?: Record<string, number>;
  createdAt: number;
  reputationKarma: number;
}

export interface CoinThesis {
  id: string;
  mint: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string;
  title: string;
  content: string;
  sentiment: "bullish" | "bearish";
  targetMarketCapSol?: number;
  likes: string[]; // user IDs who liked
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  mint?: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string;
  text: string;
  timestamp: number;
}
