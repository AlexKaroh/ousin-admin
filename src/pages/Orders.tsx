import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, ApiError } from "../api";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import {
  CopyIcon,
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
  referral_points?: number;
};

type AdminOrder = {
  id: string;
  user_id: string;
  user: AdminOrderUser | null;
  order_photo: string;
  order_url: string;
  delivery_type: string | null;
  model: string;
  size: number | null;
  price: number;
  comment: string | null;
  china_code: string | null;
  payment_status: string;
  admin_note: string | null;
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

const REQUEST_STATUSES = ["Новые", "Принята", "Завершена", "Отклонена"] as const;
const REQUEST_FILTER_NEW = REQUEST_STATUSES[0];
const REQUEST_FILTER_REST = REQUEST_STATUSES.slice(1);
const ORDER_STATUSES = [
  "В обработке",
  "В пути по Китаю",
  "Готов к выдаче",
  "Выдан",
] as const;

const PAYMENT_OPTIONS = [
  { value: "unpaid", label: "Не оплачен" },
  { value: "partial", label: "Частично" },
  { value: "paid", label: "Оплачен" },
] as const;

/** Показ «итого в $» в модалке (как на референсе), без влияния на сохранение */
const CNY_PER_USD_DISPLAY = 6.6;

function requestStatusBadgeText(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "новые") return "НОВАЯ";
  if (s === "принята") return "ПРИНЯТА";
  if (s === "завершена" || s === "исполнена") return "ЗАВЕРШЕНА";
  if (s === "отклонена") return "ОТКЛОНЕНА";
  return status.toUpperCase().slice(0, 8);
}

function statusTone(status: string): "blue" | "emerald" | "rose" | "amber" {
  const s = status.trim().toLowerCase();
  if (s === "новые") return "blue";
  if (s === "принята") return "emerald";
  if (s === "завершена" || s === "исполнена") return "amber";
  if (s === "отклонена") return "rose";
  return "amber";
}

/** Цвет рамки «статус внутри» по этапу заказа */
function internalOrderTone(orderStatus: string): "emerald" | "teal" | "sky" | "amber" | "rose" | "slate" {
  const os = orderStatus.trim().toLowerCase();
  if (["выдан", "получен", "завершен", "завершён"].includes(os)) return "emerald";
  if (os.includes("готов")) return "teal";
  if (os.includes("китаю") || os.includes("китай")) return "sky";
  if (os.includes("отмен")) return "rose";
  if (os.includes("обработке")) return "amber";
  return "slate";
}

function requestStatusFrameClass(status: string): string {
  const t = statusTone(status);
  const map: Record<string, string> = {
    blue: "order-status-info--accent-blue",
    emerald: "order-status-info--accent-emerald",
    amber: "order-status-info--accent-amber",
    rose: "order-status-info--accent-rose",
  };
  return `order-status-info ${map[t] ?? "order-status-info--accent-slate"}`;
}

function internalStatusFrameClass(orderStatus: string): string {
  const t = internalOrderTone(orderStatus);
  const map: Record<string, string> = {
    emerald: "order-status-info--accent-emerald",
    teal: "order-status-info--accent-teal",
    sky: "order-status-info--accent-sky",
    amber: "order-status-info--accent-amber",
    rose: "order-status-info--accent-rose",
    slate: "order-status-info--accent-slate",
  };
  return `order-status-info ${map[t] ?? "order-status-info--accent-slate"}`;
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

const SUGGEST_PHOTO_CAP = 5;
const MAX_ORDER_PHOTO_DATA_URL_CHARS = 1_050_000;

type SuggestImagesResponse = { suggestions: string[] };

async function compressImageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Выберите файл изображения");
  }
  const bmp = await createImageBitmap(file);
  let w = bmp.width;
  let h = bmp.height;
  const maxDim = 800;
  if (w > maxDim || h > maxDim) {
    const r = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * r);
    h = Math.round(h * r);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Не удалось обработать изображение");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_ORDER_PHOTO_DATA_URL_CHARS && quality > 0.42) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > MAX_ORDER_PHOTO_DATA_URL_CHARS) {
    throw new Error("Файл слишком большой — выберите изображение меньшего размера");
  }
  return dataUrl;
}

