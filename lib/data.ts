import { sb, ok } from "./supabase";
import { ymd, ym, daysIn, type Area, type Action, type Journal } from "./util";
import { NO_GOALS, type Glucose, type Goals, type Weight } from "./health";

/* ---------- 계획 ---------- */
export async function getPlan() {
  const [areas, actions, settings] = await Promise.all([
    ok(sb().from("areas").select("id,name,sort").order("sort").order("created_at")),
    ok(sb().from("actions").select("id,area_id,text,is_key,sort").order("sort").order("created_at")),
    ok(sb().from("settings").select("future_date").maybeSingle()),
  ]);
  return {
    areas: (areas ?? []) as Area[],
    actions: (actions ?? []) as Action[],
    future: (settings?.future_date as string | null) ?? "",
  };
}
export async function getKeyActions() {
  const rows = await ok(
    sb().from("actions").select("id,area_id,text,is_key,sort").eq("is_key", true).order("key_sort").order("created_at"),
  );
  return (rows ?? []) as Action[];
}
export const saveFuture = (uid: string, date: string) =>
  date
    ? ok(sb().from("settings").upsert({ user_id: uid, future_date: date }))
    : ok(sb().from("settings").delete().eq("user_id", uid));


export const addArea = async (sort: number) =>
  (await ok(sb().from("areas").insert({ name: "", sort }).select("id,name,sort").single())) as Area;
export const renameArea = (id: string, name: string) => ok(sb().from("areas").update({ name }).eq("id", id));
export const deleteArea = (id: string) => ok(sb().from("areas").delete().eq("id", id));
export const addAction = async (area_id: string, text: string, sort: number) =>
  (await ok(
    sb().from("actions").insert({ area_id, text, sort }).select("id,area_id,text,is_key,sort").single(),
  )) as Action;
export const saveKeyOrder = (ids: string[]) =>
  Promise.all(ids.map((id, i) => ok(sb().from("actions").update({ key_sort: i + 1 }).eq("id", id))));
export const updateAction = (id: string, patch: { text?: string; is_key?: boolean; key_sort?: number }) =>
  ok(sb().from("actions").update(patch).eq("id", id));
export const deleteAction = (id: string) => ok(sb().from("actions").delete().eq("id", id));

/* ---------- 노트 (한 달) ---------- */
export async function getMonth(y: number, m: number) {
  const from = ymd(y, m, 1), to = ymd(y, m, daysIn(y, m));
  const [days, checks, month] = await Promise.all([
    ok(sb().from("days").select("date,note").gte("date", from).lte("date", to)),
    ok(sb().from("checks").select("date,action_id").gte("date", from).lte("date", to)),
    ok(sb().from("months").select("phrase").eq("ym", ym(y, m)).maybeSingle()),
  ]);
  const notes: Record<number, string> = {};
  (days ?? []).forEach((r) => { notes[+String(r.date).slice(8, 10)] = r.note as string; });
  const set = new Set<string>();
  (checks ?? []).forEach((r) => set.add(`${+String(r.date).slice(8, 10)}|${r.action_id}`));
  return { notes, checks: set, phrase: (month?.phrase as string | undefined) ?? "" };
}
export const saveNote = (uid: string, date: string, note: string) =>
  note.trim()
    ? ok(sb().from("days").upsert({ user_id: uid, date, note }))
    : ok(sb().from("days").delete().eq("date", date));


export const savePhrase = (uid: string, key: string, phrase: string) =>
  phrase.trim()
    ? ok(sb().from("months").upsert({ user_id: uid, ym: key, phrase }))
    : ok(sb().from("months").delete().eq("ym", key));

export const setCheck = (uid: string, date: string, action_id: string, on: boolean) =>
  on
    ? ok(sb().from("checks").upsert({ user_id: uid, date, action_id }))
    : ok(sb().from("checks").delete().eq("date", date).eq("action_id", action_id));

// 날짜 구간에 체크된 지킬 일을 "2026-11-27|<지킬 일 id>" 꼴로 모읍니다. 메인의 오늘 할 일과 실천 그래프에 씁니다.
// 한 번에 받을 수 있는 줄 수가 1000줄이라, 그보다 많으면 이어서 더 받습니다
export async function getChecksBetween(from: string, to: string) {
  const PAGE = 1000, set = new Set<string>();
  for (let at = 0; ; at += PAGE) {
    const rows = await ok(
      sb().from("checks").select("date,action_id").gte("date", from).lte("date", to).order("date").order("action_id").range(at, at + PAGE - 1),
    );
    (rows ?? []).forEach((r) => set.add(`${r.date}|${r.action_id}`));
    if (!rows || rows.length < PAGE) return set;
  }
}

/* ---------- 모멘텀 ---------- */
export async function getJournal(date: string): Promise<Journal> {
  const r = await ok(sb().from("journals").select("pour,listen,teach").eq("date", date).maybeSingle());
  return { pour: r?.pour ?? "", listen: r?.listen ?? "", teach: r?.teach ?? "" };
}
export const saveJournal = (uid: string, date: string, j: Journal) =>
  j.pour.trim() || j.listen.trim() || j.teach.trim()
    ? ok(sb().from("journals").upsert({ user_id: uid, date, ...j, updated_at: new Date().toISOString() }))
    : ok(sb().from("journals").delete().eq("date", date));

