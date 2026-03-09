import React, { createContext, useContext, useState, useEffect } from "react";
import { UserDTO, AccountType } from "@shared/api";
import { toast } from "sonner";

interface AuthContextType {
  user: UserDTO | null;
  isLoading: boolean;
  login: (phone: string, type: AccountType, pin?: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(() => {
    const saved = localStorage.getItem("takymed_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = async (phone: string, type: AccountType, pin?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, type, pin }),
      });

      if (!response.ok) {
        throw new Error("Authentication failed");
      }

      const userData: UserDTO = await response.json();
      setUser(userData);
      localStorage.setItem("takymed_user", JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Erreur d'authentification");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("takymed_user");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
