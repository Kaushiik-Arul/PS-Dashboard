"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { UserRole } from "./roles";

interface AuthContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const initialRole: UserRole = "hrbp";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(initialRole);

  return (
    <AuthContext.Provider value={{ role, setRole }}>
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