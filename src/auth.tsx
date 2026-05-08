import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { apiFetch, getToken, setToken } from "./api";

export type AdminProfile = {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

type LoginResponse = {
  token: string;
  admin: AdminProfile;
};

type AuthContextValue = {
  admin: AdminProfile | null;
  loading: boolean;
  error: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(getToken()));
  const [error, setError] = useState<string>("");

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const profile = await apiFetch<AdminProfile>("/admin/auth/me");
      setAdmin(profile);
      setError("");
    } catch (err) {
      setAdmin(null);
      setToken(null);
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<LoginResponse>("/admin/auth/login", {
        method: "POST",
        body: { username, password },
        auth: false,
      });
      setToken(data.token);
      setAdmin(data.admin);
    } catch (err) {
      setAdmin(null);
      setToken(null);
      if (err instanceof Error) setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
    setError("");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ admin, loading, error, login, logout, refresh }),
    [admin, loading, error, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
