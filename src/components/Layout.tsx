import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import {
  DashboardIcon,
  LogoutIcon,
  OrdersIcon,
  ReviewsIcon,
  UsersIcon,
} from "./Icons";

export default function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const initial = (admin?.display_name || admin?.username || "A")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">O</div>
          <div>
            <div className="admin-brand-sub">Ousin</div>
            <div className="admin-brand-name">Admin Console</div>
          </div>
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