function OrderPhotoModalContent({
  order,
  onClose,
  onSaved,
}: {
  order: AdminOrder;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [batchSize, setBatchSize] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [localErr, setLocalErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSuggestions([]);
    setBatchSize(0);
    setSelected(null);
    setManualUrl("");
    setLocalErr("");
  }, [order.id]);

  const busy = suggestBusy || saveBusy || uploadBusy;

  async function persistPhoto(photo: string) {
    setSaveBusy(true);
    setLocalErr("");
    try {
      await apiFetch(`/admin/orders/${order.id}`, {
        method: "PATCH",
        body: { order_photo: photo.trim() },
      });
      await onSaved();
      onClose();
    } catch (err) {
      setLocalErr(err instanceof ApiError ? err.message : "Не удалось сохранить фото");
    } finally {
      setSaveBusy(false);
    }
  }

  async function runSuggest() {
    setSuggestBusy(true);
    setLocalErr("");
    try {
      const res = await apiFetch<SuggestImagesResponse>(
        `/admin/orders/${order.id}/suggest-images`,
        { method: "POST" },
      );
      const list = (res.suggestions || []).slice(0, SUGGEST_PHOTO_CAP);
      setBatchSize(list.length);
      setSuggestions(list);
      setSelected(list[0] ?? null);
    } catch (err) {
      setLocalErr(err instanceof ApiError ? err.message : "Не удалось подобрать фото");
    } finally {
      setSuggestBusy(false);
    }
  }

  function removeSuggestion(url: string) {
    setSuggestions((prev) => prev.filter((u) => u !== url));
    if (selected === url) setSelected(null);
  }

  async function applyManualUrl() {
    const t = manualUrl.trim();
    if (!t) {
      setLocalErr("Вставьте ссылку на изображение");
      return;
    }
    if (!/^https?:\/\//i.test(t) && !t.startsWith("data:image/")) {
      setLocalErr("Нужен URL, начинающийся с http(s)://");
      return;
    }
    await persistPhoto(t);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadBusy(true);
    setLocalErr("");
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      await persistPhoto(dataUrl);
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : "Не удалось загрузить файл");
    } finally {
      setUploadBusy(false);
    }
  }

  const canSuggest = Boolean(order.model?.trim() || order.order_url?.trim());

  return (
    <div className="order-photo-modal">
      {localErr ? <div className="order-photo-modal__error">{localErr}</div> : null}
      <p className="order-photo-modal__hint muted">
        Подбор по названию и странице товара (до {SUGGEST_PHOTO_CAP} превью). Выберите одно и сохраните или
        загрузите своё.
      </p>
      <div className="order-photo-modal__model muted" style={{ fontSize: 13 }}>
        <strong className="order-photo-modal__model-name">{order.model?.trim() || "—"}</strong>
        {order.order_url?.trim() ? (
          <>
            {" "}
            ·{" "}
            <a href={order.order_url} target="_blank" rel="noreferrer" className="order-photo-modal__link">
              открыть ссылку
            </a>
          </>
        ) : null}
      </div>

      <div className="order-photo-modal__actions">
        <button
          type="button"
          className="app-btn app-btn-primary"
          onClick={() => void runSuggest()}
          disabled={busy || !canSuggest}
        >
          {suggestBusy ? "Подбираем…" : "Подобрать фото"}
        </button>
      </div>

      {batchSize > 0 ? (
        <div className="order-photo-strip-block">
          <div className="order-photo-strip-head">
            Фото{" "}
            <span className="order-photo-strip-head__count">
              {suggestions.length}/{batchSize}
            </span>
          </div>
          {suggestions.length === 0 ? (
            <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
              Все варианты убраны — нажмите «Подобрать фото» ещё раз.
            </p>
          ) : (
            <div className="order-photo-strip">
              {suggestions.map((url) => (
                <div
                  key={url}
                  className={`order-photo-thumb-wrap${selected === url ? " order-photo-thumb-wrap--selected" : ""}`}
                >
                  <button
                    type="button"
                    className="order-photo-thumb"
                    onClick={() => setSelected(url)}
                    aria-label="Выбрать это фото"
                  >
                    <img src={url} alt="" loading="lazy" decoding="async" />
                  </button>
                  <button
                    type="button"
                    className="order-photo-thumb-remove"
                    onClick={() => removeSuggestion(url)}
                    aria-label="Убрать из списка"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="order-photo-modal__save-row">
            <button
              type="button"
              className="app-btn app-btn-soft"
              disabled={!selected || saveBusy || uploadBusy}
              onClick={() => selected && void persistPhoto(selected)}
            >
              {saveBusy ? "Сохраняем…" : "Сохранить выбранное"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="order-photo-modal__manual">
        <div className="order-photo-modal__manual-title">Вручную</div>
        <div className="order-photo-modal__manual-row">
          <input
            type="file"
            accept="image/*"
            className="order-photo-file-input"
            ref={fileRef}
            onChange={(e) => void onPickFile(e)}
            aria-hidden
          />
          <button
            type="button"
            className="app-btn app-btn-soft"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {uploadBusy ? "Обработка…" : "С устройства"}
          </button>
        </div>
        <div className="order-photo-modal__url-row">
          <input
            type="url"
            className="app-input"
            placeholder="https://… (прямая ссылка на изображение)"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
          />
          <button
            type="button"
            className="app-btn app-btn-soft"
            disabled={busy || !manualUrl.trim()}
            onClick={() => void applyManualUrl()}
          >
            По URL
          </button>
        </div>
      </div>
    </div>
  );
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function CopyTextButton({
  text,
  variant = "row",
  ariaLabel,
  rowLabel = "Копировать",
  rowCopiedLabel = "Скопировано",
}: {
  text: string;
  variant?: "row" | "icon";
  ariaLabel?: string;
  /** Подпись на широкой кнопке до копирования */
  rowLabel?: string;
  rowCopiedLabel?: string;
}) {
  const trimmed = text.trim();
  const [copied, setCopied] = useState(false);
  if (!trimmed) return null;
  const label = ariaLabel ?? "Скопировать в буфер обмена";

  async function onCopy(e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await writeClipboard(trimmed);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        className={`order-copy-btn order-copy-btn--icon${copied ? " is-copied" : ""}`}
        onClick={onCopy}
        aria-label={label}
      >
        {copied ? "✓" : <CopyIcon size={15} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`order-copy-btn order-copy-btn--row${copied ? " is-copied" : ""}`}
      onClick={onCopy}
      aria-label={label}
    >
      <span className="order-copy-btn__glyph" aria-hidden>
        {copied ? "✓" : <CopyIcon size={14} />}
      </span>
      <span>{copied ? rowCopiedLabel : rowLabel}</span>
    </button>
  );
}

function OrderMobileFieldRow({
  label,
  value,
  copyText,
}: {
  label: string;
  value: ReactNode;
  copyText?: string | null;
}) {
  const text = (copyText ?? "").trim();
  return (
    <div className="order-mobile-field-row">
      <div className="order-mobile-field-body">
        <span className="order-info-label">{label}</span>
        <div className="order-mobile-field-value">{value}</div>
      </div>
      {text ? (
        <CopyTextButton
          text={text}
          variant="icon"
          ariaLabel={`Скопировать: ${label}`}
        />
      ) : null}
    </div>
  );
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
  const [photoPickerOrder, setPhotoPickerOrder] = useState<AdminOrder | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  }, [data]);

  return (
    <>
      <PageHeader
        title="Заявки"
        subtitle="Управляйте общим статусом заявки и внутренним статусом заказа."
      />

      <form className="toolbar orders-toolbar" onSubmit={applySearch}>
        <div className="orders-toolbar-search-apply">
          <div className="orders-toolbar-search">
            <div style={{ position: "relative", width: "100%", minWidth: 0 }}>
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
                  color: "var(--text-soft)",
                  pointerEvents: "none",
                }}
              >
                <SearchIcon size={16} />
              </span>
            </div>
          </div>
          <button type="submit" className="app-btn app-btn-primary orders-toolbar-apply">
            Применить
          </button>
        </div>
        <div className="orders-toolbar-filters" aria-label="Фильтр по статусу заявки">
          <div className="orders-toolbar-filters-row orders-toolbar-filters-row--full">
            <button
              type="button"
              className={
                statusFilter === REQUEST_FILTER_NEW ? "app-btn app-btn-primary" : "app-btn app-btn-soft"
              }
              onClick={() => {
                setPage(0);
                setStatusFilter(REQUEST_FILTER_NEW);
              }}
            >
              {REQUEST_FILTER_NEW}
            </button>
          </div>
          <div className="orders-toolbar-filters-row orders-toolbar-filters-row--three">
            {REQUEST_FILTER_REST.map((s) => (
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
        </div>
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
                expanded={expandedMobileOrderId === order.id}
                onToggleExpand={() =>
                  setExpandedMobileOrderId((prev) => (prev === order.id ? null : order.id))
                }
                onAccept={() => handleQuickStatus(order, "Принята", order.order_status)}
                onComplete={() => handleQuickStatus(order, "Завершена", order.order_status)}
                onReject={() => handleQuickStatus(order, "Отклонена", order.order_status)}
                onEdit={() => setEditing(order)}
                onDelete={() => handleDelete(order)}
                onOpenPhotoPicker={() => setPhotoPickerOrder(order)}
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
                <th>Трек CN</th>
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
                  <td colSpan={10} className="empty-state">
                    Загружаем заказы…
                  </td>
                </tr>
              )}
              {!loading && data && data.items.length === 0 && (
                <tr>
                  <td colSpan={10} className="empty-state">
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
                          {order.delivery_type?.trim() ? order.delivery_type : "—"}
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
                              color: "var(--primary)",
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
                          onClick={() => setPhotoPickerOrder(order)}
                          title="Подбор до 5 фото по названию, загрузка с устройства или по URL"
                        >
                          Фото товара…
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
                    <td data-label="Трек CN" className="font-mono muted" style={{ fontSize: 12 }}>
                      {order.china_code?.trim() || "—"}
                    </td>
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

      <Modal
        open={photoPickerOrder != null}
        title="Фото товара"
        variant="dark"
        cardClassName="modal-card--photo-picker"
        onClose={() => setPhotoPickerOrder(null)}
      >
        {photoPickerOrder ? (
          <OrderPhotoModalContent
            key={photoPickerOrder.id}
            order={photoPickerOrder}
            onClose={() => setPhotoPickerOrder(null)}
            onSaved={load}
          />
        ) : null}
      </Modal>

      <EditOrderModal
        order={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await load();
        }}
      />
    </>
  );
}

function OrderMobileCard({
  order,
  saving,
  deleting,
  expanded,
  onToggleExpand,
  onAccept,
  onComplete,
  onReject,
  onEdit,
  onDelete,
  onOpenPhotoPicker,
}: {
  order: AdminOrder;
  saving: boolean;
  deleting: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onAccept: () => void;
  onComplete: () => void;
  onReject: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenPhotoPicker: () => void;
}) {
  const tone = statusTone(order.request_status);
  const [swipeOpen, setSwipeOpen] = useState<"edit" | "delete" | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
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
  const requestNorm = order.request_status.trim().toLowerCase();
  const primaryIsComplete = requestNorm === "принята";
  const primaryTerminal =
    requestNorm === "завершена" || requestNorm === "исполнена" || requestNorm === "отклонена";
  const showReject = requestNorm === "новые";
  const heroActionTwoCol = !primaryTerminal && showReject;
  const heroHasPhoto = hasProductImage(order.order_photo);
  const openedOffset = swipeOpen === "edit" ? 82 : swipeOpen === "delete" ? -82 : 0;
  const swipeX = dragStart ? dragOffset : openedOffset;

  function isInteractiveTarget(target: EventTarget | null) {
    return target instanceof HTMLElement
      ? Boolean(target.closest("button, a, input, select, textarea, label"))
      : false;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" || isInteractiveTarget(e.target)) return;
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset(openedOffset);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      setDragStart(null);
      setDragOffset(0);
      return;
    }
    const next = Math.max(-92, Math.min(92, openedOffset + dx));
    setDragOffset(next);
  }

  function handlePointerUp() {
    if (!dragStart) return;
    if (dragOffset < -42) setSwipeOpen("delete");
    else if (dragOffset > 42) setSwipeOpen("edit");
    else setSwipeOpen(null);
    setDragStart(null);
    setDragOffset(0);
  }

  const swipeCover =
    expanded && !swipeOpen ? " order-card-swipe--expand-cover" : "";

  return (
    <div
      className={`order-card-swipe${swipeOpen ? ` is-swiped is-swiped-${swipeOpen}` : ""}${swipeCover}`}
    >
      <button
        type="button"
        className="order-card-swipe-edit"
        onClick={onEdit}
        aria-label="Редактировать заявку"
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        className="order-card-swipe-delete"
        onClick={onDelete}
        disabled={deleting}
        aria-label="Удалить заявку"
      >
        {deleting ? <span className="spinner" /> : "×"}
      </button>
      <div
        className={`order-card tone-${tone} ${expanded ? "is-open" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ transform: `translateX(${swipeX}px)` }}
      >
      <div className={`order-card-collapsed${heroHasPhoto ? " order-card-collapsed--with-thumb" : ""}`}>
        <div className="order-card-hero-main">
          <div className="order-card-hero-top">
            <span className="order-card-hero-date">{formatDate(order.order_date)}</span>
            <span className={`order-card-hero-pill order-card-hero-pill--${statusTone(order.request_status)}`}>
              {requestStatusBadgeText(order.request_status)}
            </span>
          </div>
          <div className="order-card-hero-user-row">
            {order.user?.photo_url ? (
              <img
                className="order-card-hero-user-avatar"
                src={order.user.photo_url}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="order-card-hero-user-avatar order-card-hero-user-avatar--fallback" aria-hidden>
                {userInitial}
              </div>
            )}
            <span className="order-card-hero-user-name">{displayUserName}</span>
          </div>
          <div className="order-card-hero-price-row">
            <span className="order-card-hero-price">{order.price.toLocaleString("ru-RU")} ¥</span>
            {order.size != null ? (
              <span className="order-card-hero-size">Размер: {order.size}</span>
            ) : null}
          </div>
          <div className="order-card-hero-title">{order.model || "Заказ"}</div>
          <div className="order-card-hero-actions-row">
            <div
              className={`order-card-hero-actions ${heroActionTwoCol ? "order-card-hero-actions--two" : "order-card-hero-actions--one"}`}
            >
              {primaryTerminal ? (
                <button
                  type="button"
                  className={`order-card-hero-btn order-card-hero-btn--accept order-card-hero-btn--terminal${requestNorm === "отклонена" ? " order-card-hero-btn--state-muted" : ""}`}
                  disabled
                >
                  {requestNorm === "отклонена" ? "Отклонено" : "Завершено"}
                </button>
              ) : (
                <button
                  type="button"
                  className="order-card-hero-btn order-card-hero-btn--accept"
                  disabled={saving}
                  onClick={primaryIsComplete ? onComplete : onAccept}
                >
                  {primaryIsComplete ? "+ Завершить заявку" : "+ Принять"}
                </button>
              )}
              {showReject ? (
                <button
                  type="button"
                  className="order-card-hero-btn order-card-hero-btn--reject"
                  disabled={saving}
                  onClick={onReject}
                >
                  ✕ Отклонить
                </button>
              ) : null}
            </div>
            <button
              type="button"
              className={`order-card-chevron order-card-chevron--hero ${expanded ? "is-open" : ""}`}
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
        {heroHasPhoto ? (
          <div className="order-card-hero-thumb">
            <img src={order.order_photo ?? ""} alt="" loading="lazy" decoding="async" />
          </div>
        ) : null}
      </div>

      <div className="order-card-expand">
        <div className="order-card-expand-inner">
          <button
            type="button"
            className="order-card-link order-card-image-action order-card-image-action--expand-top"
            onClick={onOpenPhotoPicker}
          >
            <span>Фото товара…</span>
          </button>

          <div className="order-mobile-copy-stack">
            <OrderMobileFieldRow label="ID заявки" value={order.id} copyText={order.id} />
            <OrderMobileFieldRow
              label="Название"
              value={order.model?.trim() ? order.model : "—"}
              copyText={order.model?.trim() ? order.model : null}
            />
            <OrderMobileFieldRow
              label="Цена"
              value={`${order.price.toLocaleString("ru-RU")} ¥`}
              copyText={`${order.price} ¥`}
            />
            <OrderMobileFieldRow
              label="Тип доставки"
              value={order.delivery_type || "—"}
              copyText={order.delivery_type?.trim() ? order.delivery_type : null}
            />
            <OrderMobileFieldRow
              label="Оплачено"
              value={order.is_paid ? "Да" : "Нет"}
              copyText={order.is_paid ? "Да" : "Нет"}
            />
          </div>

          <div className="order-card-info-grid">
            <div className={requestStatusFrameClass(order.request_status)}>
              <div className="order-status-info__bar" aria-hidden />
              <div className="order-status-info__main">
                <span className="order-info-label">Заявка</span>
                <div className="order-status-info__value">{order.request_status}</div>
              </div>
            </div>
            <div className={internalStatusFrameClass(order.order_status)}>
              <div className="order-status-info__bar" aria-hidden />
              <div className="order-status-info__main">
                <span className="order-info-label">Статус внутри</span>
                <div className="order-status-info__value">{order.order_status}</div>
              </div>
            </div>
            <div className="order-info-tile order-info-size" style={{ gridColumn: "1 / -1" }}>
              <div className="order-info-tile-head">
                <span className="order-info-label">Размер</span>
              </div>
              <span className="order-info-value">{order.size ?? "—"}</span>
            </div>
          </div>

          {order.user && (
            <>
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
              <div className="order-mobile-user-copy">
                <CopyTextButton
                  text={`${userName}\nTelegram ID: ${order.user.telegram_id}`}
                  variant="row"
                  rowLabel="Контакты"
                  rowCopiedLabel="Скопировано"
                  ariaLabel="Скопировать имя и Telegram ID"
                />
              </div>
            </>
          )}

          {order.order_url ? (
            <div className="order-mobile-link-block">
              <a
                className="order-card-link"
                href={order.order_url}
                target="_blank"
                rel="noreferrer"
              >
                <LinkIcon />
                <span>Открыть товар</span>
              </a>
              <CopyTextButton
                text={order.order_url}
                variant="row"
                rowLabel="Ссылка"
                rowCopiedLabel="Скопировано"
                ariaLabel="Скопировать ссылку на товар"
              />
            </div>
          ) : null}

          {heroHasPhoto ? (
            <OrderMobileFieldRow
              label="Фото (URL)"
              value={
                <span className="order-mobile-field-mono">{order.order_photo}</span>
              }
              copyText={order.order_photo}
            />
          ) : null}

          {order.comment ? (
            <div className="order-card-comment">
              <div className="order-card-comment-head">
                <span className="order-card-comment-label">Комментарий</span>
                <CopyTextButton text={order.comment} variant="icon" ariaLabel="Скопировать комментарий" />
              </div>
              {order.comment}
            </div>
          ) : null}

          <div className="order-card-foot">
            <div className="order-card-foot-date">
              <span>{formatDate(order.order_date)}</span>
            </div>
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
  const [paymentStatus, setPaymentStatus] = useState<string>("unpaid");
  const [comment, setComment] = useState("");
  const [chinaCode, setChinaCode] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [referralPoints, setReferralPoints] = useState("");
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
    setPaymentStatus(order.payment_status || "unpaid");
    setComment(order.comment || "");
    setChinaCode(order.china_code ?? "");
    setAdminNote(order.admin_note ?? "");
    setReferralPoints(
      order.user?.referral_points != null ? String(order.user.referral_points) : "0",
    );
    setError("");
  }, [order]);

  const priceNum = useMemo(() => {
    const n = Number(String(price).replace(",", ".").trim());
    return Number.isFinite(n) ? n : NaN;
  }, [price]);

  const totalUsdDisplay = useMemo(() => {
    if (!Number.isFinite(priceNum) || priceNum <= 0) return "—";
    return `$${Math.round(priceNum / CNY_PER_USD_DISPLAY)}`;
  }, [priceNum]);

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
        delivery_type: deliveryType.trim() === "" ? null : deliveryType.trim(),
        request_status: requestStatus.trim(),
        order_status: status.trim(),
        payment_status: paymentStatus,
        comment,
        china_code: chinaCode.trim() || null,
        admin_note: adminNote.trim() || null,
      };
      const p = Number(String(price).replace(",", "."));
      if (Number.isFinite(p)) body.price = p;
      body.size = size.trim() === "" ? null : size.trim();

      await apiFetch(`/admin/orders/${order.id}`, {
        method: "PATCH",
        body,
      });

        if (order.user) {
          const rp = Math.max(
            0,
            Math.round(Number(String(referralPoints).replace(",", ".").trim()) || 0),
          );
          if (rp !== (order.user.referral_points ?? 0)) {
            await apiFetch(`/admin/users/${order.user.id}`, {
              method: "PATCH",
              body: { referral_points: rp },
            });
          }
        }

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
      variant="dark"
      title={model.trim() || "Заявка"}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="eo-footer-btn eo-footer-btn--ghost">
            Отмена
          </button>
          <button
            type="submit"
            form="edit-order-form"
            className="eo-footer-btn eo-footer-btn--primary"
            disabled={saving}
          >
            {saving ? <span className="spinner" /> : null}
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
        </>
      }
    >
      <form id="edit-order-form" className="eo-form" onSubmit={handleSubmit}>
        <div className="eo-field">
          <label className="eo-label">Описание</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="eo-input eo-textarea"
            placeholder="Размер, цвет, особенности…"
            rows={3}
          />
        </div>

        <div className="eo-field">
          <label className="eo-label">Ссылка на товар</label>
          <div className="eo-input-with-icon">
            <LinkIcon className="eo-input-icon" size={16} />
            <input
              value={orderUrl}
              onChange={(e) => setOrderUrl(e.target.value)}
              className="eo-input eo-input--inset"
              maxLength={500}
            />
          </div>
        </div>

        <div className="eo-field">
          <label className="eo-label">Трек Китай (china_code)</label>
          <input
            value={chinaCode}
            onChange={(e) => setChinaCode(e.target.value)}
            className="eo-input"
            placeholder="Трек-номер из Китая"
            maxLength={120}
          />
        </div>

        <div className="eo-field">
          <label className="eo-label">Цена в юанях (¥)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="eo-input"
            inputMode="decimal"
          />
        </div>

        <div className="eo-total-row">
          <span className="eo-label eo-label--inline">Итого (автоматически)</span>
          <span className="eo-total-value">{totalUsdDisplay}</span>
        </div>
        <p className="eo-hint">
          Курс: {CNY_PER_USD_DISPLAY} ¥/$ · формула: цена ¥ / курс (только подсказка)
        </p>

        <div className="eo-field">
          <label className="eo-label">Статус оплаты</label>
          <div className="eo-segment" role="group" aria-label="Статус оплаты">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`eo-segment-btn eo-segment-btn--${opt.value}${paymentStatus === opt.value ? " is-active" : ""}`}
                onClick={() => setPaymentStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="eo-field">
          <label className="eo-label">Заметка</label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            className="eo-input eo-textarea"
            placeholder="Служебная заметка…"
            rows={3}
          />
        </div>

        {order.user ? (
          <div className="eo-field">
            <label className="eo-label">Реф. баллы пользователя</label>
            <input
              value={referralPoints}
              onChange={(e) => setReferralPoints(e.target.value)}
              className="eo-input"
              inputMode="numeric"
            />
          </div>
        ) : null}

        <div className="eo-field">
          <label className="eo-label">Название товара (модель)</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="eo-input"
            maxLength={200}
          />
        </div>

        <div className="eo-two">
          <div className="eo-field">
            <label className="eo-label">Размер</label>
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="eo-input"
              inputMode="numeric"
            />
          </div>
          <div className="eo-field">
            <label className="eo-label">Тип доставки</label>
            <input
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value)}
              className="eo-input"
              placeholder="Пусто — не задано"
            />
          </div>
        </div>

        <div className="eo-field">
          <label className="eo-label">Статус заявки</label>
          <div className="eo-segment eo-segment--status" role="group" aria-label="Статус заявки">
            {Array.from(
              new Set([
                ...(requestStatus &&
                !REQUEST_STATUSES.includes(requestStatus as (typeof REQUEST_STATUSES)[number])
                  ? [requestStatus]
                  : []),
                ...REQUEST_STATUSES,
              ]),
            ).map((s) => (
              <button
                key={s}
                type="button"
                className={`eo-segment-btn${requestStatus === s ? " is-active" : ""}`}
                onClick={() => setRequestStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="eo-field">
          <label className="eo-label">Статус внутри</label>
          <div className="eo-segment eo-segment--status" role="group" aria-label="Статус внутри">
            {Array.from(
              new Set([
                ...(status && !ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number]) ? [status] : []),
                ...ORDER_STATUSES,
              ]),
            ).map((s) => (
              <button
                key={s}
                type="button"
                className={`eo-segment-btn${status === s ? " is-active" : ""}`}
                onClick={() => setStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error ? <div className="eo-error">{error}</div> : null}
      </form>
    </Modal>
  );
}
