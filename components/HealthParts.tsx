"use client";
// 건강 화면 세 곳(건강, 혈당 상세, 몸무게 상세)이 같이 쓰는 것들: 기록을 불러오고 고치는 일, 기록 창, 목표 창
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "@/components/Shell";
import { addGlucose, addWeight, deleteGlucose, deleteWeight, getGlucose, getWeights, updateGlucose, updateWeight } from "@/lib/data";
import { KEEP, KINDS, dayAgo, noTable, nowAt, type Glucose, type Goals, type Weight } from "@/lib/health";

type Today = { y: number; m: number; d: number };
type Api<T> = {
  get: (from: string, to: string) => Promise<T[]>; add: (r: Omit<T, "id">) => Promise<string>;
  update: (id: string, r: Omit<T, "id">) => Promise<unknown>; del: (id: string) => Promise<unknown>;
};

// 기록 한 가지를 불러오고, 더하고, 고치고, 지웁니다. 저장이 끝난 뒤에 화면에 반영하고, 잘 됐는지를 돌려줍니다.
// rows 가 null 이면 아직 불러오는 중, missing 이면 기록을 담을 표가 아직 없는 것
function useRecords<T extends { id: string }>(t: Today, api: Api<T>) {
  const { setStatus } = useApp();
  const [rows, setRows] = useState<T[] | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let live = true;
    api.get(dayAgo(t, KEEP - 1), dayAgo(t, 0))
      .then((r) => { if (live) { setRows(r); setMissing(false); } })
      .catch((e) => { if (!live) return; if (noTable(e)) setMissing(true); else setStatus("불러오지 못했어요. 새로고침해 보세요."); });
    return () => { live = false; };
  }, [t, api, setStatus]);
  async function save(r: Omit<T, "id">, id?: string) {
    try {
      if (id) { await api.update(id, r); setRows((p) => (p ?? []).map((x) => (x.id === id ? ({ ...r, id } as T) : x))); }
      else { const nid = await api.add(r); setRows((p) => [...(p ?? []), { ...r, id: nid } as T]); }
      setStatus("저장됨");
      return true;
    } catch { setStatus("저장하지 못했어요. 다시 해 보세요."); return false; }
  }
  async function remove(id: string) {
    try { await api.del(id); setRows((p) => (p ?? []).filter((x) => x.id !== id)); setStatus("저장됨"); return true; }
    catch { setStatus("지우지 못했어요. 다시 해 보세요."); return false; }
  }
  return { rows, missing, save, remove };
}
const GLUCOSE: Api<Glucose> = { get: getGlucose, add: addGlucose, update: updateGlucose, del: deleteGlucose };
const WEIGHTS: Api<Weight> = { get: getWeights, add: addWeight, update: updateWeight, del: deleteWeight };
export const useGlucose = (t: Today) => useRecords(t, GLUCOSE);
export const useWeights = (t: Today) => useRecords(t, WEIGHTS);

// 기록을 담을 표가 아직 없을 때 보여 주는 안내
export function Missing() {
  return (
    <section className="blk he-missing">
      <h2>건강 기록을 담을 표가 아직 없어요</h2>
      <p>Supabase 대시보드의 SQL Editor를 열고, 이 프로젝트의 <code>supabase/schema.sql</code> 파일에서 <b>“건강”</b> 줄부터 끝까지를 붙여 넣은 뒤 Run을 눌러 주세요. 한 번만 하면 됩니다.</p>
      <p>실행한 뒤 이 화면을 새로고침하면 혈당과 몸무게를 적을 수 있어요.</p>
    </section>
  );
}

