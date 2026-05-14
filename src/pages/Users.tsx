import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import {
  OrdersIcon,
  PencilIcon,
  ReviewsIcon,
  SearchIcon,
  TrashIcon,
  UsersIcon,
} from "../components/Icons";

type AdminUser = {
  id: string;
  telegram_id: string;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  referral_code: string;
  referred_by: string | null;
  referrals_count: number;
  referral_points: number;
  created_at: string;
  orders_count: number;
  reviews_count: number;
};

type ListResponse = {
  total: number;
  take: number;
  skip: number;
  items: AdminUser[];
};

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function UsersPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<ListResponse>("/admin/users", {
        query: {
          search: search || undefined,
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
  }, [search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  async function handleDelete(user: AdminUser) {
    if (
      !window.confirm(
        `Удалить пользователя ${user.username ? "@" + user.username : user.first_name}? Это удалит и его заказы и отзывы.`,
      )
    ) {
      return;
    }
    setDeletingId(user.id);
    try {
      await apiFetch(`/admin/users/${user.id}`, { method: "DELETE" });
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
        title="Пользователи"
        subtitle="Telegram-пользователи, которые зашли в приложение и зарегистрированы в системе."
      />

      <form className="toolbar" onSubmit={applySearch}>
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 360 }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Поиск по username, имени, реф-коду…"
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
        <button type="submit" className="app-btn app-btn-primary">
          Применить
        </button>
        <button
          type="button"
          className="app-btn app-btn-ghost"
          onClick={() => {
            setSearchInput("");
            setSearch("");
            setPage(0);
          }}
        >
          Сбросить
        </button>
      </form>

      {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="table-wrap users-table-wrap">
        <div className="users-mobile">
          {loading && (
            <div className="empty-state app-card card-padded">
              Загружаем пользователей…
            </div>
          )}
          {!loading && data && data.items.length === 0 && (
            <div className="empty-state app-card card-padded">
              Пользователи не найдены
            </div>
          )}
          {!loading &&
            data?.items.map((user) => (
              <UserMobileCard
                key={user.id}
                user={user}
                deleting={deletingId === user.id}
                onEdit={() => setEditing(user)}
                onDelete={() => handleDelete(user)}
              />
            ))}
        </div>
        <div className="table-scroll">
          <table className="app-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Telegram</th>
                <th>Реф. код</th>
                <th>Приглашено</th>
                <th>Реф. баллы</th>
                <th>Заказы</th>
                <th>Отзывы</th>
                <th>Регистрация</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="empty-state">
                    Загружаем пользователей…
                  </td>
                </tr>
              )}
              {!loading && data && data.items.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-state">
                    Пользователи не найдены
                  </td>
                </tr>
              )}
              {!loading &&
                data?.items.map((user) => {
                  const initial = (user.first_name || user.username || "U")
                    .trim()
                    .slice(0, 1)
                    .toUpperCase();
                  return (
                    <tr key={user.id}>
                      <td data-label="Пользователь" data-mobile="full">
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {user.photo_url ? (
                            <img
                              src={user.photo_url}
                              alt=""
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                objectFit: "cover",
                                border: "1px solid rgba(15,23,42,0.08)",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                display: "grid",
                                placeItems: "center",
                                background:
                                  "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)",
                                color: "#fff",
                                fontWeight: 800,
                              }}
                            >
                              {initial}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700 }}>
                              {[user.first_name, user.last_name]
                                .filter(Boolean)
                                .join(" ") || "—"}
                            </div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {user.username ? `@${user.username}` : "без username"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Telegram" className="font-mono muted">
                        {user.telegram_id}
                      </td>
                      <td data-label="Реф. код">
                        <span className="badge">{user.referral_code}</span>
                      </td>
                      <td data-label="Приглашено" className="tabular-nums">
                        {user.referrals_count}
                      </td>
                      <td data-label="Баллы" className="tabular-nums">
                        {user.referral_points}
                      </td>
                      <td data-label="Заказы">{user.orders_count}</td>
                      <td data-label="Отзывы">{user.reviews_count}</td>
                      <td
                        data-label="Регистрация"
                        className="muted"
                        style={{ fontSize: 13 }}
                      >
                        {formatDate(user.created_at)}
                      </td>
                      <td data-label="Действия">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn primary"
                            onClick={() => setEditing(user)}
                            title="Редактировать"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id}
                            title="Удалить пользователя"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <div>
            {data ? `Показано ${data.items.length} из ${data.total}` : "—"}
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

      <EditUserModal
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await load();
        }}
      />
    </div>
  );
}

