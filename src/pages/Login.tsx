import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

type LocationState = { from?: { pathname: string } } | null;

export default function Login() {
  const { admin, login, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (admin) {
    const state = (location.state as LocationState) || null;
    const target = state?.from?.pathname || "/";
    return <Navigate to={target} replace />;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
      const state = (location.state as LocationState) || null;
      const target = state?.from?.pathname || "/";
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Не удалось войти");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card login-card-pro" onSubmit={handleSubmit}>
        <div className="login-mark">O</div>
        <div>
          <div className="admin-brand-sub">Ousin Admin</div>
          <h1 className="login-title">Вход в админ-панель</h1>
          <div className="login-subtitle">
            Введите логин и пароль администратора, чтобы продолжить.
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="login-username">
            Логин
          </label>
          <input
            id="login-username"
            className="app-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="login-password">
            Пароль
          </label>
          <input
            id="login-password"
            type="password"
            className="app-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <div className="error-banner">{error}</div>}

        <button
          type="submit"
          className="app-btn app-btn-primary"
          disabled={submitting || loading}
          style={{ width: "100%" }}
        >
          {submitting ? <span className="spinner" /> : null}
          {submitting ? "Входим…" : "Войти"}
        </button>

        <div className="muted" style={{ fontSize: 12, textAlign: "center" }}>
          Сессия хранится локально в браузере и истекает по сроку токена.
        </div>

        <div className="login-tips">
          <span className="login-tip">JWT авторизация</span>
          <span className="login-tip">Изолированная админ-зона</span>
          <span className="login-tip">Управление заказами в 1 клик</span>
        </div>
      </form>
    </div>
  );
}
