export const DELIVERY_TYPE_OPTIONS = [
  { value: "air", emoji: "✈️", label: "Авиа" },
  { value: "auto", emoji: "🚗", label: "Авто" },
] as const;

export type DeliveryTypeKey = (typeof DELIVERY_TYPE_OPTIONS)[number]["value"];

export function parseDeliveryTypeKey(
  raw: string | null | undefined,
): DeliveryTypeKey | null {
  const t = String(raw ?? "").trim().toLowerCase();
  if (!t) return null;
  if (t === "air" || t.includes("ави") || t.includes("avia")) return "air";
  if (t === "auto" || t.includes("авто")) return "auto";
  return null;
}

export function formatDeliveryTypeLabel(raw: string | null | undefined): string {
  const key = parseDeliveryTypeKey(raw);
  if (key === "air") return "✈️ Авиа";
  if (key === "auto") return "🚗 Авто";
  const legacy = String(raw ?? "").trim();
  return legacy || "—";
}

export function formatDeliveryTypeShort(raw: string | null | undefined): string {
  const key = parseDeliveryTypeKey(raw);
  if (key === "air") return "✈️";
  if (key === "auto") return "🚗";
  return "";
}
