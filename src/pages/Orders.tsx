import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import {
  LinkIcon,
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
  request_status: string;
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

type ProductImageResponse = {
  imageUrl: string;
  source?: string;
  title?: string;
};

const REQUEST_STATUSES = ["Новые", "Исполнена", "Отклонена"] as const;
const ORDER_STATUSES = [
  "В обработке",
  "В пути по Китаю",
  "Готов к выдаче",
  "Выдан",
] as const;

function statusTone(status: string): "blue" | "emerald" | "rose" | "amber" {
  const s = status.trim().toLowerCase();
  if (s === "новые") return "blue";
  if (s === "исполнена") return "emerald";
  if (s === "отклонена") return "rose";
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

function hasProductImage(orderPhoto: string | null | undefined) {
  const value = String(orderPhoto || "").trim();
  return Boolean(value) && !value.includes("order-no-product-photo");
}

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
  const [imageGeneratingId, setImageGeneratingId] = useState<string | null>(null);
  const [expandedMobileOrderId, setExpandedMobileOrderId] = useState<string | null>(null);

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

  async function handleQuickStatus(
    order: AdminOrder,
    nextRequestStatus: string,
    nextOrderStatus: string,
  ) {
    setSavingId(order.id);
    try {
      await apiFetch(`/admin/orders/${order.id}`, {
        method: "PATCH",
        body: { request_status: nextRequestStatus, order_status: nextOrderStatus },
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

  async function handleGenerateImage(order: AdminOrder) {
    if (!order.order_url) {
      setError("У заявки нет ссылки на товар");
      return;
    }
    setImageGeneratingId(order.id);
    setError("");
    try {
      const payload = await apiFetch<ProductImageResponse>("/api/find-product-image", {
        method: "POST",
        body: {
          url: order.order_url,
          model: order.model,
        },
      });
      if (!payload.imageUrl) {
        throw new Error("Не удалось найти изображение товара");
      }

      await apiFetch(`/admin/orders/${order.id}`, {
        method: "PATCH",
        body: { order_photo: payload.imageUrl },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сгенерировать изображение");
    } finally {
      setImageGeneratingId(null);
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
        subtitle="Управляйте общим статусом заявки и внутренним статусом заказа."
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
        <div style={{ display: "inline-flex", gap: 6 }}>
          <button
            type="button"
            className={statusFilter === "" ? "app-btn app-btn-primary" : "app-btn app-btn-soft"}
            onClick={() => {
              setPage(0);
              setStatusFilter("");
            }}
          >
            Все
          </button>
          {REQUEST_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={statusFilter === s ? "app-btn app-btn-primary" : "app-btn app-btn-soft"}
              onClick={() => {
                setPage(0);
                setStatusFilter(s);
              }}
            >
              {s}
            </button>
          ))}
        </div>
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
                imageGenerating={imageGeneratingId === order.id}
                expanded={expandedMobileOrderId === order.id}
                onToggleExpand={() =>
                  setExpandedMobileOrderId((prev) => (prev === order.id ? null : order.id))
                }
                onStatusChange={(requestStatus, orderStatus) =>
                  handleQuickStatus(order, requestStatus, orderStatus)
                }
                onEdit={() => setEditing(order)}
                onDelete={() => handleDelete(order)}
                onGenerateImage={() => handleGenerateImage(order)}
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
                <th>Заявка</th>
                <th>Статус внутри</th>
                <th>Оплачено</th>
                <th>Дата</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="empty-state">
                    Загружаем заказы…
                  </td>
                </tr>
              )}
              {!loading && data && data.items.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-state">
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
                        <button
                          type="button"
                          className="app-btn app-btn-soft"
                          style={{ alignSelf: "flex-start", height: 30, padding: "0 10px", fontSize: 12 }}
                          onClick={() => handleGenerateImage(order)}
                          disabled={imageGeneratingId === order.id}
                          title="Найти и сохранить изображение товара"
                        >
                          {imageGeneratingId === order.id
                            ? "Ищем фото..."
                            : hasProductImage(order.order_photo)
                              ? "Обновить изображение"
                              : "Сгенерировать изображение"}
                        </button>
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
                    <td data-label="Заявка">
                      <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                        {REQUEST_STATUSES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={order.request_status === s ? "app-btn app-btn-primary" : "app-btn app-btn-soft"}
                            style={{ height: 30, padding: "0 10px", fontSize: 12 }}
                            disabled={savingId === order.id}
                            onClick={() =>
                              handleQuickStatus(order, s, order.order_status)
                            }
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td data-label="Статус внутри">
                      <select
                        className="app-input"
                        style={{ height: 36, fontSize: 13, paddingLeft: 10, paddingRight: 30 }}
                        value={order.order_status}
                        disabled={savingId === order.id}
                        onChange={(e) =>
                          handleQuickStatus(order, order.request_status, e.target.value)
                        }
                      >
                        {!ORDER_STATUSES.includes(order.order_status as (typeof ORDER_STATUSES)[number]) && (
                          <option value={order.order_status}>{order.order_status}</option>
                        )}
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
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
  imageGenerating,
  expanded,
  onToggleExpand,
  onStatusChange,
  onEdit,
  onDelete,
  onGenerateImage,
}: {
  order: AdminOrder;
  saving: boolean;
  deleting: boolean;
  imageGenerating: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (requestStatus: string, orderStatus: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onGenerateImage: () => void;
}) {
  const tone = statusTone(order.request_status);
  const shortId = order.id ? `#${order.id.slice(0, 8)}` : "";
  const userName = order.user
    ? order.user.username
      ? `@${order.user.username}`
      : [order.user.first_name, order.user.last_name].filter(Boolean).join(" ") ||
        order.user.telegram_id
    : null;
  const userInitial = (order.user?.first_name || order.user?.username || "?")
    .trim()
    .slice(0, 1)
    .toUpperCase();
  const displayUserName = userName || "Пользователь";

  return (
    <div className={`order-card tone-${tone} ${expanded ? "is-open" : ""}`}>
      <div className="order-card-collapsed">
        <div className="order-card-preview">
          {hasProductImage(order.order_photo) ? (
            <img src={order.order_photo} alt={order.model || "Товар"} />
          ) : (
            <span>Фото</span>
          )}
        </div>
        <div className="order-card-head">
          <div className="order-card-title">{order.model || "Заказ"}</div>
          <div className="order-card-sub order-card-id-text">{shortId || "—"}</div>
          <div className="order-card-user-inline">
            <div className="order-card-user-avatar">
              {order.user?.photo_url ? (
                <img src={order.user.photo_url} alt="" />
              ) : (
                userInitial
              )}
            </div>
            <span className="order-card-user-name">{displayUserName}</span>
          </div>
        </div>
        <div className="order-card-aside">
          <div className="order-price-pill">{order.price.toLocaleString("ru-RU")} ¥</div>
          <button
            type="button"
            className={`order-card-chevron ${expanded ? "is-open" : ""}`}
            onClick={onToggleExpand}
            aria-label={expanded ? "Свернуть заявку" : "Развернуть заявку"}
            aria-expanded={expanded}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 8l5 5 5-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="order-card-expand">
        <div className="order-card-expand-inner">
          <div className="order-card-info-grid">
            <div className="order-info-tile order-card-status">
              <span className="order-info-label">Заявка</span>
              <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                {REQUEST_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={order.request_status === s ? "app-btn app-btn-primary" : "app-btn app-btn-soft"}
                    style={{ height: 28, padding: "0 8px", fontSize: 11 }}
                    disabled={saving}
                    onClick={() => onStatusChange(s, order.order_status)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="order-info-tile order-card-status">
              <span className="order-info-label">Статус внутри</span>
              <select
                className="app-input"
                value={order.order_status}
                disabled={saving}
                onChange={(e) => onStatusChange(order.request_status, e.target.value)}
              >
                {!ORDER_STATUSES.includes(order.order_status as (typeof ORDER_STATUSES)[number]) && (
                  <option value={order.order_status}>{order.order_status}</option>
                )}
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="order-info-tile order-info-size" style={{ gridColumn: "1 / -1" }}>
              <span className="order-info-label">Размер</span>
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

          <button
            type="button"
            className="order-card-link order-card-image-action"
            onClick={onGenerateImage}
            disabled={imageGenerating}
          >
            <span>
              {imageGenerating
                ? "Ищем фото..."
                : hasProductImage(order.order_photo)
                  ? "Обновить изображение"
                  : "Сгенерировать изображение"}
            </span>
          </button>

          {order.comment && (
            <div className="order-card-comment">
              <span className="order-card-comment-label">Комментарий</span>
              {order.comment}
            </div>
          )}

          <div className="order-card-foot">
            <span>{formatDate(order.order_date)}</span>
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
            </div>
          </div>
        </div>
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
  const [requestStatus, setRequestStatus] = useState("");
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
    setRequestStatus(order.request_status || "");
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
        request_status: requestStatus.trim(),
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
            <label className="field-label">Статус заявки</label>
            <select
              value={requestStatus}
              onChange={(e) => setRequestStatus(e.target.value)}
              className="app-input"
            >
              {!REQUEST_STATUSES.includes(requestStatus as (typeof REQUEST_STATUSES)[number]) && requestStatus && (
                <option value={requestStatus}>{requestStatus}</option>
              )}
              {REQUEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
            <label className="field-label">Статус внутри</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="app-input"
            >
              {!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number]) && status && (
                <option value={status}>{status}</option>
              )}
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
