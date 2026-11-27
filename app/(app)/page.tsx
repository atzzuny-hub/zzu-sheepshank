"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/Shell";
import { XMark } from "@/components/Knot";
import { getJournal, getKeyActions, getMonth, getPlan, saveNote, setCheck } from "@/lib/data";
import { WD, daysIn, todayParts, ymd, type Action, type Area, type Journal } from "@/lib/util";

const NAMES = ["쏟아내기", "알아주기", "가르치기"];

export default function Home() {
  const { uid, queue, setStatus } = useApp();
  const t = useMemo(todayParts, []);
  const date = ymd(t.y, t.m, t.d);
  const [ready, setReady] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [habits, setHabits] = useState<Action[]>([]);
  const [future, setFuture] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [checks, setChecks] = useState<Set<string>>(new Set());
  const [phrase, setPhrase] = useState("");
  const [j, setJ] = useState<Journal>({ pour: "", listen: "", teach: "" });
  const [w, setW] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getPlan(), getMonth(t.y, t.m), getJournal(date), getKeyActions()])
      .then(([p, mo, jr, keys]) => {
        setAreas(p.areas); setHabits(keys); setFuture(p.future);
        setNotes(mo.notes); setChecks(mo.checks); setPhrase(mo.phrase); setJ(jr); setReady(true);
      })
      .catch(() => setStatus("불러오지 못했어요. 새로고침해 보세요."));
  }, [t, date, setStatus]);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, [ready]);

  if (!ready) return null;

  const count = (d: number) => habits.reduce((c, h) => c + (checks.has(`${d}|${h.id}`) ? 1 : 0), 0);
  function onNote(v: string) {
    setNotes((p) => ({ ...p, [t.d]: v }));
    queue(`note:${date}`, () => saveNote(uid, date, v));
  }
  function toggle(id: string) {
    const k = `${t.d}|${id}`, on = !checks.has(k);
    setChecks((p) => { const s = new Set(p); if (on) s.add(k); else s.delete(k); return s; });
    queue(`check:${date}:${id}`, () => setCheck(uid, date, id, on));
  }

  // D-day
  const f = future ? new Date(`${future}T00:00:00`) : new Date(t.y + 1, 11, 31);
  const diff = Math.round((f.getTime() - new Date(t.y, t.m, t.d).getTime()) / 864e5);
  const dday = diff > 0 ? `D-${diff}` : diff === 0 ? "D-day" : `D+${-diff}`;
  const goal = `${f.getFullYear()}년 ${f.getMonth() + 1}월 ${f.getDate()}일의 나까지`;
  const done = count(t.d); // 오늘 지킨 일의 수

  // 모멘텀
  const doneSteps = [j.pour, j.listen, j.teach].map((s) => !!s.trim());
  const next = doneSteps.indexOf(false) + 1; // 0 이면 다 씀

  // 그래프
  const H = 170, pl = 26, pr = 12, pt = 14, pb = 24, N = daysIn(t.y, t.m), n = Math.max(habits.length, 1);
  const x = (d: number) => pl + ((d - 1) / (N - 1)) * (w - pl - pr);
  const y = (c: number) => H - pb - (c / n) * (H - pt - pb);
  const pts = Array.from({ length: t.d }, (_, i) => [x(i + 1), y(count(i + 1)), i + 1]);

  // 영역별 실천율
  const rows = areas
    .map((a) => {
      const ids = habits.filter((h) => h.area_id === a.id).map((h) => h.id);
      let c = 0;
      for (let d = 1; d <= t.d; d++) ids.forEach((id) => { if (checks.has(`${d}|${id}`)) c++; });
      return { id: a.id, name: a.name || "이름 없는 영역", n: ids.length, pc: ids.length ? Math.round((c / (ids.length * t.d)) * 100) : 0 };
    })
    .filter((r) => r.n > 0);

  return (
    <section>
      <div className="hero">
        <div className="hrow">
          <h1 className="hdate">{t.m + 1}월 {t.d}일 <small>{WD[new Date(t.y, t.m, t.d).getDay()]}요일</small></h1>
          {/* 남은 날. 누르면 날짜를 정하는 계획으로 갑니다. 폰에서는 숫자만 보입니다 */}
          <Link className="dpill" href="/plan" aria-label={`${goal} ${dday}. 계획에서 날짜 바꾸기`}><span>{goal}</span><b>{dday}</b></Link>
        </div>
        <p className="motto">{phrase.trim() ? phrase : <Link href="/note">{t.m + 1}월 캐치프레이즈 적기</Link>}</p>
      </div>

      <div className="duo">
        <div>
          <section className="blk">
            <h2>오늘의 한 줄</h2>
            <textarea className="dline" rows={2} maxLength={80} value={notes[t.d] ?? ""} placeholder="오늘 기억하고 싶은 한 줄" aria-label="오늘의 한 줄"
              onChange={(e) => onNote(e.target.value.replace(/\n/g, " "))}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.blur(); } }} />
          </section>

          <section className="blk">
            <h2>오늘의 실천 {habits.length > 0 && <b className="hcount">{done} / {habits.length}</b>}</h2>
            {habits.length ? (
              <>
                <div className="pbar" aria-hidden="true"><i style={{ width: `${(done / habits.length) * 100}%` }} /></div>
                <ul className="tlist">
                  {habits.map((h) => (
                    <li key={h.id}>
                      <button type="button" className="tchk" aria-pressed={checks.has(`${t.d}|${h.id}`)} onClick={() => toggle(h.id)}>
                        <span className="bx"><XMark /></span><span>{h.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="msg">지킬 일이 아직 없어요. <Link href="/plan">계획</Link>에서 가장 중요한 일에 별표를 눌러 보세요.</p>
            )}
          </section>
        </div>

        <section className="blk">
          <h2>모멘텀 <small>오늘의 15분 글쓰기</small></h2>
          <ol className="msteps">
            {NAMES.map((nm, i) => <li key={nm} className={doneSteps[i] ? "ok" : undefined}><i>{doneSteps[i] ? "✓" : ""}</i>{nm}</li>)}
          </ol>
          <Link className={`btn${next ? " primary" : ""}`} href={`/momentum?step=${next || 1}`} style={{ textDecoration: "none", display: "inline-block" }}>
            {!next ? "오늘 쓴 글 다시 보기" : next === 1 ? "쏟아내기 시작" : `${NAMES[next - 1]} 이어서 쓰기`}
          </Link>
        </section>
      </div>

      <section className="blk">
        <h2>{t.m + 1}월 실천 그래프 <Link href="/note">노트에서 자세히 보기</Link></h2>
        <div id="hgraph" ref={box}>
          {w > 0 && (
            <svg id="hsvg" width={w} height={H} role="img" aria-label="이번 달 날짜별로 지킨 일의 개수">
              <line x1={pl} x2={w - pr} y1={y(0)} y2={y(0)} />
              <line className="top" x1={pl} x2={w - pr} y1={y(n)} y2={y(n)} />
              <text x={pl - 8} y={y(0) + 4} textAnchor="end">0</text>
              <text x={pl - 8} y={y(n) + 4} textAnchor="end">{n}</text>
              {Array.from({ length: N }, (_, i) => i + 1).filter((d) => d === 1 || d % 5 === 0)
                .map((d) => <text key={d} x={x(d)} y={H - 6} textAnchor="middle">{d}</text>)}
              {pts.length > 1 && <polyline points={pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")} />}
              {pts.map((p) => <circle key={p[2]} cx={p[0]} cy={p[1]} r={p[2] === t.d ? 5 : 3} className={p[2] === t.d ? "now" : undefined} />)}
            </svg>
          )}
        </div>
      </section>

      <section className="blk">
        <h2>영역별 실천율 <small>이번 달 1일부터 오늘까지</small></h2>
        {rows.length ? (
          <div className="rates">
            {rows.map((r) => (
              <div className="rrow" key={r.id}>
                <div className="nm">{r.name}</div>
                <div className="bar"><i style={{ width: `${r.pc}%` }} /></div>
                <div className="pc">{r.pc}%</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="msg">계획에서 별표로 뽑은 일이 생기면, 영역별로 얼마나 지켰는지 여기에 보여요.</p>
        )}
      </section>
    </section>
  );
}
