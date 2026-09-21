"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { UserRole } from "./roles";

export type AuthUser = {
  accountId: string;
  persNo: string | null;
  displayName: string;
  loginEmail: string;
  role: UserRole;
  roles: UserRole[];
  mustChangePassword: boolean;
};

async function fetchSession(): Promise<AuthUser | null> {
  try {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    return response.ok ? ((await response.json()) as AuthUser) : null;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  role: UserRole | null;
  user: AuthUser | null;
  isLoading: boolean;
  refreshSession: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshSession(): Promise<AuthUser | null> {
    const nextUser = await fetchSession();
    setUser(nextUser);
    setIsLoading(false);
    return nextUser;
  }

  useEffect(() => {
    let isActive = true;

    void fetchSession().then((nextUser) => {
      if (!isActive) return;
      setUser(nextUser);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ role: user?.role ?? null, user, isLoading, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}