// 아래에서 올라오는 창. open 이 참이면 열고, 다른 화면으로 옮기면 닫아 둡니다
function Sheet({ open, label, onClose, children }: { open: boolean; label: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  useLayoutEffect(() => {
    const d = ref.current;
    return () => d?.close();
  }, []);
  return (
    // 닫혔다는 알림은 조금 늦게 옵니다. 그 사이에 창을 다시 열었다면(저장하자마자 다른 줄을 누른 때) 그 알림은 흘려보냅니다
    <dialog ref={ref} className="tm-sheet" aria-label={label} onClose={(e) => { if (!e.currentTarget.open) onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
      {open && <div className="tm-form he-form">{children}</div>}
    </dialog>
  );
}

// 마우스를 쓰는 화면에서는 창이 열리면 바로 숫자를 칠 수 있게 커서를 놓습니다 (폰에서는 누를 때 키보드가 올라오도록 그대로 둡니다)
function useFocusOnOpen() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (window.matchMedia("(hover: hover)").matches) ref.current?.focus(); }, []);
  return ref;
}
// 날짜와 시각을 고르는 줄. 내일 이후는 고를 수 없습니다
function When({ date, at, today, onDate, onAt }: { date: string; at: string; today: string; onDate: (v: string) => void; onAt: (v: string) => void }) {
  return (
    <div className="he-when">
      <input type="date" aria-label="잰 날" value={date} max={today} onChange={(e) => onDate(e.target.value)} />
      <input type="time" aria-label="잰 시각" value={at} onChange={(e) => onAt(e.target.value)} />
    </div>
  );
}
// 저장이나 지우기를 한 번에 하나씩만 하게 하고(두 번 눌러 두 줄이 생기지 않게), 잘 되면 창을 닫습니다.
// 창이 떠 있는 동안에는 화면 구석의 저장 상태가 가려지므로, 실패는 창 안에서 알립니다
function useSubmit(onClose: () => void) {
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(false);
  const lock = useRef(false); // 화면이 다시 그려지기 전에 연달아 눌려도 한 번만 받습니다
  async function run(job: () => Promise<boolean>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setFail(false);
    if (await job()) onClose();
    else { lock.current = false; setFail(true); setBusy(false); }
  }
  return { busy, fail, run };
}
// 창 아래의 단추 줄. 고칠 때는 왼쪽에 지우기(한 번 더 눌러야 지워집니다)
function Actions({ id, ok, busy, fail, onCancel, onSave, onDelete }: {
  id?: string; ok: boolean; busy: boolean; fail: boolean; onCancel: () => void; onSave: () => void; onDelete?: (id: string) => void;
}) {
  const [sure, setSure] = useState(false);
  return (
    <>
      {fail && <p className="msg" role="alert">저장하지 못했어요. 연결을 확인하고 다시 눌러 주세요.</p>}
      <div className="dlg-actions">
        {id && onDelete ? (
          <button type="button" className={`btn${sure ? " he-sure" : ""}`} disabled={busy} onClick={() => (sure ? onDelete(id) : setSure(true))} onBlur={() => setSure(false)}>
            {sure ? "정말 지우기" : "지우기"}
          </button>
        ) : <span />}
        <span className="end">
          <button type="button" className="btn" onClick={onCancel}>취소</button>
          <button type="button" className="btn primary" disabled={!ok || busy} onClick={onSave}>{busy ? "저장 중…" : "저장"}</button>
        </span>
      </div>
    </>
  );
}
const validDay = (date: string, today: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today;

// form 이 null 이면 닫힌 것, { record } 면 그 기록을 고치는 것, {} 면 새로 적는 것.
// save 와 remove 는 잘 됐는지를 돌려줍니다 (useGlucose, useWeights 의 것을 그대로 넘기면 됩니다)
type SheetProps<T> = {
  form: { record?: T } | null; today: string; onClose: () => void;
  save: (r: Omit<T, "id">, id?: string) => Promise<boolean>; remove: (id: string) => Promise<boolean>;
};

/* ----- 혈당 기록 창 ----- */
export function GlucoseSheet({ form, ...rest }: SheetProps<Glucose>) {
  return (
    <Sheet open={!!form} label={form?.record ? "혈당 기록 고치기" : "혈당 기록"} onClose={rest.onClose}>
      {form && <GlucoseForm record={form.record} {...rest} />}
    </Sheet>
  );
}
function GlucoseForm({ record, today, onClose, save: put, remove }: { record?: Glucose } & Omit<SheetProps<Glucose>, "form">) {
  const [kind, setKind] = useState(record?.kind ?? "");
  const [value, setValue] = useState(record ? String(record.value) : "");
  const [date, setDate] = useState(record?.date ?? today);
  const [at, setAt] = useState(record?.at ?? nowAt());
  const [memo, setMemo] = useState(record?.memo ?? "");
  const num = useFocusOnOpen();
  const { busy, fail, run } = useSubmit(onClose);
  const v = Number(value), ok = /^\d{2,3}$/.test(value) && v >= 10 && validDay(date, today);
  const save = () => { if (ok) run(() => put({ date, at, value: v, kind, memo: memo.trim() }, record?.id)); };
  return (
    <>
      <h2>{record ? "혈당 기록 고치기" : "혈당 기록"}</h2>
      <p className="lbl">잰 때</p>
      <div className="he-kinds" role="group" aria-label="잰 때 고르기">
        {KINDS.map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(kind === k ? "" : k)}>{k}</button>)}
      </div>
      <p className="lbl">혈당 수치</p>
      <label className="he-big">
        <input ref={num} type="text" inputMode="numeric" maxLength={3} placeholder="0" aria-label="혈당 수치 (mg/dL)" value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); save(); } }} />
        <span>mg/dL</span>
      </label>
      <p className="lbl">잰 날과 시각</p>
      <When date={date} at={at} today={today} onDate={setDate} onAt={setAt} />
      <p className="lbl">메모</p>
      <input type="text" maxLength={80} placeholder="식사, 컨디션, 운동 등을 적어 보세요" aria-label="메모" value={memo} onChange={(e) => setMemo(e.target.value)} />
      <Actions id={record?.id} ok={ok} busy={busy} fail={fail} onCancel={onClose} onSave={save} onDelete={(id) => run(() => remove(id))} />
    </>
  );
}

