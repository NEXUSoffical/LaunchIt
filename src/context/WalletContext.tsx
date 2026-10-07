import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

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
  const { currentUser, updateUserBalance, updateUserTokens } = useAuth();

  const [connected, setConnected] = useState<boolean>(true);
  const [publicKey, setPublicKey] = useState<string | null>(
    currentUser?.solanaWallet || "Sol9GenesisVauLtX82n7k4mW1pL3qB5c0uM4qD8jE1"
  );
  const [balance, setBalance] = useState<number>(currentUser?.balanceSol ?? 0.0);
  const [network, setNetwork] = useState<"devnet" | "mainnet-beta">("devnet");
  const [isAirdropping, setIsAirdropping] = useState<boolean>(false);
  const [userTokens, setUserTokens] = useState<Record<string, number>>(
    currentUser?.userTokens || {}
  );

  // Sync wallet state with currentUser
  useEffect(() => {
    if (currentUser) {
      setPublicKey(currentUser.solanaWallet);
      setBalance(currentUser.balanceSol);
      if (currentUser.userTokens) {
        setUserTokens(currentUser.userTokens);
      }
      setConnected(true);
    }
  }, [currentUser]);

  const connect = async () => {
    const solanaWindow = (window as unknown as { solana?: { isPhantom?: boolean; connect: () => Promise<{ publicKey: { toString: () => string } }> } });
    if (solanaWindow?.solana?.isPhantom) {
      try {
        const resp = await solanaWindow.solana.connect();
        setPublicKey(resp.publicKey.toString());
        setConnected(true);
        return;
      } catch (err) {
        console.warn("Phantom connection rejected, using account wallet:", err);
      }
    }

    if (currentUser) {
      setPublicKey(currentUser.solanaWallet);
    } else {
      setPublicKey("Sol9GenesisVauLtX82n7k4mW1pL3qB5c0uM4qD8jE1");
    }
    setConnected(true);
  };

  const disconnect = () => {
    setConnected(false);
    setPublicKey(null);
  };

  const requestAirdrop = async () => {
    setIsAirdropping(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    const newBal = balance + 1.0;
    setBalance(newBal);
    updateUserBalance(1.0, true);
    setIsAirdropping(false);
  };

  const deductSol = (amount: number): boolean => {
    if (balance < amount) return false;
    const newBal = Math.max(0, balance - amount);
    setBalance(newBal);
    updateUserBalance(newBal, false);
    return true;
  };

  const addSol = (amount: number) => {
    const newBal = balance + amount;
    setBalance(newBal);
    updateUserBalance(newBal, false);
  };

  const updateTokenBalance = (mint: string, deltaTokens: number) => {
    setUserTokens((prev) => {
      const current = prev[mint] || 0;
      const updated = Math.max(0, current + deltaTokens);
      return { ...prev, [mint]: updated };
    });
    updateUserTokens(mint, deltaTokens);
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
