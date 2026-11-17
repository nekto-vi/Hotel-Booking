"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiPost, apiGet, TOKEN_STORAGE_KEY } from "@/lib/api";

export type UserRole = "CLIENT" | "ADMIN";

export interface AuthUser {
  sub: number;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface SavedAccount {
  token: string;
  user: AuthUser;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  firstName: string;
  lastName: string;
  phone: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  accounts: SavedAccount[];
  isAdmin: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  switchAccount: (account: SavedAccount) => Promise<void>;
  removeAccount: (token: string) => void;
  clearAccounts: () => void;
  refreshUser: () => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const ACCOUNTS_STORAGE_KEY = "hotel-booking-accounts";

function readAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (account): account is SavedAccount =>
        typeof account === "object" &&
        account !== null &&
        "token" in account &&
        typeof account.token === "string" &&
        "user" in account &&
        typeof account.user === "object" &&
        account.user !== null &&
        "sub" in account.user &&
        typeof account.user.sub === "number" &&
        "email" in account.user &&
        typeof account.user.email === "string" &&
        "role" in account.user &&
        (account.user.role === "CLIENT" || account.user.role === "ADMIN") &&
        "firstName" in account.user &&
        typeof account.user.firstName === "string" &&
        "lastName" in account.user &&
        typeof account.user.lastName === "string" &&
        "phone" in account.user &&
        typeof account.user.phone === "string",
    );
  } catch {
    return [];
  }
}

function storeAccount(token: string, user: AuthUser) {
  const accounts = readAccounts().filter(
    (account) => account.user.sub !== user.sub,
  );
  const nextAccounts = [{ token, user }, ...accounts];
  window.localStorage.setItem(
    ACCOUNTS_STORAGE_KEY,
    JSON.stringify(nextAccounts),
  );
  return nextAccounts;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(TOKEN_STORAGE_KEY),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<SavedAccount[]>(() =>
    readAccounts(),
  );

  const persistAccount = useCallback(
    (accountToken: string, profile: AuthUser) => {
      setAccounts(storeAccount(accountToken, profile));
    },
    [],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await apiGet<AuthUser>("/auth/profile");
    setUser(profile);
    const activeToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (activeToken) persistAccount(activeToken, profile);
    return profile;
  }, [persistAccount]);

  useEffect(() => {
    let isMounted = true;
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) {
      Promise.resolve().then(() => {
        if (isMounted) setIsLoading(false);
      });
      return () => {
        isMounted = false;
      };
    }

    apiGet<AuthUser>("/auth/profile")
      .then((profile) => {
        if (isMounted) {
          setUser(profile);
          persistAccount(storedToken, profile);
        }
      })
      .catch(() => {
        if (isMounted) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [persistAccount]);

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await apiPost<{ access_token: string }>(
        "/auth/login",
        input,
        { authenticated: false },
      );
      window.localStorage.setItem(TOKEN_STORAGE_KEY, result.access_token);
      setToken(result.access_token);

      try {
        await refreshUser();
      } catch (error) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        throw error;
      }
    },
    [refreshUser],
  );

  const removeAccount = useCallback((accountToken: string) => {
    const nextAccounts = readAccounts().filter(
      (account) => account.token !== accountToken,
    );
    window.localStorage.setItem(
      ACCOUNTS_STORAGE_KEY,
      JSON.stringify(nextAccounts),
    );
    setAccounts(nextAccounts);
    if (window.localStorage.getItem(TOKEN_STORAGE_KEY) === accountToken) {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      setUser(null);
    }
  }, []);

  const switchAccount = useCallback(
    async (account: SavedAccount) => {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, account.token);
      setToken(account.token);
      setUser(account.user);
      try {
        await refreshUser();
      } catch (error) {
        removeAccount(account.token);
        throw error;
      }
    },
    [refreshUser, removeAccount],
  );

  const clearAccounts = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
    setAccounts([]);
    setToken(null);
    setUser(null);
  }, []);

  const register = useCallback(
    async (input: RegisterInput) => {
      await apiPost<AuthUser>("/auth/register", input, {
        authenticated: false,
      });
      await login({ email: input.email, password: input.password });
    },
    [login],
  );

  const value = useMemo(
    () => ({
      user,
      token,
      accounts,
      isAdmin: user?.role === "ADMIN",
      isLoading,
      login,
      register,
      logout,
      switchAccount,
      removeAccount,
      clearAccounts,
      refreshUser,
    }),
    [
      user,
      token,
      accounts,
      isLoading,
      login,
      register,
      logout,
      switchAccount,
      removeAccount,
      clearAccounts,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
