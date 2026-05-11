import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import {
  LinkIcon,
  OrdersIcon,
  PencilIcon,
  SearchIcon,
  TrashIcon,
} from "../components/Icons";

type AdminOrderUser = {
  id: string;
  username: string | null;
  first_name: string;
  last_name: string | null;
  telegram_id: string;
  photo_url: string | null;
};

type AdminOrder = {
  id: string;
  user_id: string;
  user: AdminOrderUser | null;
  order_photo: string;
  order_url: string;
  delivery_type: string;
  model: string;
  size: number | null;
  price: number;
  comment: string | null;
  order_date: string;
  order_status: string;
  is_paid: boolean;
  review: {
    id: string;
    rating: number;
    text: string;
    created_at: string;
  } | null;
};

type ListResponse = {
  total: number;
  take: number;
  skip: number;
  items: AdminOrder[];
};

const STATUSES = [
  "Заявка",
  "В обработке",
  "Оплачен",
  "В пути",
  "Получен",
  "Завершен",
  "Отменен",
];

function statusClass(status: string) {
  const s = status.trim().toLowerCase();
  if (s === "заявка") return "badge status-zayavka";
  if (["получен", "завершен", "завершён", "выдан"].includes(s))
    return "badge status-done";
  if (["отменен", "отменён"].includes(s)) return "badge status-canceled";
  return "badge status-other";
}

