import React, { createContext, useContext, useState, useEffect } from "react";
import { Keypair } from "@solana/web3.js";
import { UserAccount } from "../types/auth";
import { supabase } from "../services/supabase";

export type WalletProviderName = "phantom" | "solflare" | "backpack" | "embedded";

interface AuthContextType {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  connectWalletAuth: (
    providerName?: WalletProviderName,
    preferredUsername?: string
  ) => Promise<{ success: boolean; walletAddress?: string; error?: string }>;
  loginWithWalletAddress: (walletAddress: string, preferredUsername?: string) => UserAccount;
  loginAsDemo: () => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserAccount>) => void;
  updateUserBalance: (deltaOrNew: number, isDelta?: boolean) => void;
  updateUserTokens: (mint: string, deltaTokens: number) => void;
  updateUserAssets: (params: {
    solDelta?: number;
    newSol?: number;
    tokenMint?: string;
    tokenDelta?: number;
    setExactToken?: number;
  }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const WALLET_ACCOUNTS_DB_KEY = "launchit_wallet_accounts_db";
const SESSION_KEY = "launchit_current_user";
const EMBEDDED_KEYPAIR_KEY = "launchit_embedded_solana_pubkey";

const getOrCreateEmbeddedWalletAddress = (): string => {
  try {
    const existing = localStorage.getItem(EMBEDDED_KEYPAIR_KEY);
    if (existing && existing.length >= 32) return existing;
    const kp = Keypair.generate();
    const pubkey = kp.publicKey.toBase58();
    localStorage.setItem(EMBEDDED_KEYPAIR_KEY, pubkey);
    return pubkey;
  } catch (_) {
    return "";
  }
};

const getStoredWalletAccounts = (): Record<string, UserAccount> => {
  try {
    const raw = localStorage.getItem(WALLET_ACCOUNTS_DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read wallet accounts DB", e);
  }
  return {};
};

const saveStoredWalletAccounts = (accounts: Record<string, UserAccount>) => {
  try {
    localStorage.setItem(WALLET_ACCOUNTS_DB_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error("Failed to save wallet accounts DB", e);
  }
};

const formatShortWalletHandle = (walletAddress: string): string => {
  return `${walletAddress.slice(0, 4)}_${walletAddress.slice(-4)}`.toLowerCase();
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) return JSON.parse(storedSession);
    } catch (_) {}
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync session across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) {
        if (e.newValue) {
          try {
            setCurrentUser(JSON.parse(e.newValue));
          } catch (_) {}
        } else {
          setCurrentUser(null);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Auto-reconnect if browser wallet is already trusted & connected
  useEffect(() => {
    if (currentUser) return;
    const win = window as any;
    const provider = win?.phantom?.solana || win?.solana;
    if (provider?.isPhantom && provider?.isConnected && provider?.publicKey) {
      loginWithWalletAddress(provider.publicKey.toString());
    }
  }, []);

  const saveSession = (user: UserAccount | null) => {
    setCurrentUser(user);
    if (user) {
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        const db = getStoredWalletAccounts();
        db[user.solanaWallet] = user;
        saveStoredWalletAccounts(db);
      } catch (_) {}
    } else {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch (_) {}
    }
  };

  const loginWithWalletAddress = (walletAddress: string, preferredUsername?: string): UserAccount => {
    const db = getStoredWalletAccounts();
    const existing = db[walletAddress];

    const cleanPreferred = preferredUsername
      ? preferredUsername.trim().replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
      : "";

    if (existing) {
      const updatedUser: UserAccount = {
        ...existing,
        username: cleanPreferred || existing.username,
        displayName: cleanPreferred || existing.displayName,
      };
      db[walletAddress] = updatedUser;
      saveStoredWalletAccounts(db);
      saveSession(updatedUser);
      return updatedUser;
    }

    const handle = cleanPreferred || formatShortWalletHandle(walletAddress);
    const newUser: UserAccount = {
      id: `wallet_${walletAddress}`,
      username: handle,
      email: `${walletAddress.slice(0, 8)}@solana.wallet`,
      displayName: `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}&backgroundColor=0e131d`,
      solanaWallet: walletAddress,
      balanceSol: 0.0,
      userTokens: {},
      createdAt: Date.now(),
      reputationKarma: 100,
    };

    db[walletAddress] = newUser;
    saveStoredWalletAccounts(db);
    saveSession(newUser);
    return newUser;
  };

  const connectWalletAuth = async (
    providerName: WalletProviderName = "phantom",
    preferredUsername?: string
  ): Promise<{ success: boolean; walletAddress?: string; error?: string }> => {
    setIsLoading(true);
    try {
      const win = window as any;

      if (providerName === "embedded") {
        const embeddedAddr = getOrCreateEmbeddedWalletAddress();
        loginWithWalletAddress(embeddedAddr, preferredUsername);
        return { success: true, walletAddress: embeddedAddr };
      }

      let provider: any = null;
      if (providerName === "phantom") {
        provider = win?.phantom?.solana || (win?.solana?.isPhantom ? win.solana : null);
      } else if (providerName === "solflare") {
        provider = win?.solflare || (win?.solana?.isSolflare ? win.solana : null);
      } else if (providerName === "backpack") {
        provider = win?.backpack?.solana || win?.backpack || win?.solana;
      }

      // Fallback to any injected window.solana provider if specific one wasn't found
      if (!provider && win?.solana) {
        provider = win.solana;
      }

      if (provider && typeof provider.connect === "function") {
        const resp = await provider.connect();
        const pubkeyObj = resp?.publicKey || provider.publicKey;
        if (pubkeyObj) {
          const walletAddress = pubkeyObj.toString();
          loginWithWalletAddress(walletAddress, preferredUsername);
          return { success: true, walletAddress };
        }
      }

      return {
        success: false,
        error: `No ${providerName.charAt(0).toUpperCase() + providerName.slice(1)} browser extension detected. Click "Instant Browser Wallet" below to generate an instant Solana wallet, or install Phantom/Solflare.`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Wallet connection was cancelled.",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = () => {
    const embeddedAddr = getOrCreateEmbeddedWalletAddress();
    loginWithWalletAddress(embeddedAddr);
  };

  const logout = () => {
    try {
      const win = window as any;
      const provider = win?.phantom?.solana || win?.solflare || win?.solana;
      if (provider && typeof provider.disconnect === "function") {
        provider.disconnect().catch(() => {});
      }
      supabase.auth.signOut().catch(() => {});
    } catch (_) {}
    saveSession(null);
  };

  const updateProfile = (updates: Partial<UserAccount>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    saveSession(updated);
  };

  const updateUserBalance = (deltaOrNew: number, isDelta = false) => {
    setCurrentUser((prev) => {
      if (!prev) return null;
      const newBal = isDelta ? Math.max(0, prev.balanceSol + deltaOrNew) : Math.max(0, deltaOrNew);
      const updated = { ...prev, balanceSol: newBal };
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
        const db = getStoredWalletAccounts();
        db[updated.solanaWallet] = updated;
        saveStoredWalletAccounts(db);
      } catch (_) {}
      return updated;
    });
  };

  const updateUserTokens = (mint: string, deltaTokens: number) => {
    setCurrentUser((prev) => {
      if (!prev) return null;
      const currentTokens = { ...(prev.userTokens || {}) };
      const currentAmt = currentTokens[mint] || 0;
      currentTokens[mint] = Math.max(0, currentAmt + deltaTokens);
      const updated = { ...prev, userTokens: currentTokens };
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
        const db = getStoredWalletAccounts();
        db[updated.solanaWallet] = updated;
        saveStoredWalletAccounts(db);
      } catch (_) {}
      return updated;
    });
  };

  const updateUserAssets = (params: {
    solDelta?: number;
    newSol?: number;
    tokenMint?: string;
    tokenDelta?: number;
    setExactToken?: number;
  }) => {
    setCurrentUser((prev) => {
      if (!prev) return null;
      let newBal = prev.balanceSol;
      if (params.newSol !== undefined) {
        newBal = Math.max(0, params.newSol);
      } else if (params.solDelta !== undefined) {
        newBal = Math.max(0, prev.balanceSol + params.solDelta);
      }

      const currentTokens = { ...(prev.userTokens || {}) };
      if (params.tokenMint) {
        if (params.setExactToken !== undefined) {
          currentTokens[params.tokenMint] = Math.max(0, params.setExactToken);
        } else if (params.tokenDelta !== undefined) {
          const currentAmt = currentTokens[params.tokenMint] || 0;
          currentTokens[params.tokenMint] = Math.max(0, currentAmt + params.tokenDelta);
        }
      }

      const updated = { ...prev, balanceSol: newBal, userTokens: currentTokens };
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
        const db = getStoredWalletAccounts();
        db[updated.solanaWallet] = updated;
        saveStoredWalletAccounts(db);
      } catch (_) {}
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        connectWalletAuth,
        loginWithWalletAddress,
        loginAsDemo,
        logout,
        updateProfile,
        updateUserBalance,
        updateUserTokens,
        updateUserAssets,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