function UserMobileCard({
  user,
  deleting,
  onEdit,
  onDelete,
}: {
  user: AdminUser;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const initial = (user.first_name || user.username || "U")
    .trim()
    .slice(0, 1)
    .toUpperCase();
  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || "—";
  const usernameText = user.username ? `@${user.username}` : "без username";
  const shortId = user.id ? `#${user.id.slice(0, 8)}` : "";

  return (
    <div className="user-card">
      <div className="user-card-row">
        <div className="user-card-avatar">
          {user.photo_url ? <img src={user.photo_url} alt="" /> : initial}
        </div>
        <div className="user-card-head">
          <div className="user-card-name">{fullName}</div>
          <div className="user-card-sub">{usernameText}</div>
        </div>
        <div className="row-actions">
          <button
            type="button"
            className="icon-btn primary"
            onClick={onEdit}
            aria-label="Редактировать пользователя"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            className="icon-btn danger"
            onClick={onDelete}
            disabled={deleting}
            aria-label="Удалить пользователя"
          >
            {deleting ? <span className="spinner" /> : <TrashIcon />}
          </button>
        </div>
      </div>

      <div className="user-card-meta">
        <div className="user-meta-chip">
          <span className="meta-label">Telegram</span>
          <span className="font-mono">{user.telegram_id}</span>
        </div>
        <div className="user-meta-chip">
          <span className="meta-label">Реф-код</span>
          <span className="badge">{user.referral_code}</span>
        </div>
        <div className="user-meta-chip">
          <span className="meta-label">Приглашено</span>
          <span className="tabular-nums">{user.referrals_count}</span>
        </div>
      </div>

      <div className="user-card-stats">
        <div className="user-stat-tile">
          <span className="meta-label">Заказы</span>
          <div className="user-stat-value">
            <OrdersIcon size={15} />
            {user.orders_count}
          </div>
        </div>
        <div className="user-stat-tile">
          <span className="meta-label">Отзывы</span>
          <div className="user-stat-value">
            <ReviewsIcon size={15} />
            {user.reviews_count}
          </div>
        </div>
        <div className="user-stat-tile">
          <span className="meta-label">Регистрация</span>
          <div className="user-stat-value">{formatDate(user.created_at)}</div>
        </div>
      </div>

      <div className="user-card-foot">
        <span className="user-chip">
          <UsersIcon size={14} />
          {user.referred_by ? `ref: ${user.referred_by}` : "без реферера"}
        </span>
        {shortId && <span className="order-card-id">{shortId}</span>}
      </div>
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [referralPoints, setReferralPoints] = useState("");
  const [referralsCount, setReferralsCount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setUsername(user.username || "");
    setFirstName(user.first_name || "");
    setLastName(user.last_name || "");
    setPhotoUrl(user.photo_url || "");
    setReferredBy(user.referred_by || "");
    setReferralPoints(String(user.referral_points ?? 0));
    setReferralsCount(String(user.referrals_count ?? 0));
    setError("");
  }, [user]);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: {
          username,
          first_name: firstName,
          last_name: lastName,
          photo_url: photoUrl,
          referred_by: referredBy,
          referral_points: Math.max(
            0,
            Math.round(Number(String(referralPoints).replace(",", ".").trim()) || 0),
          ),
          referrals_count: Math.max(
            0,
            Math.round(Number(String(referralsCount).replace(",", ".").trim()) || 0),
          ),
        },
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
      open={Boolean(user)}
      title="Редактирование пользователя"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="app-btn app-btn-ghost">
            Отмена
          </button>
          <button
            type="submit"
            form="edit-user-form"
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
        id="edit-user-form"
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">Имя</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="app-input"
            />
          </div>
          <div className="field">
            <label className="field-label">Фамилия</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="app-input"
            />
          </div>
        </div>
        <div className="field">
          <label className="field-label">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="app-input"
          />
        </div>
        <div className="field">
          <label className="field-label">Ссылка на фото</label>
          <input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className="app-input"
          />
        </div>
        <div className="field">
          <label className="field-label">Реферер (referred_by)</label>
          <input
            value={referredBy}
            onChange={(e) => setReferredBy(e.target.value)}
            className="app-input"
            placeholder="Реф-код пригласившего"
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field">
            <label className="field-label">Приглашено (чел.)</label>
            <input
              value={referralsCount}
              onChange={(e) => setReferralsCount(e.target.value)}
              className="app-input"
              inputMode="numeric"
            />
          </div>
          <div className="field">
            <label className="field-label">Реф. баллы</label>
            <input
              value={referralPoints}
              onChange={(e) => setReferralPoints(e.target.value)}
              className="app-input"
              inputMode="numeric"
            />
          </div>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <div className="muted" style={{ fontSize: 12 }}>
          ID: <span className="font-mono">{user.id}</span> · Telegram:{" "}
          <span className="font-mono">{user.telegram_id}</span>
        </div>
      </form>
    </Modal>
  );
}
