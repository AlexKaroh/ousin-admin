export type GroupableAdminOrder = {
  id: string;
  order_group_id?: string | null;
  position_in_group?: number | null;
  price: number;
  order_date: string;
  request_status: string;
  order_status: string;
  is_paid: boolean;
  delivery_type: string | null;
};

export type AdminOrderGroup<T extends GroupableAdminOrder = GroupableAdminOrder> = {
  group_id: string;
  orders: T[];
  total_price: number;
  items_count: number;
  order_date: string;
  request_status: string;
  order_status: string;
  is_paid: boolean;
  delivery_type: string | null;
};

export function buildAdminOrderGroups<T extends GroupableAdminOrder>(
  orders: T[],
): AdminOrderGroup<T>[] {
  if (!orders.length) return [];

  const map = new Map<string, T[]>();
  for (const o of orders) {
    const gid = o.order_group_id?.trim();
    const key = gid && gid.length > 0 ? gid : `single:${o.id}`;
    const list = map.get(key);
    if (list) list.push(o);
    else map.set(key, [o]);
  }

  const groups: AdminOrderGroup<T>[] = [];
  for (const [key, list] of map) {
    const sorted = [...list].sort((a, b) => {
      const pa = a.position_in_group ?? 0;
      const pb = b.position_in_group ?? 0;
      if (pa !== pb) return pa - pb;
      return new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
    });
    const first = sorted[0];
    const total_price = sorted.reduce(
      (s, r) => s + (Number.isFinite(r.price) ? r.price : 0),
      0,
    );
    const maxDate = sorted.reduce(
      (max, r) => Math.max(max, new Date(r.order_date).getTime()),
      0,
    );
    groups.push({
      group_id: key.startsWith("single:") ? first.id : key,
      orders: sorted,
      total_price: Math.round(total_price * 100) / 100,
      items_count: sorted.length,
      order_date: new Date(maxDate).toISOString(),
      request_status: first.request_status,
      order_status: first.order_status,
      is_paid: sorted.every((r) => r.is_paid),
      delivery_type: first.delivery_type,
    });
  }

  groups.sort(
    (a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime(),
  );
  return groups;
}
