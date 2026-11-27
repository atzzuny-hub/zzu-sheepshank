"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/Shell";
import { getChecksOn, getKeyActions, getPlan, getTimelog, saveTimelog, setCheck, type TimeTask } from "@/lib/data";
import { WD, p2, todayParts, ymd, type Area } from "@/lib/util";

const START = 4; // 하루가 시작하는 시각 (새벽 4시부터 다음 날 새벽 3시까지)
const PER = 6; // 한 시간을 10분씩 여섯 칸으로
const ALL = 24 * PER; // 하루의 칸 수
const NEXT = (24 - START) * PER; // 이 칸부터는 다음 날 새벽입니다
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
// 집중 시간으로 세는 영역. 이 영역의 색으로 적은 시간을 집중 시간으로 봅니다
const FOCUS_AREA = "자기계발", FOCUS = areaColor(FOCUS_AREA);
const RING = 2 * Math.PI * 46; // 시간 통계 고리의 둘레 (반지름 46)
const ERASE = "__erase";
const fmt = (cells: number) => {
  const h = Math.floor(cells / PER), m = (cells % PER) * 10;
  return h ? `${h}시간${m ? ` ${m}분` : ""}` : `${m}분`;
};
// 하루치 기록에서 집중 시간으로 세는 칸의 수 (집중 영역의 색으로 적은 칸)
function focusCells(tasks: TimeTask[], slots: Record<string, string>) {
  const focus = new Set(tasks.filter((t) => t.color === FOCUS).map((t) => t.id));
  return Object.values(slots).filter((id) => focus.has(id)).length;
}
const hourOf = (i: number) => (START + Math.floor(i / PER)) % 24;
const clock = (i: number) => `${p2(hourOf(i))}:${p2((i % PER) * 10)}`; // 칸 번호를 07:30 같은 시각으로
type Block = { id: string; from: number; len: number }; // 같은 일로 이어진 칸 한 덩어리
type Form = { task: string; from: number; len: number; orig?: Block }; // 폰에서 적거나 고치는 기록 하나