function statusTone(status: string): "blue" | "emerald" | "rose" | "amber" {
  const s = status.trim().toLowerCase();
  if (s === "заявка") return "blue";
  if (["получен", "завершен", "завершён", "выдан"].includes(s)) return "emerald";
  if (["отменен", "отменён"].includes(s)) return "rose";
  return "amber";
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function userDisplay(user: AdminOrderUser | null) {
  if (!user) return "—";
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return user.username ? `@${user.username}` : fullName || user.telegram_id;
}

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);

  const [editing, setEditing] = useState<AdminOrder | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<ListResponse>("/admin/orders", {
        query: {
          search: search || undefined,
          status: statusFilter || undefined,
          take: PAGE_SIZE,
          skip: page * PAGE_SIZE,
        },
      });
      setData(res);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  async function handleQuickStatus(order: AdminOrder, nextStatus: string) {
    setSavingId(order.id);
    try {
      await apiFetch(`/admin/orders/${order.id}`, {
        method: "PATCH",
        body: { order_status: nextStatus },
      });
      await load();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleTogglePaid(order: AdminOrder) {
    setSavingId(order.id);
    try {
      await apiFetch(`/admin/orders/${order.id}`, {
        method: "PATCH",
        body: { is_paid: !order.is_paid },
      });
      await load();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(order: AdminOrder) {
    if (!window.confirm(`Удалить заказ "${order.model}"?`)) return;
    setDeletingId(order.id);
    try {
      await apiFetch(`/admin/orders/${order.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Заказы"
        subtitle="Все заявки и заказы пользователей. Меняйте статусы, флаг оплаты, размер и комментарий."
      />

      <form className="toolbar" onSubmit={applySearch}>
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 360 }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Поиск по товару, ссылке, имени, username…"
            className="app-input"
            style={{ paddingLeft: 38 }}
          />
          <span
            style={{
              position: "absolute",
              left: 14,
              top: 13,
              color: "#94a3b8",
              pointerEvents: "none",
            }}
          >
            <SearchIcon size={16} />
          </span>
        </div>
        <select
          className="app-input"
          style={{ width: 200 }}
          value={statusFilter}
          onChange={(e) => {
            setPage(0);
            setStatusFilter(e.target.value);
          }}
        >
          <option value="">Все статусы</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="app-btn app-btn-primary">
          Применить
        </button>
        <button
          type="button"
          className="app-btn app-btn-ghost"
          onClick={() => {
            setSearch("");
            setSearchInput("");
            setStatusFilter("");
            setPage(0);
          }}
        >
          Сбросить
        </button>
      </form>

      {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="table-wrap orders-table-wrap">
        <div className="orders-mobile">
          {loading && (
            <div className="empty-state app-card card-padded">
              Загружаем заказы…
            </div>
          )}
          {!loading && data && data.items.length === 0 && (
            <div className="empty-state app-card card-padded">
              Заказы не найдены
            </div>
          )}
          {!loading &&
            data?.items.map((order) => (
              <OrderMobileCard
                key={order.id}
                order={order}
                saving={savingId === order.id}
                deleting={deletingId === order.id}
                onStatusChange={(s) => handleQuickStatus(order, s)}
                onEdit={() => setEditing(order)}
                onDelete={() => handleDelete(order)}
              />
            ))}
        </div>
        <div className="table-scroll">
          <table className="app-table">
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Товар</th>
                <th>Пользователь</th>
                <th>Цена</th>
                <th>Размер</th>
                <th>Статус</th>
                <th>Оплачено</th>
                <th>Дата</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="empty-state">
                    Загружаем заказы…
                  </td>
                </tr>
              )}
              {!loading && data && data.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-state">
                    Заказы не найдены
                  </td>
                </tr>
              )}
              {!loading &&
                data?.items.map((order) => (
                  <tr key={order.id}>
                    <td data-label="Товар" data-mobile="full">
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontWeight: 700 }}>{order.model || "—"}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {order.delivery_type}
                        </div>
                        {order.order_url && (
                          <a
                            href={order.order_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              color: "#2563eb",
                              fontSize: 12,
                            }}
                          >
                            <LinkIcon />
                            <span className="truncate">{order.order_url}</span>
                          </a>
                        )}
                      </div>
                    </td>
                    <td data-label="Клиент">
                      <div style={{ fontWeight: 600 }}>{userDisplay(order.user)}</div>
                      {order.user && (
                        <div className="muted font-mono" style={{ fontSize: 11 }}>
                          tg: {order.user.telegram_id}
                        </div>
                      )}
                    </td>
                    <td data-label="Цена">{order.price.toLocaleString("ru-RU")} ¥</td>
                    <td data-label="Размер">{order.size ?? "—"}</td>
                    <td data-label="Статус">
                      <select
                        className="app-input"
                        style={{ height: 36, fontSize: 13, paddingLeft: 10, paddingRight: 30 }}
                        value={order.order_status}
                        disabled={savingId === order.id}
                        onChange={(e) => handleQuickStatus(order, e.target.value)}
                      >
                        {!STATUSES.includes(order.order_status) && (
                          <option value={order.order_status}>{order.order_status}</option>
                        )}
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <div style={{ marginTop: 4 }}>
                        <span className={statusClass(order.order_status)}>
                          {order.order_status}
                        </span>
                      </div>
                    </td>
                    <td data-label="Оплата">
                      <button
                        type="button"
                        className={
                          order.is_paid
                            ? "badge flag-paid"
                            : "badge status-other"
                        }
                        onClick={() => handleTogglePaid(order)}
                        disabled={savingId === order.id}
                        title="Переключить флаг оплаты"
                      >
                        {order.is_paid ? "Оплачен" : "Не оплачен"}
                      </button>
                    </td>
                    <td data-label="Дата" className="muted" style={{ fontSize: 12 }}>
                      {formatDate(order.order_date)}
                    </td>
                    <td data-label="Действия">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn primary"
                          onClick={() => setEditing(order)}
                          title="Редактировать"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => handleDelete(order)}
                          disabled={deletingId === order.id}
                          title="Удалить"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <div>
            {data
              ? `Показано ${data.items.length} из ${data.total}`
              : "—"}
          </div>
          <div className="page-controls">
            <button
              type="button"
              className="app-btn app-btn-soft"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← Назад
            </button>
            <button
              type="button"
              className="app-btn app-btn-soft"
              disabled={!data || page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Вперёд →
            </button>
          </div>
        </div>
      </div>

      <EditOrderModal
        order={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await load();
        }}
      />
    </div>
  );
}

function OrderMobileCard({
  order,
  saving,
  deleting,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  order: AdminOrder;
  saving: boolean;
  deleting: boolean;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tone = statusTone(order.order_status);
  const shortId = order.id ? `#${order.id.slice(0, 8)}` : "";
  const userName = order.user
    ? order.user.username
      ? `@${order.user.username}`
      : [order.user.first_name, order.user.last_name].filter(Boolean).join(" ") ||
        order.user.telegram_id
    : null;
  const userInitial = (
    order.user?.first_name ||
    order.user?.username ||
    "?"
  )
    .trim()
    .slice(0, 1)
    .toUpperCase();

  return (
    <div className={`order-card tone-${tone}`}>
      <div className="order-card-row">
        <div className="order-card-mark">
          <OrdersIcon size={20} />
        </div>
        <div className="order-card-head">
          <div className="order-card-title">{order.model || "Заказ"}</div>
          <div className="order-card-sub">
            <span className="dot" />
            {order.delivery_type || "Доставка"}
          </div>
        </div>
        <div className="order-card-aside">
          <div className="row-actions">
            <button
              type="button"
              className="icon-btn primary"
              onClick={onEdit}
              aria-label="Редактировать"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              className="icon-btn danger"
              onClick={onDelete}
              disabled={deleting}
              aria-label="Удалить"
            >
              {deleting ? <span className="spinner" /> : <TrashIcon />}
            </button>

            <div className="order-price-pill">
            {order.price.toLocaleString("ru-RU")} ¥
          </div>
          </div>
        </div>
      </div>

      <div className="order-card-info-grid">
        <div className="order-info-tile order-card-status">
          <span className="order-info-label">Статус</span>
          <select
            className="app-input"
            value={order.order_status}
            disabled={saving}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            {!STATUSES.includes(order.order_status) && (
              <option value={order.order_status}>{order.order_status}</option>
            )}
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="order-info-tile order-info-size">
          <span className="order-info-label">
            Размер
          </span>
          <span className="order-info-value">{order.size ?? "—"}</span>
        </div>
      </div>

      {order.user && (
        <div className="order-card-user">
          <div className="order-card-user-avatar">
            {order.user.photo_url ? (
              <img src={order.user.photo_url} alt="" />
            ) : (
              userInitial
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="order-card-user-name">{userName}</div>
            <div className="order-card-user-tg font-mono">
              tg: {order.user.telegram_id}
            </div>
          </div>
        </div>
      )}

      {order.order_url && (
        <a
          className="order-card-link"
          href={order.order_url}
          target="_blank"
          rel="noreferrer"
        >
          <LinkIcon />
          <span>Открыть товар</span>
        </a>
      )}

      {order.comment && (
        <div className="order-card-comment">
          <span className="order-card-comment-label">Комментарий</span>
          {order.comment}
        </div>
      )}

      <div className="order-card-foot">
        <span>{formatDate(order.order_date)}</span>
        {shortId && <span className="order-card-id">{shortId}</span>}
      </div>
    </div>
  );
}

function EditOrderModal({
  order,
  onClose,
  onSaved,
}: {
  order: AdminOrder | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [model, setModel] = useState("");
  const [orderUrl, setOrderUrl] = useState("");
  const [deliveryType, setDeliveryType] = useState("");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState("");
  const [status, setStatus] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!order) return;
    setModel(order.model || "");
    setOrderUrl(order.order_url || "");
    setDeliveryType(order.delivery_type || "");
    setPrice(String(order.price ?? ""));
    setSize(order.size == null ? "" : String(order.size));
    setStatus(order.order_status || "");
    setIsPaid(Boolean(order.is_paid));
    setComment(order.comment || "");
    setError("");
  }, [order]);

  if (!order) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        model: model.trim(),
        order_url: orderUrl.trim(),
        delivery_type: deliveryType.trim(),
        order_status: status.trim(),
        is_paid: isPaid,
        comment,
      };
      const priceNum = Number(price);
      if (Number.isFinite(priceNum)) body.price = priceNum;
      body.size = size.trim() === "" ? null : size.trim();

      await apiFetch(`/admin/orders/${order.id}`, {
        method: "PATCH",
        body,
      });
      onSaved();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(order)}
      title="Редактирование заказа"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="app-btn app-btn-ghost">
            Отмена
          </button>
          <button
            type="submit"
            form="edit-order-form"
            className="app-btn app-btn-primary"
            disabled={saving}
          >
            {saving ? <span className="spinner" /> : null}
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
        </>
      }
    >
      <form
        id="edit-order-form"
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div className="field">
          <label className="field-label">Название товара</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="app-input"
            maxLength={200}
          />
        </div>
        <div className="field">
          <label className="field-label">Ссылка на товар</label>
          <input
            value={orderUrl}
            onChange={(e) => setOrderUrl(e.target.value)}
            className="app-input"
            maxLength={500}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">Цена (¥)</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="app-input"
              inputMode="decimal"
            />
          </div>
          <div className="field">
            <label className="field-label">Размер</label>
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="app-input"
              inputMode="numeric"
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">Тип доставки</label>
            <input
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value)}
              className="app-input"
            />
          </div>
          <div className="field">
            <label className="field-label">Статус</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="app-input"
            >
              {!STATUSES.includes(status) && status && (
                <option value={status}>{status}</option>
              )}
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            border: "1px solid rgba(15,23,42,0.12)",
            borderRadius: 14,
            background: "rgba(248,250,255,0.85)",
          }}
        >
          <input
            type="checkbox"
            checked={isPaid}
            onChange={(e) => setIsPaid(e.target.checked)}
          />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Заказ оплачен</span>
        </label>
        <div className="field">
          <label className="field-label">Комментарий</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="app-input"
            style={{ minHeight: 100 }}
          />
        </div>
        {error && <div className="error-banner">{error}</div>}
      </form>
    </Modal>
  );
}
