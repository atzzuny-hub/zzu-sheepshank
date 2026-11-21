import { sb, ok } from "./supabase";
import { ymd, ym, daysIn, type Area, type Action, type Journal } from "./util";

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

/* ---------- 모멘텀 ---------- */
export async function getJournal(date: string): Promise<Journal> {
  const r = await ok(sb().from("journals").select("pour,listen,teach").eq("date", date).maybeSingle());
  return { pour: r?.pour ?? "", listen: r?.listen ?? "", teach: r?.teach ?? "" };
}
export const saveJournal = (uid: string, date: string, j: Journal) =>
  j.pour.trim() || j.listen.trim() || j.teach.trim()
    ? ok(sb().from("journals").upsert({ user_id: uid, date, ...j, updated_at: new Date().toISOString() }))
    : ok(sb().from("journals").delete().eq("date", date));


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