// 가장 최근에 모멘텀 글을 쓴 날들 (최근 날짜부터 몇 개만). 모멘텀 화면 아래의 목록에 씁니다.
export async function getRecentJournals(limit: number): Promise<(Journal & { date: string })[]> {
  const rows = await ok(sb().from("journals").select("date,pour,listen,teach").order("date", { ascending: false }).limit(limit));
  return (rows ?? []).map((r) => ({ date: String(r.date), pour: r.pour ?? "", listen: r.listen ?? "", teach: r.teach ?? "" }));
}

/* ---------- 시간 ---------- */
export type TimeTask = { id: string; text: string; color: string; state: 0 | 1 | 2; ref?: string };
export async function getTimelog(date: string) {
  const r = await ok(sb().from("timelogs").select("tasks,slots").eq("date", date).maybeSingle());
  return { tasks: (r?.tasks ?? []) as TimeTask[], slots: (r?.slots ?? {}) as Record<string, string> };
}
export const saveTimelog = (uid: string, date: string, tasks: TimeTask[], slots: Record<string, string>) =>
  tasks.length || Object.keys(slots).length
    ? ok(sb().from("timelogs").upsert({ user_id: uid, date, tasks, slots, updated_at: new Date().toISOString() }))
    : ok(sb().from("timelogs").delete().eq("date", date));

// 그날 노트에 체크된 지킬 일의 id 들
export async function getChecksOn(date: string) {
  const rows = await ok(sb().from("checks").select("action_id").eq("date", date));
  return new Set((rows ?? []).map((r) => r.action_id as string));
}
// 날짜 구간의 시간 기록 (날짜순). 건강 화면이 운동 시간을 셀 때 씁니다
export async function getTimelogs(from: string, to: string) {
  const rows = await ok(sb().from("timelogs").select("date,tasks,slots").gte("date", from).lte("date", to).order("date"));
  return (rows ?? []).map((r) => ({ date: String(r.date), tasks: (r.tasks ?? []) as TimeTask[], slots: (r.slots ?? {}) as Record<string, string> }));
}

/* ---------- 건강 ---------- */
// 되고 싶은 날 (메인과 건강의 D-day 에 씁니다). 정하지 않았으면 빈칸
export async function getFuture() {
  const r = await ok(sb().from("settings").select("future_date").maybeSingle());
  return (r?.future_date as string | null) ?? "";
}
export async function getGlucose(from: string, to: string): Promise<Glucose[]> {
  const rows = await ok(sb().from("glucose").select("id,date,at,value,kind,memo").gte("date", from).lte("date", to).order("date").order("at").limit(5000));
  return (rows ?? []).map((r) => ({ id: r.id as string, date: String(r.date), at: r.at ?? "", value: Number(r.value), kind: r.kind ?? "", memo: r.memo ?? "" }));
}
// 새 기록을 넣고, 데이터베이스가 지어 준 id 를 돌려줍니다
async function insertRow(table: "glucose" | "weights", row: object) {
  const r = await ok(sb().from(table).insert(row).select("id").single());
  if (!r) throw new Error("저장한 줄을 돌려받지 못했습니다");
  return r.id as string;
}
export const addGlucose = (g: Omit<Glucose, "id">) => insertRow("glucose", g);
export const updateGlucose = (id: string, g: Omit<Glucose, "id">) => ok(sb().from("glucose").update(g).eq("id", id));
export const deleteGlucose = (id: string) => ok(sb().from("glucose").delete().eq("id", id));

export async function getWeights(from: string, to: string): Promise<Weight[]> {
  const rows = await ok(sb().from("weights").select("id,date,at,value,memo").gte("date", from).lte("date", to).order("date").order("at").limit(5000));
  return (rows ?? []).map((r) => ({ id: r.id as string, date: String(r.date), at: r.at ?? "", value: Number(r.value), memo: r.memo ?? "" }));
}
export const addWeight = (w: Omit<Weight, "id">) => insertRow("weights", w);
export const updateWeight = (id: string, w: Omit<Weight, "id">) => ok(sb().from("weights").update(w).eq("id", id));
export const deleteWeight = (id: string) => ok(sb().from("weights").delete().eq("id", id));

export async function getGoals(): Promise<Goals> {
  const r = await ok(sb().from("health_goals").select("glucose_low,glucose_high,weight_goal,move_goal").maybeSingle());
  if (!r) return NO_GOALS;
  return {
    glucose_low: Number(r.glucose_low), glucose_high: Number(r.glucose_high),
    weight_goal: r.weight_goal == null ? null : Number(r.weight_goal), move_goal: r.move_goal == null ? null : Number(r.move_goal),
  };
}
export const saveGoals = (uid: string, g: Goals) => ok(sb().from("health_goals").upsert({ user_id: uid, ...g }));

export async function getHealthNote(date: string) {
  const r = await ok(sb().from("health_notes").select("note").eq("date", date).maybeSingle());
  return (r?.note as string | undefined) ?? "";
}
export const saveHealthNote = (uid: string, date: string, note: string) =>
  note.trim()
    ? ok(sb().from("health_notes").upsert({ user_id: uid, date, note }))
    : ok(sb().from("health_notes").delete().eq("date", date));
