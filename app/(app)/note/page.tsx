"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/Shell";
import { XMark } from "@/components/Knot";
import OrderButton from "@/components/OrderButton";
import MomentumList from "@/components/MomentumList";
import { getKeyActions, getMonth, saveNote, savePhrase, setCheck } from "@/lib/data";
import { WD, daysIn, todayParts, ym, ymd, type Action } from "@/lib/util";

const ROW = 40;

export default function NotePage() {
  const { uid, queue, setStatus } = useApp();
  const today = useMemo(todayParts, []);
  const [view, setView] = useState({ y: today.y, m: today.m });
  const [pane, setPane] = useState<"note" | "habit">("note");
  const [habits, setHabits] = useState<Action[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [checks, setChecks] = useState<Set<string>>(new Set());
  const [phrase, setPhrase] = useState("");
  const [ready, setReady] = useState(false);
  const [gw, setGw] = useState(190);
  const gref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setReady(false);
    Promise.all([getKeyActions(), getMonth(view.y, view.m)])
      .then(([h, mo]) => {
        if (!live) return;
        setHabits(h); setNotes(mo.notes); setChecks(mo.checks); setPhrase(mo.phrase); setReady(true);
      })
      .catch(() => live && setStatus("불러오지 못했어요. 새로고침해 보세요."));
    return () => { live = false; };
  }, [view, setStatus]);

  useEffect(() => {
    const el = gref.current; if (!el) return;
    const ro = new ResizeObserver(() => setGw(el.offsetWidth));
    ro.observe(el); setGw(el.offsetWidth);
    return () => ro.disconnect();
  }, [ready]);

  const total = daysIn(view.y, view.m), n = Math.max(habits.length, 1);
  const a = view.y * 12 + view.m, b = today.y * 12 + today.m;
  const last = a < b ? total : a === b ? today.d : 0; // 그래프에 찍을 마지막 날
  const isThis = a === b;
  const count = (d: number) => habits.reduce((c, h) => c + (checks.has(`${d}|${h.id}`) ? 1 : 0), 0);

  function move(delta: number) {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  }
  function onNote(d: number, v: string) {
    setNotes((p) => ({ ...p, [d]: v }));
    const date = ymd(view.y, view.m, d);
    queue(`note:${date}`, () => saveNote(uid, date, v));
  }
  function toggle(d: number, id: string) {
    const k = `${d}|${id}`, on = !checks.has(k), date = ymd(view.y, view.m, d);
    setChecks((p) => { const s = new Set(p); if (on) s.add(k); else s.delete(k); return s; });
    queue(`check:${date}:${id}`, () => setCheck(uid, date, id, on));
  }
  function onPhrase(v: string) {
    setPhrase(v);
    const key = ym(view.y, view.m);
    queue(`phrase:${key}`, () => savePhrase(uid, key, v));
  }
  function onKey(e: React.KeyboardEvent<HTMLInputElement>, d: number) {
    if (e.nativeEvent.isComposing) return;
    const to = e.key === "Enter" || e.key === "ArrowDown" ? d + 1 : e.key === "ArrowUp" ? d - 1 : 0;
    const nx = to && document.querySelector<HTMLInputElement>(`.note input[data-d="${to}"]`);
    if (nx) { e.preventDefault(); nx.focus(); }
  }

  // 요약
  let noted = 0, done = 0, streak = 0;
  const per = habits.map(() => 0);
  for (let d = 1; d <= total; d++) {
    if ((notes[d] ?? "").trim()) noted++;
    habits.forEach((h, i) => { if (checks.has(`${d}|${h.id}`)) { per[i]++; if (d <= last) done++; } });
  }
  for (let s = last; s >= 1; s--) {
    if ((notes[s] ?? "").trim() || count(s) > 0) streak++;
    else if (s === last && isThis) continue; // 오늘은 아직 안 적었어도 끊기지 않음
    else break;
  }
  const rate = last && habits.length ? Math.round((done / (last * habits.length)) * 100) : 0;

  // 그래프
  const pad = gw < 120 ? 10 : 18;
  const x = (c: number) => pad + (c / n) * (gw - pad * 2);
  const pts = Array.from({ length: last }, (_, i) => [x(count(i + 1)), (i + 0.5) * ROW, i + 1]);
  const days = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <section data-view={pane}>
      <header className="top">
        <div className="month">
          <button className="nav" onClick={() => move(-1)} aria-label="이전 달">‹</button>
          <h1>{view.m + 1}월</h1>
          <span className="year">{view.y}</span>
          <button className="nav" onClick={() => move(1)} aria-label="다음 달">›</button>
        </div>
        <ul className="stats">
          <li>적은 날<b>{noted}일</b></li>
          <li>실천율<b>{rate}%</b></li>
          <li>이번 달 연속<b>{streak}일</b></li>
        </ul>
        <div className="tools">
          <div className="seg" role="group" aria-label="보기 전환">
            <button aria-pressed={pane === "note"} onClick={() => setPane("note")}>한 줄</button>
            <button aria-pressed={pane === "habit"} onClick={() => setPane("habit")}>지킬 일</button>
          </div>
          <OrderButton habits={habits} onChange={setHabits} />
          <Link className="btn" href="/plan">지킬 일 고르기</Link>
        </div>
      </header>

      <main className="sheet" inert={!ready} style={{ ["--n" as string]: n }}>
        <div className="r head">
          <div className="day" />
          <div className="note h-note">
            <span className="lbl">기억할 한 줄</span>
            <textarea className="phrase" rows={3} maxLength={120} value={phrase} placeholder="이번 달 캐치프레이즈"
              aria-label={`${view.m + 1}월 캐치프레이즈`} onChange={(e) => onPhrase(e.target.value)} />
          </div>
          <div className="hab">
            {habits.map((h) => <div key={h.id} className="hname" title={h.text}>{h.text}</div>)}
          </div>
          <div className="h-cnt">합</div>
          <div className="h-graph" ref={gref}>
            <span className="cap">실천<span className="x"> 그래프</span></span>
            {Array.from({ length: n + 1 }, (_, c) => {
              const odd = c % 2 === 1 && c !== n;
              return <span key={c} className={`tick${odd ? (n > 8 ? " odd minor" : " odd") : ""}`} style={{ left: x(c) }}>{c}</span>;
            })}
          </div>
        </div>

        {days.map((d) => {
          const wd = new Date(view.y, view.m, d).getDay(), c = count(d);
          const isToday = isThis && d === today.d;
          return (
            <div key={d} className={`r${isToday ? " today" : ""}${d > last ? " future" : ""}`}>
              <div className="day"><span className="d">{d}</span><span className={`w${wd === 0 ? " sun" : ""}`}>{WD[wd]}</span></div>
              <div className="note">
                <input type="text" maxLength={80} data-d={d} value={notes[d] ?? ""} aria-label={`${d}일 한 줄`}
                  placeholder={isToday ? "오늘 기억하고 싶은 한 줄" : undefined}
                  onChange={(e) => onNote(d, e.target.value)} onKeyDown={(e) => onKey(e, d)} />
              </div>
              <div className="hab">
                {habits.map((h, i) => (
                  <button key={h.id} type="button" className="chk" aria-label={`${d}일 ${h.text}`}
                    aria-pressed={checks.has(`${d}|${h.id}`)} onClick={() => toggle(d, h.id)}
                    style={{ ["--tilt" as string]: `${(((d * 7 + i * 13) % 5) - 2) * 4}deg` }}>
                    <XMark />
                  </button>
                ))}
              </div>
              <div className={`cnt${habits.length > 0 && c === habits.length ? " full" : ""}`}>
                {c > 0 || (notes[d] ?? "").trim() || d <= last ? c : ""}
              </div>
              <div className="gcell">
                {d === 1 && (
                  <svg id="graph" width={gw} height={total * ROW} role="img" aria-label="날짜별로 지킨 일의 개수를 이은 그래프">
                    <line x1={x(n)} x2={x(n)} y1={0} y2={total * ROW} />
                    {pts.length > 1 && <polyline points={pts.map((p) => `${p[0].toFixed(1)},${p[1]}`).join(" ")} />}
                    {pts.map((p) => {
                      const now = isThis && p[2] === today.d;
                      return <circle key={p[2]} cx={p[0]} cy={p[1]} r={now ? 5 : 3} className={now ? "now" : undefined} />;
                    })}
                  </svg>
                )}
              </div>
            </div>
          );
        })}

        <div className="r foot">
          <div className="day">합계</div>
          <div className="note">{noted ? `${total}일 가운데 ${noted}일을 적었어요` : "아직 적은 날이 없어요"}</div>
          <div className="hab tots">{per.map((v, i) => <div key={i} className="tot">{v}</div>)}</div>
          <div className="cnt" />
          <div className="gcell" />
        </div>
      </main>
      {ready && habits.length === 0 && (
        <p className="lead" style={{ marginTop: 16 }}>
          지킬 일이 아직 없어요. <Link href="/plan">계획</Link>에서 가장 중요한 일에 별표를 누르면 여기에 칸이 생깁니다.
        </p>
      )}
      <MomentumList y={view.y} m={view.m} />
    </section>
  );
}
