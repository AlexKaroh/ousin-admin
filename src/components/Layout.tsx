import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import {
  DashboardIcon,
  LogoutIcon,
  OrdersIcon,
  ReviewsIcon,
  SettingsIcon,
  UsersIcon,
} from "./Icons";

function MenuIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export default function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const initial = (admin?.display_name || admin?.username || "A")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const sectionTitle = (() => {
    if (location.pathname.startsWith("/orders")) return "Заказы";
    if (location.pathname.startsWith("/users")) return "Пользователи";
    if (location.pathname.startsWith("/reviews")) return "Отзывы";
    if (location.pathname.startsWith("/settings/calculator")) return "Комиссия калькулятора";
    return "Дашборд";
  })();

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <button
          type="button"
          className="admin-burger"
          aria-label="Открыть меню"
          onClick={() => setDrawerOpen(true)}
        >
          <MenuIcon />
        </button>
        <div className="admin-topbar-brand">
          <div className="admin-brand-mark">O</div>
          <div>
            <div className="admin-brand-sub">Ousin</div>
            <div className="admin-brand-name">{sectionTitle}</div>
          </div>
        </div>
        {admin && (
          <div className="admin-topbar-avatar" title={admin.username}>
            {initial}
          </div>
        )}
      </header>

      {drawerOpen && (
        <div
          className="admin-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${drawerOpen ? "is-open" : ""}`}>
        <div className="admin-brand">
          <div className="admin-brand-mark">O</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="admin-brand-sub">Ousin</div>
            <div className="admin-brand-name">Admin Console</div>
          </div>
          <button
            type="button"
            className="admin-drawer-close"
            aria-label="Закрыть меню"
            onClick={() => setDrawerOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="admin-nav">
          <NavLink to="/" end className="admin-nav-link">
            <DashboardIcon className="admin-nav-icon" />
            <span>Дашборд</span>
          </NavLink>
          <NavLink to="/orders" className="admin-nav-link">
            <OrdersIcon className="admin-nav-icon" />
            <span>Заказы</span>
          </NavLink>
          <NavLink to="/users" className="admin-nav-link">
            <UsersIcon className="admin-nav-icon" />
            <span>Пользователи</span>
          </NavLink>
          <NavLink to="/reviews" className="admin-nav-link">
            <ReviewsIcon className="admin-nav-icon" />
            <span>Отзывы</span>
          </NavLink>
          <NavLink to="/settings/calculator" className="admin-nav-link">
            <SettingsIcon className="admin-nav-icon" />
            <span>Комиссия ¥</span>
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          {admin && (
            <div className="admin-user">
              <div className="admin-user-avatar">{initial}</div>
              <div style={{ minWidth: 0 }}>
                <div className="admin-user-name">
                  {admin.display_name || admin.username}
                </div>
                <div className="admin-user-role">{admin.role}</div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="app-btn app-btn-soft"
            style={{ justifyContent: "flex-start" }}
          >
            <LogoutIcon size={16} />
            Выйти
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
