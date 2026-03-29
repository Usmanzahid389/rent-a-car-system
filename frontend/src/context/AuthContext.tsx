import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Admin } from "../api";

type AuthContextValue = {
  admin: Admin | null;
  token: string | null;
  setSession: (token: string, admin: Admin) => void;
  logout: () => void;
  ready: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const a = localStorage.getItem("admin");
    if (t && a) {
      try {
        setToken(t);
        setAdmin(JSON.parse(a) as Admin);
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("admin");
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const onLogout = () => {
      setToken(null);
      setAdmin(null);
    };
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  const setSession = useCallback((newToken: string, newAdmin: Admin) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("admin", JSON.stringify(newAdmin));
    setToken(newToken);
    setAdmin(newAdmin);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    setToken(null);
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({ admin, token, setSession, logout, ready }),
    [admin, token, setSession, logout, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
