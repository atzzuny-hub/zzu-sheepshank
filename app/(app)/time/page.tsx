"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/Shell";
import { getChecksOn, getKeyActions, getPlan, getTimelog, saveTimelog, setCheck, type TimeTask } from "@/lib/data";
import { WD, todayParts, ymd } from "@/lib/util";

const START = 4; // 하루가 시작하는 시각 (새벽 4시부터 다음 날 새벽 3시까지)
const PER = 6; // 한 시간을 10분씩 여섯 칸으로
const GREEN = "#5FCB8E", YELLOW = "#FFC533", BLUE = "#8FB8F0", RED = "#FF8F8F", GRAY = "#B9C0C8";
const COLORS = [GREEN, YELLOW, BLUE, RED, GRAY];
// 계획 탭의 영역 이름마다 정해 둔 색. 영역 이름을 바꾸면 여기도 같이 바꿔 주세요.
const AREA_COLORS: Record<string, string> = {
  "건강관리": GREEN,
  "꾸준한성장": YELLOW,
  "경제적성장": BLUE,
  "자기계발": RED,
};
const areaColor = (name: string) => AREA_COLORS[name.replace(/\s/g, "")] ?? GRAY;
const ERASE = "__erase";
const fmt = (cells: number) => {
  const h = Math.floor(cells / PER), m = (cells % PER) * 10;
  return h ? `${h}시간${m ? ` ${m}분` : ""}` : `${m}분`;
};

