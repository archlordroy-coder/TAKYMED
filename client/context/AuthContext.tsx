import React, { createContext, useContext, useState, useEffect } from "react";
import { UserDTO, AccountType } from "@shared/api";
import { toast } from "sonner";

interface AuthContextType {
  user: UserDTO | null;
  isLoading: boolean;
  login: (phone: string, type?: AccountType, pin?: string) => Promise<boolean>;
  register: (phone: string, pin: string, type: AccountType) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedUser: Partial<UserDTO>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(() => {
    const saved = localStorage.getItem("takymed_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = async (
    phone: string,
    type?: AccountType,
    pin?: string,
  ): Promise<boolean> => {
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
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Authentication failed");
      }

      const userData: UserDTO = await response.json();
      setUser(userData);
      localStorage.setItem("takymed_user", JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erreur d'authentification",
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    phone: string,
    pin: string,
    type: AccountType,
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, pin, type }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Register failed");
      }

      return true;
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Erreur d'inscription",
      );
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("takymed_user");
  };

  const updateUser = (updatedUser: Partial<UserDTO>) => {
    if (user) {
      const newUser = { ...user, ...updatedUser };
      setUser(newUser);
      localStorage.setItem("takymed_user", JSON.stringify(newUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
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
