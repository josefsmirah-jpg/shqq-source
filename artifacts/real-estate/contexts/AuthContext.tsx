import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useState, useEffect } from "react";

function genUUID(): string {
  try { return crypto.randomUUID(); } catch {}
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

async function getOrCreateVisitorId(): Promise<string> {
  const key = "visitor_device_id";
  const existing = await AsyncStorage.getItem(key);
  if (existing) return existing;
  const id = genUUID();
  await AsyncStorage.setItem(key, id);
  return id;
}

async function buildGuestUser(): Promise<AuthUser> {
  const vid = await getOrCreateVisitorId();
  return { role: "visitor", name: "ضيف", phone: "", visitorId: vid };
}

export type UserRole = "visitor" | "company" | "employee" | "admin" | null;

export interface AuthUser {
  role: UserRole;
  name: string;
  phone?: string;
  id?: number;
  username?: string;
  visitorId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isGuest: boolean;
  login: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isGuest: true,
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("auth_user")
      .then(async (raw) => {
        if (!raw) {
          const guest = await buildGuestUser();
          await AsyncStorage.setItem("auth_user", JSON.stringify(guest));
          setUser(guest);
          return;
        }
        const parsed: AuthUser = JSON.parse(raw);
        if ((parsed.role === "visitor" || parsed.role === "company") && !parsed.visitorId) {
          const vid = await getOrCreateVisitorId();
          const updated = { ...parsed, visitorId: vid };
          await AsyncStorage.setItem("auth_user", JSON.stringify(updated));
          setUser(updated);
        } else {
          setUser(parsed);
        }
      })
      .catch(async () => {
        const guest = await buildGuestUser();
        setUser(guest);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (u: AuthUser) => {
    setUser(u);
    await AsyncStorage.setItem("auth_user", JSON.stringify(u));
  };

  const logout = async () => {
    const guest = await buildGuestUser();
    setUser(guest);
    await AsyncStorage.setItem("auth_user", JSON.stringify(guest));
  };

  const updateUser = async (updates: Partial<AuthUser>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    await AsyncStorage.setItem("auth_user", JSON.stringify(updated));
  };

  const isGuest = !user?.phone || user.phone === "";

  return (
    <AuthContext.Provider value={{ user, isLoading, isGuest, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