export default function TimePage() {
  const { uid, queue, setStatus } = useApp();
  const today = useMemo(todayParts, []);
  const [day, setDay] = useState(today);
  const [tasks, setTasks] = useState<TimeTask[]>([]);
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [pen, setPen] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const live = useRef({ tasks, slots });
  const painting = useRef<"paint" | "erase" | null>(null);

  const date = ymd(day.y, day.m, day.d);
  const isToday = day.y === today.y && day.m === today.m && day.d === today.d;

  useEffect(() => {
    let on = true;
    setReady(false);
    Promise.all([getTimelog(date), getChecksOn(date)])
      .then(([r, checked]) => {
        if (!on) return;
        // 노트에서 체크한 것과 맞춥니다: 체크돼 있으면 ✓, 체크가 풀렸으면 ✓ 를 지움
        r.tasks = r.tasks.map((t) => (!t.ref ? t : checked.has(t.ref) ? { ...t, state: 1 } : t.state === 1 ? { ...t, state: 0 } : t));
        live.current = r; setTasks(r.tasks); setSlots(r.slots);
        setPen(r.tasks[0]?.id ?? null); setReady(true);
      })
      .catch(() => on && setStatus("불러오지 못했어요. 새로고침해 보세요."));
    return () => { on = false; };
  }, [date, setStatus]);
  useEffect(() => {
    const stop = () => { painting.current = null; };
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  function commit(next: { tasks?: TimeTask[]; slots?: Record<string, string> }) {
    live.current = { ...live.current, ...next };
    if (next.tasks) setTasks(next.tasks);
    if (next.slots) setSlots(next.slots);
    const snap = live.current;
    queue(`time:${date}`, () => saveTimelog(uid, date, snap.tasks, snap.slots));
  }
  function moveDay(delta: number) {
    const dt = new Date(day.y, day.m, day.d + delta);
    setDay({ y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() });
  }

  /* ----- 할 일 ----- */
  function addTask(input: HTMLInputElement) {
    const text = input.value.trim(); if (!text) return;
    input.value = "";
    const t: TimeTask = { id: Math.random().toString(36).slice(2, 10), text, color: GRAY, state: 0 };
    commit({ tasks: [...live.current.tasks, t] });
    setPen(t.id);
  }
  // 계획 탭에서 별표로 뽑은 지킬 일을 할 일로 가져옵니다. 색은 그 일이 속한 영역의 색을 따릅니다.
  async function importPlan() {
    try {
      const [keys, plan] = await Promise.all([getKeyActions(), getPlan()]);
      const areaName = new Map(plan.areas.map((a) => [a.id, a.name]));
      const colorOf = new Map(keys.map((k) => [k.text.trim(), areaColor(areaName.get(k.area_id ?? "") ?? "")]));
      const refOf = new Map(keys.map((k) => [k.text.trim(), k.id]));
      // 이미 있는 할 일은 색만 영역 색으로 맞추고, 없는 것만 새로 넣습니다
      const kept = live.current.tasks.map((t) => (colorOf.has(t.text.trim()) ? { ...t, color: colorOf.get(t.text.trim())!, ref: refOf.get(t.text.trim()) } : t));
      const have = new Set(kept.map((t) => t.text.trim()));
      const add = keys.filter((k) => k.text.trim() && !have.has(k.text.trim())).map((k): TimeTask => ({
        id: Math.random().toString(36).slice(2, 10), text: k.text.trim(), color: colorOf.get(k.text.trim())!, state: 0, ref: k.id,
      }));
      if (!keys.length) { setStatus("계획에 별표로 뽑은 일이 아직 없어요."); return; }
      commit({ tasks: [...kept, ...add] });
      if (!pen && add[0]) setPen(add[0].id);
    } catch { setStatus("계획을 불러오지 못했어요."); }
  }
  const patchTask = (id: string, p: Partial<TimeTask>) =>
    commit({ tasks: live.current.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) });
  // ✓ 를 바꾸면, 계획에서 온 일은 노트와 메인의 체크도 같이 바뀝니다
  function setState(t: TimeTask, state: 0 | 1 | 2) {
    patchTask(t.id, { state });
    const ref = t.ref;
    if (ref && (state === 1) !== (t.state === 1)) queue(`check:${date}:${ref}`, () => setCheck(uid, date, ref, state === 1));
  }
  // 시간을 칠하면 빈칸이던 일은 ✓ 가 됩니다
  function markDone(id: string) {
    const t = live.current.tasks.find((x) => x.id === id);
    if (t && t.state === 0) setState(t, 1);
  }
  function removeTask(id: string) {
    const s = { ...live.current.slots };
    Object.keys(s).forEach((k) => { if (s[k] === id) delete s[k]; });
    commit({ tasks: live.current.tasks.filter((t) => t.id !== id), slots: s });
    if (pen === id) setPen(null);
  }

  /* ----- 칠하기 ----- */
  function apply(i: number) {
    const cur = live.current.slots[i];
    if (painting.current === "paint" && pen && pen !== ERASE && cur !== pen) { commit({ slots: { ...live.current.slots, [i]: pen } }); markDone(pen); }
    if (painting.current === "erase" && cur) { const s = { ...live.current.slots }; delete s[i]; commit({ slots: s }); }
  }
  function down(i: number) {
    if (!pen) { setStatus("먼저 칠할 일을 골라 주세요."); return; }
    painting.current = pen === ERASE || live.current.slots[i] === pen ? "erase" : "paint";
    apply(i);
  }
  function move(e: React.PointerEvent) {
    if (!painting.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-i]");
    if (el) apply(Number(el.dataset.i));
  }
  function fillHour(r: number) {
    if (!pen) { setStatus("먼저 칠할 일을 골라 주세요."); return; }
    const s = { ...live.current.slots }, idx = Array.from({ length: PER }, (_, c) => r * PER + c);
    const clear = pen === ERASE || idx.every((i) => s[i] === pen);
    idx.forEach((i) => { if (clear) delete s[i]; else s[i] = pen; });
    commit({ slots: s });
    if (!clear) markDone(pen);
  }

  /* ----- 그릴 준비 ----- */
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const at = (i: number) => (byId.has(slots[i]) ? slots[i] : "");
  const totals = new Map<string, number>();
  let used = 0;
  for (let i = 0; i < 24 * PER; i++) { const id = at(i); if (id) { totals.set(id, (totals.get(id) ?? 0) + 1); used++; } }
  // 이어진 덩어리마다 가장 긴 줄에 이름을 한 번만 적습니다
  const labels: Record<number, { col: number; len: number; text: string }[]> = {};
  for (let i = 0; i < 24 * PER; ) {
    const id = at(i); let e = i + 1;
    if (!id) { i = e; continue; }
    while (e < 24 * PER && at(e) === id) e++;
    let best = { row: 0, col: 0, len: 0 };
    for (let s = i; s < e; ) {
      const row = Math.floor(s / PER), end = Math.min(e, (row + 1) * PER);
      if (end - s > best.len) best = { row, col: s % PER, len: end - s };
      s = end;
    }
    if (best.len >= 2) (labels[best.row] ??= []).push({ col: best.col, len: best.len, text: byId.get(id)!.text });
    i = e;
  }
  const penTask = pen && pen !== ERASE ? byId.get(pen) : undefined;
  const nowHour = new Date().getHours();

  return (
    <section>
      <header className="top">
        <div className="month">
          <button className="nav" onClick={() => moveDay(-1)} aria-label="전날">‹</button>
          <h1>{day.m + 1}월 {day.d}일</h1>
          <span className="year">{day.y} {WD[new Date(day.y, day.m, day.d).getDay()]}요일</span>
          <button className="nav" onClick={() => moveDay(1)} aria-label="다음 날">›</button>
        </div>
        <ul className="stats"><li>칠한 시간<b>{fmt(used)}</b></li></ul>
      </header>

      <div className="tm" inert={!ready}>
        <aside className="blk">
          <h2>할 일 <small>색 칸을 누르면 그 색으로 칠합니다</small></h2>
          <ul className="tm-tasks">
            {tasks.map((t) => (
              <li key={t.id}>
                <button type="button" className="tm-box" onClick={() => setState(t, ((t.state + 1) % 3) as 0 | 1 | 2)}
                  aria-label={`${t.text}: ${["표시 없음", "했음", "못 함"][t.state]}`}>{["", "✓", "✕"][t.state]}</button>
                <button type="button" className="tm-chip" style={{ background: t.color }} aria-pressed={pen === t.id}
                  aria-label={`${t.text} 색으로 칠하기`} onClick={() => setPen(t.id)} />
                <input type="text" maxLength={30} value={t.text} aria-label="할 일" onChange={(e) => patchTask(t.id, { text: e.target.value })} />
                <span className="tm-sum">{totals.get(t.id) ? fmt(totals.get(t.id)!) : ""}</span>
                <button type="button" className="idel" aria-label={`${t.text} 지우기`} onClick={() => removeTask(t.id)}>×</button>
              </li>
            ))}
            <li>
              <input type="text" maxLength={30} placeholder="+ 할 일 적기" aria-label="새 할 일"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); addTask(e.currentTarget); } }}
                onBlur={(e) => addTask(e.currentTarget)} />
            </li>
          </ul>
          <button type="button" className="btn tm-import" onClick={importPlan}>계획의 지킬 일 불러오기</button>
          {penTask && (
            <div className="tm-colors" role="group" aria-label={`${penTask.text} 색 바꾸기`}>
              {COLORS.map((c) => (
                <button key={c} type="button" style={{ background: c }} aria-pressed={penTask.color === c} aria-label="이 색으로"
                  onClick={() => patchTask(penTask.id, { color: c })} />
              ))}
            </div>
          )}
        </aside>

        <div>
          <div className="tm-pens" role="group" aria-label="칠할 일 고르기">
            {tasks.map((t) => (
              <button key={t.id} type="button" className="tm-pen" style={{ background: t.color }} aria-pressed={pen === t.id} onClick={() => setPen(t.id)}>
                {t.text || "이름 없음"}
              </button>
            ))}
            <button type="button" className="tm-pen erase" aria-pressed={pen === ERASE} onClick={() => setPen(ERASE)}>지우개</button>
          </div>
          <div className="tm-grid" onPointerMove={move} onPointerCancel={() => { painting.current = null; }}>
            {Array.from({ length: 24 }, (_, r) => {
              const h = (START + r) % 24;
              return (
                <div className="tm-row" key={r}>
                  <button type="button" className={`tm-h${isToday && h === nowHour ? " now" : ""}`} onClick={() => fillHour(r)}
                    aria-label={`${h}시 한 시간 전체 칠하기`}>
                    {h % 12 || 12}{(r === 0 || h === 0 || h === 12) && <small>{h < 12 ? "am" : "pm"}</small>}
                  </button>
                  <div className="tm-cells">
                    {Array.from({ length: PER }, (_, c) => {
                      const i = r * PER + c, id = at(i);
                      return <div key={c} className="tm-cell" data-i={i} style={id ? { background: byId.get(id)!.color } : undefined}
                        onPointerDown={() => down(i)} />;
                    })}
                    {(labels[r] ?? []).map((l) => (
                      <span key={l.col} className="tm-lab" style={{ left: `${(l.col / PER) * 100}%`, width: `${(l.len / PER) * 100}%` }}>{l.text}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}