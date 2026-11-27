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

// 되고 싶은 날까지 남은 날. future 는 "2027-12-31" 꼴이고, 정하지 않았으면(빈칸) 내년 마지막 날로 봅니다
export function dday(future: string, t: { y: number; m: number; d: number }) {
  const f = future ? new Date(`${future}T00:00:00`) : new Date(t.y + 1, 11, 31);
  const diff = Math.round((f.getTime() - new Date(t.y, t.m, t.d).getTime()) / 864e5);
  return {
    f, label: diff > 0 ? `D-${diff}` : diff === 0 ? "D-day" : `D+${-diff}`,
    goal: `${f.getFullYear()}년 ${f.getMonth() + 1}월 ${f.getDate()}일의 나까지`,
  };
}
