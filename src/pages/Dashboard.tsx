import { type ReactNode } from "react";
import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import PageHeader from "../components/PageHeader";
import { CheckIcon, OrdersIcon, ReviewsIcon, UsersIcon } from "../components/Icons";

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

function KpiBlob({ children, tone }: { children: ReactNode; tone: string }) {
  return <div className={`dashboard-kpi-blob dashboard-kpi-blob--${tone}`}>{children}</div>;
}

function IconPending({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 6v6l4 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

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

      <section className="dashboard-kpi" aria-label="Ключевые показатели">
        <article className="dashboard-kpi-tile app-card dashboard-kpi-tile--revenue">
          <KpiBlob tone="gold">
            <span className="dashboard-kpi-currency-glyph" aria-hidden>
              ¥
            </span>
          </KpiBlob>
          <span className="dashboard-kpi-eyebrow">Выручка</span>
          <div className="dashboard-kpi-metric-row">
            <span className="dashboard-kpi-metric">
              {loading ? "…" : stats.revenue_cny.toLocaleString("ru-RU")}
            </span>
            <span className="dashboard-kpi-unit">¥</span>
          </div>
          <span className="dashboard-kpi-note">Сумма по оплаченным заказам</span>
        </article>

        <article className="dashboard-kpi-tile app-card dashboard-kpi-tile--users">
          <KpiBlob tone="sky">
            <UsersIcon size={18} />
          </KpiBlob>
          <span className="dashboard-kpi-eyebrow">Пользователи</span>
          <span className="dashboard-kpi-metric">{loading ? "…" : stats.users}</span>
          <span className="dashboard-kpi-note">Всего зарегистрировано</span>
        </article>

        <article className="dashboard-kpi-tile app-card dashboard-kpi-tile--orders">
          <KpiBlob tone="cyan">
            <OrdersIcon size={18} />
          </KpiBlob>
          <span className="dashboard-kpi-eyebrow">Заказы</span>
          <span className="dashboard-kpi-metric">{loading ? "…" : stats.orders}</span>
          <span className="dashboard-kpi-note">Всего в системе</span>
        </article>

        <article className="dashboard-kpi-tile app-card dashboard-kpi-tile--work">
          <KpiBlob tone="amber">
            <IconPending size={18} />
          </KpiBlob>
          <span className="dashboard-kpi-eyebrow">В работе</span>
          <span className="dashboard-kpi-metric">{loading ? "…" : stats.orders_pending}</span>
          <span className="dashboard-kpi-note">Со статусом «Заявка»</span>
        </article>

        <article className="dashboard-kpi-tile app-card dashboard-kpi-tile--paid">
          <KpiBlob tone="emerald">
            <CheckIcon size={18} />
          </KpiBlob>
          <span className="dashboard-kpi-eyebrow">Оплачено</span>
          <span className="dashboard-kpi-metric">{loading ? "…" : stats.orders_paid}</span>
          <span className="dashboard-kpi-note">Заказы с is_paid = true</span>
        </article>

        <article className="dashboard-kpi-tile app-card dashboard-kpi-tile--reviews">
          <KpiBlob tone="violet">
            <ReviewsIcon size={18} />
          </KpiBlob>
          <span className="dashboard-kpi-eyebrow">Отзывы</span>
          <span className="dashboard-kpi-metric">{loading ? "…" : stats.reviews}</span>
          <span className="dashboard-kpi-note">Опубликовано клиентами</span>
        </article>
      </section>

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
