import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { admin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="login-shell">
        <div className="login-card" style={{ alignItems: "center" }}>
          <div className="spinner" style={{ color: "#2563eb" }} />
          <div className="muted">Проверка сессии…</div>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
