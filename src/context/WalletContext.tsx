import React, { createContext, useContext, useState, useEffect } from "react";

interface WalletContextType {
  connected: boolean;
  publicKey: string | null;
  balance: number;
  network: "devnet" | "mainnet-beta";
  setNetwork: (net: "devnet" | "mainnet-beta") => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  requestAirdrop: () => Promise<void>;
  isAirdropping: boolean;
  userTokens: Record<string, number>;
  updateTokenBalance: (mint: string, deltaTokens: number) => void;
  deductSol: (amount: number) => boolean;
  addSol: (amount: number) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState<boolean>(true);
  const [publicKey, setPublicKey] = useState<string | null>("Sol9GenesisVauLtX82n7k4mW1pL3qB5c0uM4qD8jE1");
  const [balance, setBalance] = useState<number>(14.5);
  const [network, setNetwork] = useState<"devnet" | "mainnet-beta">("devnet");
  const [isAirdropping, setIsAirdropping] = useState<boolean>(false);
  const [userTokens, setUserTokens] = useState<Record<string, number>>({
    "GenX7K9pQ5bWmR4v1k8Zs3nLe2YtF6aC0uM4qD8jE1oP": 45_000_000,
  });

  const connect = async () => {
    // Check if phantom / solana is available on window
    const solanaWindow = (window as unknown as { solana?: { isPhantom?: boolean; connect: () => Promise<{ publicKey: { toString: () => string } }> } });
    if (solanaWindow?.solana?.isPhantom) {
      try {
        const resp = await solanaWindow.solana.connect();
        setPublicKey(resp.publicKey.toString());
        setConnected(true);
        return;
      } catch (err) {
        console.warn("Phantom connection rejected, using test wallet:", err);
      }
    }

    // Default fast-connect wallet for instant test UX
    setPublicKey("Sol9GenesisVauLtX82n7k4mW1pL3qB5c0uM4qD8jE1");
    setConnected(true);
  };

  const disconnect = () => {
    setConnected(false);
    setPublicKey(null);
  };

  const requestAirdrop = async () => {
    setIsAirdropping(true);
    // Simulates or executes devnet airdrop
    await new Promise((resolve) => setTimeout(resolve, 800));
    setBalance((prev) => prev + 1.0);
    setIsAirdropping(false);
  };

  const deductSol = (amount: number): boolean => {
    if (balance < amount) return false;
    setBalance((prev) => Math.max(0, prev - amount));
    return true;
  };

  const addSol = (amount: number) => {
    setBalance((prev) => prev + amount);
  };

  const updateTokenBalance = (mint: string, deltaTokens: number) => {
    setUserTokens((prev) => {
      const current = prev[mint] || 0;
      const updated = Math.max(0, current + deltaTokens);
      return { ...prev, [mint]: updated };
    });
  };

  return (
    <WalletContext.Provider
      value={{
        connected,
        publicKey,
        balance,
        network,
        setNetwork,
        connect,
        disconnect,
        requestAirdrop,
        isAirdropping,
        userTokens,
        updateTokenBalance,
        deductSol,
        addSol,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