export default function TimePage() {
  const { uid, queue, setStatus } = useApp();
  const today = useMemo(todayParts, []);
  const [day, setDay] = useState(today);
  const [tasks, setTasks] = useState<TimeTask[]>([]);
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [pen, setPen] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  // 맨 위 요약에 쓰는 것들: 그날 체크한 지킬 일, 전날의 집중 시간(칸 수), 계획의 영역과 지킬 일
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [prevFocus, setPrevFocus] = useState(0);
  const [plan, setPlan] = useState<{ areas: Area[]; keys: string[] }>({ areas: [], keys: [] });
  const live = useRef({ tasks, slots });
  const painting = useRef<"paint" | "erase" | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);

  const date = ymd(day.y, day.m, day.d);
  const isToday = day.y === today.y && day.m === today.m && day.d === today.d;

  useEffect(() => {
    let on = true;
    setReady(false);
    const before = new Date(day.y, day.m, day.d - 1); // 집중 시간을 견줄 전날
    Promise.all([getTimelog(date), getChecksOn(date), getTimelog(ymd(before.getFullYear(), before.getMonth(), before.getDate()))])
      .then(([r, done, prev]) => {
        if (!on) return;
        // 노트에서 체크한 것과 맞춥니다: 체크돼 있으면 ✓, 체크가 풀렸으면 ✓ 를 지움
        r.tasks = r.tasks.map((t) => (!t.ref ? t : done.has(t.ref) ? { ...t, state: 1 } : t.state === 1 ? { ...t, state: 0 } : t));
        live.current = r; setTasks(r.tasks); setSlots(r.slots);
        setChecked(done); setPrevFocus(focusCells(prev.tasks, prev.slots));
        setPen(r.tasks[0]?.id ?? null); setReady(true);
      })
      .catch(() => on && setStatus("불러오지 못했어요. 새로고침해 보세요."));
    return () => { on = false; };
  }, [date, day, setStatus]);
  // 영역 이름과 지킬 일의 수는 맨 위 요약에만 쓰여서, 못 불러와도 화면을 막지 않습니다
  useEffect(() => {
    let on = true;
    getPlan()
      .then((p) => { if (on) setPlan({ areas: p.areas, keys: p.actions.filter((a) => a.is_key).map((a) => a.id) }); })
      .catch(() => {});
    return () => { on = false; };
  }, []);
  useEffect(() => {
    const stop = () => { painting.current = null; };
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);
  // 다른 화면으로 옮기면 열려 있던 기록 창은 닫아 둡니다
  useLayoutEffect(() => {
    const d = dlg.current;
    return () => d?.close();
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
  // 입력 칸에 적은 이름으로 할 일을 만들고, 만든 일의 id 를 돌려줍니다 (빈칸이면 만들지 않음)
  function addTask(input: HTMLInputElement) {
    const text = input.value.trim(); if (!text) return null;
    input.value = "";
    const t: TimeTask = { id: Math.random().toString(36).slice(2, 10), text, color: GRAY, state: 0 };
    commit({ tasks: [...live.current.tasks, t] });
    setPen(t.id);
    return t.id;
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
    if (ref && (state === 1) !== (t.state === 1)) {
      setChecked((p) => { const s = new Set(p); if (state === 1) s.add(ref); else s.delete(ref); return s; });
      queue(`check:${date}:${ref}`, () => setCheck(uid, date, ref, state === 1));
    }
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
  for (let i = 0; i < ALL; i++) { const id = at(i); if (id) { totals.set(id, (totals.get(id) ?? 0) + 1); used++; } }
  // 같은 일로 이어진 칸을 한 덩어리로 묶습니다. 폰의 기록 목록과 시간표의 이름표가 같이 씁니다
  const blocks: Block[] = [];
  for (let i = 0; i < ALL; ) {
    const id = at(i); let e = i + 1;
    if (id) { while (e < ALL && at(e) === id) e++; blocks.push({ id, from: i, len: e - i }); }
    i = e;
  }
  // 덩어리마다 가장 긴 줄에 이름을 한 번만 적습니다
  const labels: Record<number, { col: number; len: number; text: string }[]> = {};
  for (const b of blocks) {
    let best = { row: 0, col: 0, len: 0 };
    for (let s = b.from, e = b.from + b.len; s < e; ) {
      const row = Math.floor(s / PER), end = Math.min(e, (row + 1) * PER);
      if (end - s > best.len) best = { row, col: s % PER, len: end - s };
      s = end;
    }
    if (best.len >= 2) (labels[best.row] ??= []).push({ col: best.col, len: best.len, text: byId.get(b.id)!.text });
  }
  const penTask = pen && pen !== ERASE ? byId.get(pen) : undefined;
  const nowHour = new Date().getHours();

  /* ----- 맨 위 요약 ----- */
  const doneKeys = plan.keys.filter((id) => checked.has(id)).length; // 그날 지킨 일의 수
  const focus = tasks.reduce((n, t) => n + (t.color === FOCUS ? totals.get(t.id) ?? 0 : 0), 0);
  const gain = focus - prevFocus; // 전날보다 늘어난 집중 시간 (칸 수)
  // 시간 통계는 색으로 묶습니다. 색의 이름은 그 색을 쓰는 영역의 이름이고, 회색과 주인 없는 색은 기타입니다
  const nameOf = (color: string) => (color === GRAY ? "기타"
    : plan.areas.find((a) => areaColor(a.name) === color)?.name || Object.keys(AREA_COLORS).find((k) => AREA_COLORS[k] === color) || "기타");
  const byColor = new Map<string, number>(COLORS.map((c) => [c, 0]));
  tasks.forEach((t) => byColor.set(t.color, (byColor.get(t.color) ?? 0) + (totals.get(t.id) ?? 0)));
  let turned = 0; // 고리에서 앞의 조각들이 차지한 길이
  const pie = [...byColor].filter(([, cells]) => cells).map(([color, cells]) => {
    const len = (cells / used) * RING, part = { color, cells, name: nameOf(color), len, off: turned };
    turned += len;
    return part;
  });

  /* ----- 폰: 칸을 칠하는 대신 시작 시각과 길이로 적기 ----- */
  // 새 기록은 앞의 기록이 끝난 시각에서 이어 적습니다 (오늘은 지금보다 앞선 기록 가운데 마지막 것).
  // 이어 적을 기록이 없으면 오늘은 30분 전부터, 다른 날은 9시부터 시작합니다
  function openAdd() {
    const now = new Date(), nowAt = ((now.getHours() - START + 24) % 24) * PER + Math.floor(now.getMinutes() / 10);
    const prev = [...blocks].reverse().find((b) => !isToday || b.from + b.len <= nowAt + 1);
    const from = prev ? prev.from + prev.len : isToday ? Math.max(0, nowAt - 3) : (9 - START) * PER;
    const at0 = Math.min(from, ALL - 1);
    setForm({ task: penTask?.id ?? tasks[0]?.id ?? "", from: at0, len: Math.min(3, ALL - at0) });
    dlg.current?.showModal();
  }
  function openEdit(b: Block) { setForm({ task: b.id, from: b.from, len: b.len, orig: b }); dlg.current?.showModal(); }
  const setFrom = (from: number) => setForm((f) => f && { ...f, from, len: Math.min(f.len, ALL - from) });
  const setLen = (len: number) => setForm((f) => f && { ...f, len: Math.max(1, Math.min(len, ALL - f.from)) });
  // 고칠 때는 먼저 원래 자리의 칸을 비우고, 새 자리를 채웁니다
  function clearOrig(s: Record<string, string>, o: Block) {
    for (let i = o.from; i < o.from + o.len; i++) if (s[i] === o.id) delete s[i];
  }
  function saveBlock() {
    if (!form?.task) return;
    const s = { ...live.current.slots };
    if (form.orig) clearOrig(s, form.orig);
    for (let i = form.from; i < form.from + form.len; i++) s[i] = form.task;
    commit({ slots: s }); markDone(form.task);
    dlg.current?.close();
  }
  function removeBlock() {
    if (!form?.orig) return;
    const s = { ...live.current.slots };
    clearOrig(s, form.orig);
    commit({ slots: s });
    dlg.current?.close();
  }
  // 고른 시간에 이미 다른 일의 기록이 있으면 그 일들의 이름 (저장하면 그 부분이 덮입니다)
  const inOrig = (i: number) => !!form?.orig && i >= form.orig.from && i < form.orig.from + form.orig.len;
  const clash = !form ? [] : [...new Set(
    Array.from({ length: form.len }, (_, k) => form.from + k)
      .filter((i) => !inOrig(i)).map(at).filter((id) => id && id !== form.task)
      .map((id) => byId.get(id)!.text || "이름 없음"),
  )];

  return (
    <section>
      <header className="top">
        <div className="month">
          <button className="nav" onClick={() => moveDay(-1)} aria-label="전날">‹</button>
          <h1>{day.m + 1}월 {day.d}일</h1>
          <span className="year">{day.y} {WD[new Date(day.y, day.m, day.d).getDay()]}요일</span>
          <button className="nav" onClick={() => moveDay(1)} aria-label="다음 날">›</button>
        </div>
      </header>

      {/* 맨 위 요약: 그날 지킨 일, 집중 시간(전날과 견줌), 무엇에 시간을 썼는지 */}
      <div className="tm-stats" inert={!ready}>
        <section className="blk">
          <h2>{isToday ? "오늘 실천" : "이날 실천"}</h2>
          <p className="tm-big">{doneKeys}<small>/ {plan.keys.length}</small></p>
          <div className="pbar" aria-hidden="true"><i style={{ width: `${plan.keys.length ? (doneKeys / plan.keys.length) * 100 : 0}%` }} /></div>
        </section>
        <section className="blk">
          <h2>집중 시간 <small>{FOCUS_AREA}</small></h2>
          <p className="tm-big">
            {fmt(focus)}
            {gain !== 0 && (
              <span className={`tm-gain${gain < 0 ? " down" : ""}`} aria-label={`전날보다 ${fmt(Math.abs(gain))} ${gain > 0 ? "더" : "덜"}`}>
                {gain > 0 ? "▲ +" : "▼ −"}{fmt(Math.abs(gain))}
              </span>
            )}
          </p>
        </section>
        <section className="blk tm-pie">
          <h2>시간 통계</h2>
          <div className="tm-donut" role="img" aria-label={pie.length ? `모두 ${fmt(used)}. ${pie.map((p) => `${p.name} ${fmt(p.cells)}`).join(", ")}` : "기록 없음"}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="bg" cx="60" cy="60" r="46" />
              {pie.map((p) => <circle key={p.color} cx="60" cy="60" r="46" stroke={p.color} strokeDasharray={`${p.len} ${RING}`} strokeDashoffset={-p.off} />)}
            </svg>
            <span>{used ? <>총<br />{fmt(used)}</> : "기록 없음"}</span>
          </div>
          <ul className="tm-legend">
            {pie.map((p) => (
              <li key={p.color}>
                <i style={{ background: p.color }} /><span className="nm">{p.name}</span>
                <span className="t">{fmt(p.cells)}</span><span className="p">{Math.round((p.cells / used) * 100)}%</span>
              </li>
            ))}
            {!pie.length && <li className="none">적은 시간이 영역의 색별로 여기에 모여요</li>}
          </ul>
        </section>
      </div>

      <div className="tm" inert={!ready}>
        {/* 폰(860px 미만): 시간표를 칠하는 대신, 한 일을 시작 시각과 길이로 적고 목록으로 봅니다 */}
        <section className="blk tm-log">
          <h2>기록 <small>{blocks.length ? `${blocks.length}개` : "한 일을 시작 시각과 길이로 적어요"}</small></h2>
          {blocks.length > 0 && (
            <ol className="tm-line">
              {blocks.map((b) => {
                const name = byId.get(b.id)!.text || "이름 없음";
                return (
                  <li key={b.from}>
                    <button type="button" onClick={() => openEdit(b)} aria-label={`${clock(b.from)}부터 ${fmt(b.len)}, ${name}. 눌러서 고치기`}>
                      <time>{clock(b.from)}{b.from >= NEXT && <small>다음 날</small>}</time>
                      <i style={{ background: byId.get(b.id)!.color }} />
                      <span className="nm">{name}</span>
                      <span className="len">{fmt(b.len)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          <button type="button" className="btn tm-add" onClick={openAdd}>+ 기록 추가</button>
        </section>

        <aside className="blk">
          <h2>할 일 <small className="w-hint">색 칸을 누르면 그 색으로 칠합니다</small><small className="p-hint">색 칸을 누르면 색을 바꿀 수 있어요</small></h2>
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

      <dialog ref={dlg} className="tm-sheet" aria-label={form?.orig ? "기록 고치기" : "기록 추가"} onClose={() => setForm(null)}
        onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
        {form && (
          <div className="tm-form">
            <h2>{form.orig ? "기록 고치기" : "기록 추가"}</h2>
            <p className="lbl">한 일</p>
            <div className="tm-chips" role="group" aria-label="한 일 고르기">
              {tasks.map((t) => (
                <button key={t.id} type="button" className="tm-pen" style={{ background: t.color }} aria-pressed={form.task === t.id}
                  onClick={() => setForm({ ...form, task: t.id })}>{t.text || "이름 없음"}</button>
              ))}
            </div>
            <input type="text" maxLength={30} placeholder="+ 새 할 일 적기" aria-label="새 할 일"
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                e.preventDefault();
                const id = addTask(e.currentTarget);
                if (id) setForm((f) => f && { ...f, task: id });
              }}
              onBlur={(e) => { const id = addTask(e.currentTarget); if (id) setForm((f) => f && { ...f, task: id }); }} />
            <p className="lbl">시작</p>
            <div className="tm-when">
              <select aria-label="시작하는 시" value={Math.floor(form.from / PER)} onChange={(e) => setFrom(Number(e.target.value) * PER + (form.from % PER))}>
                {Array.from({ length: 24 }, (_, r) => <option key={r} value={r}>{p2(hourOf(r * PER))}시{r * PER >= NEXT ? " (다음 날)" : ""}</option>)}
              </select>
              <select aria-label="시작하는 분" value={form.from % PER} onChange={(e) => setFrom(form.from - (form.from % PER) + Number(e.target.value))}>
                {Array.from({ length: PER }, (_, c) => <option key={c} value={c}>{p2(c * 10)}분</option>)}
              </select>
            </div>
            <p className="lbl">길이 <b>{fmt(form.len)}</b><span>{clock(form.from)} ~ {form.from + form.len >= ALL ? "끝" : clock(form.from + form.len)}</span></p>
            <div className="tm-len">
              <button type="button" aria-label="10분 줄이기" disabled={form.len <= 1} onClick={() => setLen(form.len - 1)}>−</button>
              {[1, 3, 6, 12].map((n) => (
                <button key={n} type="button" aria-pressed={form.len === n} onClick={() => setLen(n)}>{fmt(n)}</button>
              ))}
              <button type="button" aria-label="10분 늘리기" disabled={form.from + form.len >= ALL} onClick={() => setLen(form.len + 1)}>+</button>
            </div>
            {clash.length > 0 && <p className="msg" role="status">이 시간에 이미 {clash.join(", ")} 기록이 있어요. 저장하면 겹치는 부분이 이 기록으로 바뀌어요.</p>}
            <div className="dlg-actions">
              {form.orig ? <button type="button" className="btn" onClick={removeBlock}>지우기</button> : <span />}
              <span className="end">
                <button type="button" className="btn" onClick={() => dlg.current?.close()}>취소</button>
                <button type="button" className="btn primary" disabled={!form.task} onClick={saveBlock}>저장</button>
              </span>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}