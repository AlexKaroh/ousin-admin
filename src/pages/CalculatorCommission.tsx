import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api";
import PageHeader from "../components/PageHeader";

type Tier = { min: number; max: number; rate: number };

type LoadResponse = {
  tiers: Tier[];
  vatOnCommissionRate: number;
  usdToBynRate: number;
  defaults: { tiers: Tier[]; vatOnCommissionRate: number; usdToBynRate: number };
  updated_at: string | null;
  stored: boolean;
};

type Row = { min: string; max: string; ratePct: string };

function numOrZero(v: string): number {
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

function tiersToRows(tiers: Tier[]): Row[] {
  return tiers.map((t) => ({
    min: String(t.min),
    max: String(t.max),
    ratePct: String(Math.round(t.rate * 10000) / 100),
  }));
}

export default function CalculatorCommissionPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [vatPct, setVatPct] = useState("20");
  const [usdToByn, setUsdToByn] = useState("3.2");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [stored, setStored] = useState(false);
  const [defaults, setDefaults] = useState<LoadResponse["defaults"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<LoadResponse>("/admin/settings/calculator-commission");
      setRows(tiersToRows(data.tiers));
      setVatPct(String(Math.round(data.vatOnCommissionRate * 10000) / 100));
      setUsdToByn(String(data.usdToBynRate ?? data.defaults.usdToBynRate ?? 3.2));
      setUpdatedAt(data.updated_at);
      setStored(data.stored);
      setDefaults(data.defaults);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => {
      const last = prev[prev.length - 1];
      const start = last ? numOrZero(last.max) + 1 : 1;
      return [...prev, { min: String(start), max: String(start + 99), ratePct: "5" }];
    });
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, j) => j !== i));
  }

  function applyDefaults() {
    if (!defaults) return;
    setRows(tiersToRows(defaults.tiers));
    setVatPct(String(Math.round(defaults.vatOnCommissionRate * 10000) / 100));
    setUsdToByn(String(defaults.usdToBynRate ?? 3.2));
  }

  async function save() {
    setSaving(true);
    setError("");
    setOk("");
    const vat = numOrZero(vatPct) / 100;
    if (vat < 0 || vat > 1) {
      setError("НДС на комиссию: введите процент от 0 до 100");
      setSaving(false);
      return;
    }
    const usdRate = numOrZero(usdToByn);
    if (usdRate <= 0) {
      setError("Курс доллара: введите положительное число");
      setSaving(false);
      return;
    }
    const tiers: Tier[] = rows.map((r) => ({
      min: Math.round(numOrZero(r.min)),
      max: Math.round(numOrZero(r.max)),
      rate: numOrZero(r.ratePct) / 100,
    }));
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (t.min > t.max) {
        setError(`Строка ${i + 1}: мин. больше макс.`);
        setSaving(false);
        return;
      }
      if (t.rate < 0 || t.rate > 1) {
        setError(`Строка ${i + 1}: ставка комиссии 0–100%`);
        setSaving(false);
        return;
      }
    }
    try {
      await apiFetch<LoadResponse>("/admin/settings/calculator-commission", {
        method: "PATCH",
        body: { tiers, vatOnCommissionRate: vat, usdToBynRate: usdRate },
      });
      setOk("Сохранено");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Комиссия калькулятора"
        subtitle="Пороги по цене товара в ¥ и НДС на комиссию площадки. Данные забирает мини-приложение с /public/calculator-commission."
      />

      {loading ? (
        <div className="empty-state app-card card-padded">Загрузка…</div>
      ) : (
        <div className="app-card card-padded" style={{ maxWidth: 720 }}>
          <div className="muted" style={{ marginBottom: 14, fontSize: 13 }}>
            Комиссия = цена в ¥ × ставка порога; к цене добавляются комиссия и НДС (
            <code>vatOnCommissionRate</code>).
            {updatedAt ? <> Обновлено: {new Date(updatedAt).toLocaleString("ru-RU")}</> : null}
            {!stored ? " В БД пока нет своих значений — отдаются заводские." : null}
          </div>

          <div className="eo-field" style={{ marginBottom: 16 }}>
            <label className="eo-label">НДС на комиссию, %</label>
            <input
              className="app-input"
              value={vatPct}
              onChange={(e) => setVatPct(e.target.value)}
              inputMode="decimal"
              style={{ maxWidth: 160 }}
            />
          </div>

          <div className="eo-field" style={{ marginBottom: 16 }}>
            <label className="eo-label">Курс доллара ($ → Br)</label>
            <input
              className="app-input"
              value={usdToByn}
              onChange={(e) => setUsdToByn(e.target.value)}
              inputMode="decimal"
              style={{ maxWidth: 160 }}
            />
            <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              Используется в калькуляторе доставки мини-приложения для перевода USD в белорусские рубли.
            </p>
          </div>

          <div style={{ marginBottom: 8, fontWeight: 700 }}>Пороги: мин ¥ — макс ¥ — ставка комиссии, %</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <input
                  className="app-input"
                  aria-label="Минимум юаней"
                  value={r.min}
                  onChange={(e) => setRow(i, { min: e.target.value })}
                  inputMode="numeric"
                />
                <input
                  className="app-input"
                  aria-label="Максимум юаней"
                  value={r.max}
                  onChange={(e) => setRow(i, { max: e.target.value })}
                  inputMode="numeric"
                />
                <input
                  className="app-input"
                  aria-label="Ставка комиссии процент"
                  value={r.ratePct}
                  onChange={(e) => setRow(i, { ratePct: e.target.value })}
                  inputMode="decimal"
                />
                <button type="button" className="app-btn app-btn-soft" onClick={() => removeRow(i)} disabled={rows.length <= 1}>
                  Удалить
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            <button type="button" className="app-btn app-btn-soft" onClick={addRow}>
              + Порог
            </button>
            <button type="button" className="app-btn app-btn-ghost" onClick={applyDefaults}>
              Сбросить к заводским
            </button>
            <button type="button" className="app-btn app-btn-primary" onClick={() => void save()} disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>

          {error ? (
            <div className="error-banner" style={{ marginTop: 12 }}>
              {error}
            </div>
          ) : null}
          {ok ? (
            <div style={{ marginTop: 12, color: "var(--success, #22c55e)", fontWeight: 600 }}>
              {ok}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
