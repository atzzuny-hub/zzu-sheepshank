"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/Shell";
import {
  addAction, addArea, deleteAction, deleteArea, getPlan, renameArea, saveFuture, updateAction,
} from "@/lib/data";
import { MAX_KEYS, todayParts, type Action, type Area } from "@/lib/util";

function Star() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2.2l2.4 5 5.4.7-4 3.8 1 5.4L10 14.5 5.2 17.1l1-5.4-4-3.8 5.4-.7z" />
    </svg>
  );
}

export default function PlanPage() {
  const { uid, queue, setStatus } = useApp();
  const today = useMemo(todayParts, []);
  const [areas, setAreas] = useState<Area[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [future, setFuture] = useState("");
  const [ready, setReady] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [sure, setSure] = useState<string | null>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const map = useRef<HTMLDivElement>(null);
  const focusAdd = useRef<string | null>(null);

  useEffect(() => {
    getPlan()
      .then((p) => { setAreas(p.areas); setActions(p.actions); setFuture(p.future); setReady(true); })
      .catch(() => setStatus("불러오지 못했어요. 새로고침해 보세요."));
    const mq = window.matchMedia("(max-width: 859px)");
    const on = () => setNarrow(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [setStatus]);

  const keyCount = actions.filter((a) => a.is_key).length;
  const fail = () => setStatus("저장하지 못했어요. 새로고침해 보세요.");

  // 원에서 영역 상자로 뻗는 화살표
  const draw = useCallback(() => {
    const m = map.current, fut = m?.querySelector<HTMLElement>(".future");
    if (!m || !fut || narrow) { setPaths([]); return; }
    const mr = m.getBoundingClientRect(), c = fut.getBoundingClientRect();
    const cx = c.left - mr.left + c.width / 2, cy = c.top - mr.top + c.height / 2, R = c.width / 2 + 5;
    const out: string[] = [];
    m.querySelectorAll<HTMLElement>(".area .ttl").forEach((t, i) => {
      const r = t.getBoundingClientRect(), left = !!t.closest(".left");
      const tx = (left ? r.right + 8 : r.left - 8) - mr.left, ty = r.top - mr.top + r.height / 2;
      const ang = Math.atan2(ty - cy, tx - cx), sx = cx + R * Math.cos(ang), sy = cy + R * Math.sin(ang);
      const qx = (sx + tx) / 2, qy = (sy + ty) / 2 + (i % 2 ? 10 : -10);
      out.push(`M${sx.toFixed(1)} ${sy.toFixed(1)} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`);
    });
    setPaths((p) => (p.join("|") === out.join("|") ? p : out));
  }, [narrow]);
  useLayoutEffect(() => { draw(); }, [draw, areas, actions, ready]);
  useEffect(() => {
    const m = map.current; if (!m) return;
    const ro = new ResizeObserver(draw); ro.observe(m);
    return () => ro.disconnect();
  }, [draw]);
  useEffect(() => {
    if (!focusAdd.current) return;
    map.current?.querySelector<HTMLInputElement>(`[data-add="${focusAdd.current}"]`)?.focus();
    focusAdd.current = null;
  }, [actions]);

  async function newArea() {
    try {
      const a = await addArea(areas.length);
      setAreas((p) => [...p, a]);
      setTimeout(() => map.current?.querySelector<HTMLInputElement>(`[data-area="${a.id}"]`)?.focus(), 0);
    } catch { fail(); }
  }
  function nameArea(id: string, name: string) {
    setAreas((p) => p.map((a) => (a.id === id ? { ...a, name } : a)));
    queue(`area:${id}`, () => renameArea(id, name));
  }
  async function removeArea(a: Area) {
    const has = actions.some((x) => x.area_id === a.id);
    if (has && sure !== a.id) { setSure(a.id); return; }
    setSure(null);
    setAreas((p) => p.filter((x) => x.id !== a.id));
    setActions((p) => p.filter((x) => x.area_id !== a.id));
    try { await deleteArea(a.id); } catch { fail(); }
  }
  async function newAction(areaId: string, input: HTMLInputElement, refocus: boolean) {
    const text = input.value.trim(); if (!text) return;
    input.value = "";
    try {
      const row = await addAction(areaId, text, actions.filter((x) => x.area_id === areaId).length);
      if (refocus) focusAdd.current = areaId;
      setActions((p) => [...p, row]);
    } catch { fail(); }
  }
  function editAction(id: string, text: string) {
    setActions((p) => p.map((x) => (x.id === id ? { ...x, text } : x)));
    queue(`action:${id}`, () => updateAction(id, { text }));
  }
  async function star(it: Action) {
    if (!it.is_key && !it.text.trim()) return;
    if (!it.is_key && keyCount >= MAX_KEYS) { setStatus(`지킬 일은 ${MAX_KEYS}개까지예요. 다른 별표를 먼저 빼 주세요.`); return; }
    setActions((p) => p.map((x) => (x.id === it.id ? { ...x, is_key: !it.is_key } : x)));
    try { await updateAction(it.id, it.is_key ? { is_key: false } : { is_key: true, key_sort: Math.floor(Date.now() / 1000) }); setStatus("저장됨"); } catch { fail(); }
  }
  async function removeAction(id: string) {
    setActions((p) => p.filter((x) => x.id !== id));
    try { await deleteAction(id); } catch { fail(); }
  }
  function onFuture(v: string) {
    setFuture(v);
    queue("future", () => saveFuture(uid, v));
  }

  const areaBox = (a: Area) => (
    <div className="area" key={a.id}>
      <div className="ttl">
        <input type="text" maxLength={20} value={a.name} placeholder="영역 이름" aria-label="영역 이름" data-area={a.id}
          onChange={(e) => nameArea(a.id, e.target.value)} />
        <button type="button" className={`adel${sure === a.id ? " sure" : ""}`} aria-label={`${a.name || "영역"} 지우기`}
          onClick={() => removeArea(a)} onBlur={() => setSure(null)}>
          {sure === a.id ? "할 일까지 지우기" : "×"}
        </button>
      </div>
      <ul className="items">
        {actions.filter((x) => x.area_id === a.id).map((it) => (
          <li key={it.id} className={`it${it.is_key ? " key" : ""}`}>
            <button type="button" className="star" aria-pressed={it.is_key} aria-label={`가장 중요한 일로 뽑기: ${it.text}`} onClick={() => star(it)}>
              <Star />
            </button>
            <input type="text" maxLength={30} value={it.text} aria-label="할 일" onChange={(e) => editAction(it.id, e.target.value)} />
            <button type="button" className="idel" aria-label={`${it.text} 지우기`} onClick={() => removeAction(it.id)}>×</button>
          </li>
        ))}
        <li className="it add">
          <input type="text" maxLength={30} placeholder="+ 할 일 적기" aria-label="새 할 일" data-add={a.id}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
              e.preventDefault(); newAction(a.id, e.currentTarget, true);
            }}
            onBlur={(e) => newAction(a.id, e.currentTarget, false)} />
        </li>
      </ul>
    </div>
  );

  return (
    <section>
      <header className="top">
        <div className="month"><h1>계획</h1></div>
        <p className="lead">
          {keyCount
            ? `별표로 뽑은 일 ${keyCount}개가 노트의 지킬 일에 올라가 있어요.`
            : "가장 중요한 일에 별표를 누르면 노트의 지킬 일에 올라갑니다."}
        </p>
        <div className="tools"><button className="btn" onClick={newArea} disabled={!ready}>+ 영역 추가</button></div>
      </header>
      <div id="map" ref={map}>
        {ready && (
          <>
            <div className="col left">{!narrow && areas.filter((_, i) => i % 2 === 1).map(areaBox)}</div>
            <div className="core">
              <div className="now">{`${today.y}년\n지금\n나`}</div>
              <div className="down">↓</div>
              <div className="future">
                <input type="date" value={future} aria-label="되고 싶은 날짜" onChange={(e) => onFuture(e.target.value)} />
                <div>{future} 의 나</div>
              </div>
            </div>
            <div className="col right">{areas.filter((_, i) => narrow || i % 2 === 0).map(areaBox)}</div>
            {areas.length === 0 && <p className="empty">아직 영역이 없어요. “+ 영역 추가”를 눌러 되고 싶은 모습을 하나 적어 보세요.</p>}
            <svg id="links" aria-hidden="true">
              <defs>
                <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
                  <path d="M0 1 L10 5 L0 9 L3 5 z" />
                </marker>
              </defs>
              {paths.map((d, i) => <path key={i} d={d} markerEnd="url(#arr)" />)}
            </svg>
          </>
        )}
      </div>
    </section>
  );
}