/* ----- 몸무게 기록 창 ----- */
export function WeightSheet({ form, ...rest }: SheetProps<Weight>) {
  return (
    <Sheet open={!!form} label={form?.record ? "몸무게 기록 고치기" : "몸무게 기록"} onClose={rest.onClose}>
      {form && <WeightForm record={form.record} {...rest} />}
    </Sheet>
  );
}
function WeightForm({ record, today, onClose, save: put, remove }: { record?: Weight } & Omit<SheetProps<Weight>, "form">) {
  const [value, setValue] = useState(record ? record.value.toFixed(1) : "");
  const [date, setDate] = useState(record?.date ?? today);
  const [at, setAt] = useState(record?.at ?? nowAt());
  const [memo, setMemo] = useState(record?.memo ?? "");
  const num = useFocusOnOpen();
  const { busy, fail, run } = useSubmit(onClose);
  const v = Number(value), ok = /^\d{2,3}(\.\d)?$/.test(value) && v >= 10 && v <= 500 && validDay(date, today);
  const save = () => { if (ok) run(() => put({ date, at, value: v, memo: memo.trim() }, record?.id)); };
  return (
    <>
      <h2>{record ? "몸무게 기록 고치기" : "몸무게 기록"}</h2>
      <p className="lbl">몸무게</p>
      <label className="he-big">
        {/* 숫자와 점 하나만, 소수는 한 자리까지 받습니다 (쉼표로 적어도 점으로 바꿉니다) */}
        <input ref={num} type="text" inputMode="decimal" maxLength={5} placeholder="0.0" aria-label="몸무게 (kg)" value={value}
          onChange={(e) => setValue(e.target.value.replace(",", ".").replace(/[^\d.]/g, "").replace(/^(\d*\.?\d?).*$/, "$1"))}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); save(); } }} />
        <span>kg</span>
      </label>
      <p className="lbl">잰 날과 시각</p>
      <When date={date} at={at} today={today} onDate={setDate} onAt={setAt} />
      <p className="lbl">메모</p>
      <input type="text" maxLength={80} placeholder="적어 두고 싶은 것이 있으면" aria-label="메모" value={memo} onChange={(e) => setMemo(e.target.value)} />
      <Actions id={record?.id} ok={ok} busy={busy} fail={fail} onCancel={onClose} onSave={save} onDelete={(id) => run(() => remove(id))} />
    </>
  );
}

/* ----- 목표 창: 혈당 범위, 목표 몸무게, 한 주 운동 시간 ----- */
export function GoalsSheet({ open, goals, onClose, save }: { open: boolean; goals: Goals; onClose: () => void; save: (g: Goals) => Promise<boolean> }) {
  return (
    <Sheet open={open} label="건강 목표" onClose={onClose}>
      {open && <GoalsForm goals={goals} onClose={onClose} save={save} />}
    </Sheet>
  );
}
const optional = (s: string) => (s.trim() ? Number(s) : null);
function GoalsForm({ goals, onClose, save }: { goals: Goals; onClose: () => void; save: (g: Goals) => Promise<boolean> }) {
  const { busy, fail, run } = useSubmit(onClose);
  const [low, setLow] = useState(String(goals.glucose_low));
  const [high, setHigh] = useState(String(goals.glucose_high));
  const [weight, setWeight] = useState(goals.weight_goal?.toFixed(1) ?? "");
  const [move, setMove] = useState(goals.move_goal != null ? String(goals.move_goal) : "");
  const lo = Number(low), hi = Number(high), w = optional(weight), mv = optional(move);
  const ok = /^\d{2,3}$/.test(low) && /^\d{2,3}$/.test(high) && lo >= 10 && lo < hi
    && (w == null || (/^\d{2,3}(\.\d)?$/.test(weight) && w >= 10 && w <= 500)) && (mv == null || (/^\d{1,2}(\.\d)?$/.test(move) && mv > 0));
  const digits = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value.replace(/\D/g, ""));
  const decimal = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(e.target.value.replace(",", ".").replace(/[^\d.]/g, "").replace(/^(\d*\.?\d?).*$/, "$1"));
  return (
    <>
      <h2>건강 목표</h2>
      <p className="lbl">혈당 범위 <span>mg/dL</span></p>
      <div className="he-pair">
        <input type="text" inputMode="numeric" maxLength={3} aria-label="혈당 범위의 아래" value={low} onChange={digits(setLow)} />
        <i>~</i>
        <input type="text" inputMode="numeric" maxLength={3} aria-label="혈당 범위의 위" value={high} onChange={digits(setHigh)} />
      </div>
      <p className="lbl">목표 몸무게 <span>kg · 비워 두어도 돼요</span></p>
      <input type="text" inputMode="decimal" maxLength={5} placeholder="예: 70.0" aria-label="목표 몸무게 (kg)" value={weight} onChange={decimal(setWeight)} />
      <p className="lbl">한 주 운동 시간 <span>시간 · 비워 두어도 돼요</span></p>
      <input type="text" inputMode="decimal" maxLength={4} placeholder="예: 3" aria-label="한 주 운동 시간 (시간)" value={move} onChange={decimal(setMove)} />
      <Actions ok={ok} busy={busy} fail={fail} onCancel={onClose}
        onSave={() => { if (ok) run(() => save({ glucose_low: lo, glucose_high: hi, weight_goal: w, move_goal: mv })); }} />
    </>
  );
}
