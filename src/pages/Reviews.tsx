import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api";
import PageHeader from "../components/PageHeader";
import { TrashIcon } from "../components/Icons";

type ReviewItem = {
  id: string;
  order_id: string;
  user_id: string;
  rating: number;
  text: string;
  created_at: string;
  user: {
    id: string;
    username: string | null;
    first_name: string;
    last_name: string | null;
    photo_url: string | null;
  };
  order: {
    id: string;
    model: string;
    order_url: string;
  };
};

type ListResponse = {
  total: number;
  take: number;
  skip: number;
  items: ReviewItem[];
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

function Stars({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div style={{ display: "inline-flex", gap: 1, color: "#f59e0b" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ opacity: i < safe ? 1 : 0.25 }}>★</span>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<ListResponse>("/admin/reviews", {
        query: { take: PAGE_SIZE, skip: page * PAGE_SIZE },
      });
      setData(res);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(review: ReviewItem) {
    if (!window.confirm("Удалить отзыв?")) return;
    setDeletingId(review.id);
    try {
      await apiFetch(`/admin/reviews/${review.id}`, { method: "DELETE" });
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
        title="Отзывы"
        subtitle="Все отзывы клиентов о завершенных заказах."
      />

      {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="app-table">
            <thead>
              <tr>
                <th>Автор</th>
                <th>Заказ</th>
                <th>Оценка</th>
                <th>Текст</th>
                <th>Дата</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    Загружаем отзывы…
                  </td>
                </tr>
              )}
              {!loading && data && data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    Отзывов пока нет
                  </td>
                </tr>
              )}
              {!loading &&
                data?.items.map((review) => {
                  const initial = (review.user.first_name || review.user.username || "U")
                    .trim()
                    .slice(0, 1)
                    .toUpperCase();
                  return (
                    <tr key={review.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {review.user.photo_url ? (
                            <img
                              src={review.user.photo_url}
                              alt=""
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 12,
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 36,
                                height: 36,
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
                              {[review.user.first_name, review.user.last_name]
                                .filter(Boolean)
                                .join(" ") || "—"}
                            </div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {review.user.username
                                ? `@${review.user.username}`
                                : "без username"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{review.order.model}</div>
                        {review.order.order_url && (
                          <a
                            href={review.order.order_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#2563eb", fontSize: 12 }}
                          >
                            Открыть товар
                          </a>
                        )}
                      </td>
                      <td>
                        <Stars value={review.rating} />
                      </td>
                      <td style={{ maxWidth: 360 }}>
                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                            fontSize: 13,
                            color: "#1f2937",
                          }}
                        >
                          {review.text}
                        </div>
                      </td>
                      <td className="muted" style={{ fontSize: 13 }}>
                        {formatDate(review.created_at)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => handleDelete(review)}
                          disabled={deletingId === review.id}
                          title="Удалить отзыв"
                        >
                          <TrashIcon />
                        </button>
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
    </div>
  );
}
