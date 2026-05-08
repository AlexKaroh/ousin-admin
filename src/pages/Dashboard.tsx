import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import PageHeader from "../components/PageHeader";

type Stats = {
  users: number;
  orders: number;
  reviews: number;
  orders_paid: number;
  orders_pending: number;
  revenue_cny: number;
};

const initial: Stats = {
  users: 0,
  orders: 0,
  reviews: 0,
  orders_paid: 0,
  orders_pending: 0,
  revenue_cny: 0,
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiFetch<Stats>("/admin/stats");
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled && err instanceof Error) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Дашборд"
        subtitle="Краткая сводка по витрине, заказам и пользователям."
      />

      {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="stat-grid">
        <div className="app-card stat-card">
          <span className="stat-label">Пользователи</span>
          <span className="stat-value">{loading ? "…" : stats.users}</span>
          <span className="stat-foot">Всего зарегистрировано</span>
        </div>
        <div className="app-card stat-card accent-cyan">
          <span className="stat-label">Заказы</span>
          <span className="stat-value">{loading ? "…" : stats.orders}</span>
          <span className="stat-foot">Всего в системе</span>
        </div>
        <div className="app-card stat-card accent-amber">
          <span className="stat-label">В работе</span>
          <span className="stat-value">{loading ? "…" : stats.orders_pending}</span>
          <span className="stat-foot">Со статусом «Заявка»</span>
        </div>
        <div className="app-card stat-card accent-emerald">
          <span className="stat-label">Оплачено</span>
          <span className="stat-value">{loading ? "…" : stats.orders_paid}</span>
          <span className="stat-foot">Заказов is_paid = true</span>
        </div>
        <div className="app-card stat-card accent-violet">
          <span className="stat-label">Отзывы</span>
          <span className="stat-value">{loading ? "…" : stats.reviews}</span>
          <span className="stat-foot">Опубликовано клиентами</span>
        </div>
        <div className="app-card stat-card">
          <span className="stat-label">Выручка (¥)</span>
          <span className="stat-value">
            {loading ? "…" : stats.revenue_cny.toLocaleString("ru-RU")}
          </span>
          <span className="stat-foot">Сумма по оплаченным заказам</span>
        </div>
      </div>

      <div className="dashboard-callout">
        <div className="dashboard-callout-mark">O</div>
        <div className="dashboard-callout-body">
          <div className="dashboard-callout-title">Быстрые действия</div>
          <div className="dashboard-callout-text">
            Перейдите в раздел <b>Заказы</b>, чтобы менять статус и оплату.
            Раздел <b>Пользователи</b> нужен для ручной корректировки
            профилей, а в <b>Отзывы</b> можно быстро модерировать фидбек.
          </div>
        </div>
      </div>
    </div>
  );
}
