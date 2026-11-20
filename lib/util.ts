export const WD = ["일", "월", "화", "수", "목", "금", "토"];
export const MAX_KEYS = 12;
export const p2 = (n: number) => String(n).padStart(2, "0");
export const ymd = (y: number, m: number, d: number) => `${y}-${p2(m + 1)}-${p2(d)}`;
export const ym = (y: number, m: number) => `${y}-${p2(m + 1)}`;
export const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
export function todayParts() {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
}

export type Area = { id: string; name: string; sort: number };
export type Action = { id: string; area_id: string | null; text: string; is_key: boolean; sort: number };
export type Journal = { pour: string; listen: string; teach: string };
