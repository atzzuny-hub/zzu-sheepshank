// 건강 화면이 쓰는 것들: 기록의 꼴, 잰 때의 이름, 날짜별로 묶는 계산
import { p2, ymd } from "./util";

// 혈당 기록 하나. date 는 잰 날("2026-11-26"), at 은 잰 시각("13:20", 모르면 빈칸), kind 는 잰 때(공복, 식후 2시간 …)
export type Glucose = { id: string; date: string; at: string; value: number; kind: string; memo: string };
// 몸무게 기록 하나 (kg, 소수 한 자리)
export type Weight = { id: string; date: string; at: string; value: number; memo: string };
// 내가 정한 목표: 혈당 범위(mg/dL), 목표 몸무게(kg), 한 주 운동 시간(시간). 정하지 않은 것은 null
export type Goals = { glucose_low: number; glucose_high: number; weight_goal: number | null; move_goal: number | null };
export const NO_GOALS: Goals = { glucose_low: 70, glucose_high: 130, weight_goal: null, move_goal: null };

export const KINDS = ["공복", "식전", "식후 1시간", "식후 2시간", "취침 전", "기타"];
export const SPANS: [string, number][] = [["7일", 7], ["30일", 30], ["90일", 90]];
// 불러오는 날 수. 가장 긴 기간(90일)과, 견줄 때 쓰는 그 앞의 90일
export const KEEP = 180;

type Today = { y: number; m: number; d: number };
// 오늘에서 n일 앞의 날짜 (n 이 0 이면 오늘)
export const dayAgo = (t: Today, n: number) => {
  const d = new Date(t.y, t.m, t.d - n);
  return ymd(d.getFullYear(), d.getMonth(), d.getDate());
};
export const md = (date: string) => `${+date.slice(5, 7)}.${date.slice(8, 10)}`; // "2026-11-26" → "11.26"
// "13:20" → "오후 1:20"
export const clock12 = (at: string) => {
  if (!at) return "";
  const [h, m] = at.split(":").map(Number);
  return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${p2(m)}`;
};
export const nowAt = () => { const n = new Date(); return `${p2(n.getHours())}:${p2(n.getMinutes())}`; };
// 목록에 적는 날짜: 오늘, 어제, 그 밖에는 "11.24"
export const dayName = (date: string, t: Today) => (date === dayAgo(t, 0) ? "오늘" : date === dayAgo(t, 1) ? "어제" : md(date));
// 최근 기록부터 (날짜, 시각 순)
export const newestFirst = <T extends { date: string; at: string }>(rows: T[]) =>
  [...rows].sort((a, b) => (a.date + a.at < b.date + b.at ? 1 : a.date + a.at > b.date + b.at ? -1 : 0));
// 오늘에서 from 일 앞부터 span 일 동안의 기록 (from 이 0 이면 오늘까지의 span 일)
export const within = <T extends { date: string }>(rows: T[], t: Today, span: number, from = 0) => {
  const lo = dayAgo(t, from + span - 1), hi = dayAgo(t, from);
  return rows.filter((r) => r.date >= lo && r.date <= hi);
};
export const mean = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);

// 혈당이 내가 정한 범위의 어디에 있는지
export type Band = "low" | "in" | "high";
export const bandOf = (v: number, g: Goals): Band => (v < g.glucose_low ? "low" : v > g.glucose_high ? "high" : "in");
export const BAND_NAME: Record<Band, string> = { low: "낮음", in: "범위 안", high: "높음" };

// 그래프에 그릴 하루하루. avg 는 그날을 대표하는 값이고, 기록이 없는 날은 null.
// 하루에 여러 번 잰 날은 평균을 내고(혈당), last 를 주면 그날 마지막으로 잰 값을 씁니다(몸무게)
export type Day = { date: string; label: string; values: number[]; avg: number | null };
export function daily(rows: { date: string; at: string; value: number }[], t: Today, span: number, last = false): Day[] {
  const by = new Map<string, { at: string; value: number }[]>();
  rows.forEach((r) => { const a = by.get(r.date); if (a) a.push(r); else by.set(r.date, [r]); });
  return Array.from({ length: span }, (_, i) => {
    const date = dayAgo(t, span - 1 - i);
    const values = [...(by.get(date) ?? [])].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)).map((r) => r.value);
    return { date, label: md(date), values, avg: last ? values[values.length - 1] ?? null : mean(values) };
  });
}

// 건강 기록을 담을 표가 아직 없어서 난 오류인지 (supabase/schema.sql 의 '건강' 부분을 아직 실행하지 않았을 때)
export const noTable = (e: unknown) => e instanceof Error && /schema cache|does not exist|could not find the table/i.test(e.message);
