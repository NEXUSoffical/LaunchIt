import React, { createContext, useContext, useState, useEffect } from "react";
import { UserAccount } from "../types/auth";
import { supabase } from "../services/supabase";

interface AuthContextType {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  register: (data: {
    username: string;
    email: string;
    password?: string;
    displayName?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  login: (credentials: {
    usernameOrEmail: string;
    password?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (usernameOrEmail: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemo: () => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserAccount>) => void;
  updateUserBalance: (deltaOrNew: number, isDelta?: boolean) => void;
  updateUserTokens: (mint: string, deltaTokens: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCOUNTS_DB_KEY = "launchit_accounts_db";
const SESSION_KEY = "launchit_current_user";

// Helper to generate a realistic looking Solana devnet address
const generateDevnetSolanaAddress = (username: string): string => {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash << 5) - hash + username.charCodeAt(i);
    hash |= 0;
  }
  let addr = "Sol";
  for (let i = 0; i < 40; i++) {
    const idx = Math.abs((hash * (i + 13) + i * 37) % chars.length);
    addr += chars[idx];
  }
  return addr.slice(0, 44);
};

const getStoredAccounts = (): Record<string, { user: UserAccount; passwordHash?: string }> => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read accounts DB", e);
  }
  return {};
};

const saveStoredAccounts = (accounts: Record<string, { user: UserAccount; passwordHash?: string }>) => {
  try {
    localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error("Failed to save accounts DB", e);
  }
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

  const saveSession = (user: UserAccount | null) => {
    setCurrentUser(user);
    if (user) {
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        // Also update stored accounts DB
        const db = getStoredAccounts();
        if (db[user.username.toLowerCase()]) {
          db[user.username.toLowerCase()].user = user;
          saveStoredAccounts(db);
        }
      } catch (_) {}
    } else {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch (_) {}
    }
  };

  const register = async (data: {
    username: string;
    email: string;
    password?: string;
    displayName?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const cleanUsername = data.username.trim().replace(/^@/, "").toLowerCase();
      if (!cleanUsername || cleanUsername.length < 3) {
        return { success: false, error: "Username must be at least 3 characters." };
      }
      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return { success: false, error: "Username can only contain letters, numbers, and underscores." };
      }

      const cleanEmail = data.email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return { success: false, error: "Please enter a valid email address." };
      }

      const db = getStoredAccounts();
      if (db[cleanUsername]) {
        return { success: false, error: `Username @${cleanUsername} is already taken. Please choose another.` };
      }

      // Check if email already used
      const existingEmail = Object.values(db).find((a) => a.user.email.toLowerCase() === cleanEmail);
      if (existingEmail) {
        return { success: false, error: "An account with this email already exists. Please sign in." };
      }

      // Try Supabase auth in background (optional, non-blocking)
      try {
        if (data.password && data.password.length >= 6) {
          await supabase.auth.signUp({
            email: cleanEmail,
            password: data.password,
            options: {
              data: {
                username: cleanUsername,
                display_name: data.displayName || cleanUsername,
              },
            },
          });
        }
      } catch (sbErr) {
        console.warn("Supabase auth notice:", sbErr);
      }

      const newUser: UserAccount = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        username: cleanUsername,
        email: cleanEmail,
        displayName: data.displayName?.trim() || cleanUsername,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}&backgroundColor=111420`,
        solanaWallet: generateDevnetSolanaAddress(cleanUsername),
        balanceSol: 0.0,
        userTokens: {},
        createdAt: Date.now(),
        reputationKarma: 100,
      };

      db[cleanUsername] = {
        user: newUser,
        passwordHash: data.password || "default_pw",
      };
      saveStoredAccounts(db);

      saveSession(newUser);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Failed to create account." };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: {
    usernameOrEmail: string;
    password?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const query = credentials.usernameOrEmail.trim().replace(/^@/, "").toLowerCase();
      if (!query) {
        return { success: false, error: "Please enter your username or email." };
      }

      const inputPassword = credentials.password?.trim() || "";

      const db = getStoredAccounts();
      let matchKey = query;
      let match = db[query];

      if (!match) {
        // Search by email
        const foundEntry = Object.entries(db).find(([, a]) => a.user.email.toLowerCase() === query);
        if (foundEntry) {
          matchKey = foundEntry[0];
          match = foundEntry[1];
        }
      }

      // If not found locally, try checking Supabase
      if (!match) {
        try {
          const emailQuery = query.includes("@") ? query : `${query}@launchit.fun`;
          const { data: sbData, error: sbErr } = await supabase.auth.signInWithPassword({
            email: emailQuery,
            password: inputPassword,
          });
          if (!sbErr && sbData.user) {
            const restoredUser: UserAccount = {
              id: sbData.user.id,
              username: query.replace("@", ""),
              email: sbData.user.email || emailQuery,
              displayName: query,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${query}&backgroundColor=111420`,
              solanaWallet: generateDevnetSolanaAddress(query),
              balanceSol: 0.0,
              userTokens: {},
              createdAt: Date.now(),
              reputationKarma: 100,
            };
            db[query] = { user: restoredUser, passwordHash: inputPassword };
            saveStoredAccounts(db);
            saveSession(restoredUser);
            return { success: true };
          }
        } catch (_) {}

        return { success: false, error: "Account not found. Please create an official account first." };
      }

      const storedPassword = match.passwordHash?.trim() || "";
      let isPasswordValid = false;

      // Check direct equality or trimmed equality
      if (!storedPassword || storedPassword === "default_pw") {
        // Self-heal: set stored password to what user entered
        match.passwordHash = inputPassword;
        db[matchKey] = match;
        saveStoredAccounts(db);
        isPasswordValid = true;
      } else if (storedPassword === inputPassword) {
        isPasswordValid = true;
      } else {
        // Try verifying with Supabase in case password was changed on backend
        if (match.user.email && inputPassword) {
          try {
            const { data: sbData, error: sbErr } = await supabase.auth.signInWithPassword({
              email: match.user.email,
              password: inputPassword,
            });
            if (!sbErr && sbData.user) {
              match.passwordHash = inputPassword;
              db[matchKey] = match;
              saveStoredAccounts(db);
              isPasswordValid = true;
            }
          } catch (_) {}
        }
      }

      if (!isPasswordValid) {
        return {
          success: false,
          error: "Incorrect password. You can reset your password below if needed.",
        };
      }

      saveSession(match.user);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Failed to sign in." };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (
    usernameOrEmail: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const query = usernameOrEmail.trim().replace(/^@/, "").toLowerCase();
      if (!query) return { success: false, error: "Please enter your username or email." };
      const cleanPw = newPassword.trim();
      if (!cleanPw || cleanPw.length < 4) {
        return { success: false, error: "New password must be at least 4 characters." };
      }

      const db = getStoredAccounts();
      let matchKey = query;
      let match = db[query];
      if (!match) {
        const found = Object.entries(db).find(([, a]) => a.user.email.toLowerCase() === query);
        if (found) {
          matchKey = found[0];
          match = found[1];
        }
      }

      if (!match) {
        return { success: false, error: "Account not found for that username or email." };
      }

      match.passwordHash = cleanPw;
      db[matchKey] = match;
      saveStoredAccounts(db);

      // Attempt Supabase password update
      try {
        await supabase.auth.updateUser({ password: cleanPw });
      } catch (_) {}

      saveSession(match.user);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Failed to reset password." };
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = () => {
    const demoUser: UserAccount = {
      id: "usr_demo_trader",
      username: "solana_og",
      email: "og@launchit.fun",
      displayName: "Solana OG Trader",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=solana_og&backgroundColor=111420",
      solanaWallet: "Sol9GenesisVauLtX82n7k4mW1pL3qB5c0uM4qD8jE1",
      balanceSol: 25.0,
      userTokens: {
        "GenX7K9pQ5bWmR4v1k8Zs3nLe2YtF6aC0uM4qD8jE1oP": 45_000_000,
      },
      createdAt: Date.now() - 86400000 * 14,
      reputationKarma: 1450,
    };

    const db = getStoredAccounts();
    db["solana_og"] = { user: demoUser, passwordHash: "demo123" };
    saveStoredAccounts(db);

    saveSession(demoUser);
  };

  const logout = () => {
    try {
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
    if (!currentUser) return;
    const newBal = isDelta ? Math.max(0, currentUser.balanceSol + deltaOrNew) : Math.max(0, deltaOrNew);
    const updated = { ...currentUser, balanceSol: newBal };
    saveSession(updated);
  };

  const updateUserTokens = (mint: string, deltaTokens: number) => {
    if (!currentUser) return;
    const currentTokens = { ...(currentUser.userTokens || {}) };
    const currentAmt = currentTokens[mint] || 0;
    currentTokens[mint] = Math.max(0, currentAmt + deltaTokens);
    const updated = { ...currentUser, userTokens: currentTokens };
    saveSession(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        register,
        login,
        resetPassword,
        loginAsDemo,
        logout,
        updateProfile,
        updateUserBalance,
        updateUserTokens,
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
