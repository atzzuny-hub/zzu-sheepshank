"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/Shell";
import Knot, { XMark } from "@/components/Knot";
import Icon from "@/components/Icons";
import NightSky from "@/components/NightSky";
import RateGraph, { GRAPH_DAYS } from "@/components/RateGraph";
import {
  getChecksBetween, getJournal, getKeyActions, getMonth, getPlan, getTimelog, saveNote, setCheck, type TimeTask,
} from "@/lib/data";
import { FOCUS_AREA, NEXT, areaColor, clock, colorName, dayLayout, fmt, focusCells } from "@/lib/time";
import { WD, daysIn, dday, todayParts, ym, ymd, type Action, type Area, type Journal } from "@/lib/util";

// 모멘텀 카드의 문구. 1·2·3 은 이제 쓸 단계, 0 은 세 단계를 다 쓴 날
const WRITE = [
  { name: "", title: "오늘의 글을 다 썼어요", sub: "세 단계를 모두 마쳤어요. 다시 읽거나 이어서 고칠 수 있어요." },
  { name: "쏟아내기", title: "지금 마음에 있는 걸 쏟아내기", sub: "15분 동안 멈추지 않고 써 보세요. 정리하지 않아도 괜찮아요." },
  { name: "알아주기", title: "쏟아낸 마음을 알아주기", sub: "쏟아낸 글을 따라 쓰며 “그랬구나” 하고 알아줘요. 고치지 않아도 괜찮아요." },
  { name: "가르치기", title: "오늘 일을 매듭짓기", sub: "현자가 되어 마음을 바르게 고쳐먹고, 결론까지 써요." },
];
const LOGS = 5; // 오늘 시간 카드에 보여 주는 기록의 수. 더 많으면 가장 최근 것들만 보여 줍니다

export default function Home() {
  const { uid, queue, setStatus } = useApp();
  const t = useMemo(todayParts, []);
  const date = ymd(t.y, t.m, t.d);
  const [ready, setReady] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [habits, setHabits] = useState<Action[]>([]);
  const [future, setFuture] = useState("");
  const [phrase, setPhrase] = useState("");
  const [checks, setChecks] = useState<Set<string>>(new Set()); // "2026-11-27|<지킬 일 id>" 꼴. 그래프가 보는 날들의 체크
  const [notes, setNotes] = useState<Record<number, string>>({}); // 이번 달의 한 줄
  const [j, setJ] = useState<Journal>({ pour: "", listen: "", teach: "" });
  // 노트 카드: 달력이 보여 주는 달과 고른 날. 다른 달을 넘겨 보면 그 달의 한 줄을 따로 불러옵니다
  const [view, setView] = useState({ y: t.y, m: t.m });
  const [sel, setSel] = useState(t.d);
  const [far, setFar] = useState<{ key: string; notes: Record<number, string> } | null>(null);
  // 오늘 시간 카드와 집중 시간: 오늘의 시간 기록, 어제의 집중 시간(칸 수), 고른 영역의 색
  const [log, setLog] = useState<{ tasks: TimeTask[]; slots: Record<string, string> } | null>(null);
  const [prevFocus, setPrevFocus] = useState(0);
  const [cat, setCat] = useState<string | null>(null);
  const edited = useRef(false);

  useEffect(() => {
    let live = true;
    edited.current = false;
    const from = new Date(t.y, t.m, t.d - GRAPH_DAYS + 1);
    Promise.all([
      getPlan(), getKeyActions(), getMonth(t.y, t.m), getJournal(date),
      getChecksBetween(ymd(from.getFullYear(), from.getMonth(), from.getDate()), date),
    ])
      .then(([p, keys, mo, jr, cs]) => {
        // 다른 화면에 다녀오면 다시 불러옵니다. 그 사이에 여기서 고친 게 있으면 늦게 온 값으로 덮지 않습니다
        if (!live || edited.current) return;
        setAreas(p.areas); setHabits(keys); setFuture(p.future);
        setPhrase(mo.phrase); setNotes(mo.notes); setChecks(cs); setJ(jr); setReady(true);
      })
      .catch(() => live && setStatus("불러오지 못했어요. 새로고침해 보세요."));
    return () => { live = false; };
  }, [t, date, setStatus]);
  // 시간 기록은 카드 두 군데에만 쓰여서, 못 불러와도 화면을 막지 않습니다
  useEffect(() => {
    let live = true;
    const y = new Date(t.y, t.m, t.d - 1); // 집중 시간을 견줄 어제
    Promise.all([getTimelog(date), getTimelog(ymd(y.getFullYear(), y.getMonth(), y.getDate()))])
      .then(([now, prev]) => { if (live) { setLog(now); setPrevFocus(focusCells(prev.tasks, prev.slots)); } })
      .catch(() => {});
    return () => { live = false; };
  }, [t, date]);
  const thisMonth = view.y === t.y && view.m === t.m, vkey = ym(view.y, view.m);
  useEffect(() => {
    if (thisMonth) return;
    let live = true;
    getMonth(view.y, view.m)
      .then((mo) => { if (live) setFar({ key: ym(view.y, view.m), notes: mo.notes }); })
      .catch(() => live && setStatus("불러오지 못했어요. 새로고침해 보세요."));
    return () => { live = false; };
  }, [view, thisMonth, setStatus]);

  if (!ready) return null;

  /* ----- 오늘 할 일 ----- */
  const ids = habits.map((h) => h.id);
  const done = ids.filter((id) => checks.has(`${date}|${id}`)).length; // 오늘 지킨 일의 수
  function toggle(id: string) {
    const k = `${date}|${id}`, on = !checks.has(k);
    edited.current = true;
    setChecks((p) => { const s = new Set(p); if (on) s.add(k); else s.delete(k); return s; });
    queue(`check:${date}:${id}`, () => setCheck(uid, date, id, on));
  }

  /* ----- 계획: 영역마다 오늘 지킨 일의 수와 지킬 일의 수 ----- */
  const byArea = areas.map((a) => {
    const mine = habits.filter((h) => h.area_id === a.id);
    return { id: a.id, name: a.name || "이름 없는 영역", color: areaColor(a.name), n: mine.length, done: mine.filter((h) => checks.has(`${date}|${h.id}`)).length };
  });

  /* ----- 되고 싶은 날까지 ----- */
  const { f, label: left, goal } = dday(future, t);

  /* ----- 노트 카드의 달력 ----- */
  const total = daysIn(view.y, view.m), lead = new Date(view.y, view.m, 1).getDay(); // lead: 1일 앞에 비워 둘 칸 수
  const day = Math.min(sel, total), dayDate = ymd(view.y, view.m, day), dayIsToday = thisMonth && day === t.d;
  const cal = thisMonth ? notes : far?.key === vkey ? far.notes : null; // 다른 달은 다 불러올 때까지 null
  const months = view.y * 12 + view.m - (t.y * 12 + t.m); // 이번 달에서 몇 달 떨어졌는지
  function move(delta: number) {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  }
  function onNote(v: string) {
    edited.current = true;
    if (thisMonth) setNotes((p) => ({ ...p, [day]: v }));
    else setFar((p) => (p && p.key === vkey ? { ...p, notes: { ...p.notes, [day]: v } } : p));
    queue(`note:${dayDate}`, () => saveNote(uid, dayDate, v));
  }

  /* ----- 모멘텀 ----- */
  const wrote = [j.pour, j.listen, j.teach].map((s) => !!s.trim());
  const next = wrote.indexOf(false) + 1; // 이제 쓸 단계. 0 이면 세 단계를 다 썼습니다
  const write = WRITE[next];

  /* ----- 오늘 시간 ----- */
  const lay = log && dayLayout(log.tasks, log.slots);
  const colorOf = (id: string) => lay!.byId.get(id)!.color;
  const cats = lay ? [...new Set(lay.blocks.map((b) => colorOf(b.id)))] : []; // 오늘 적은 영역의 색들 (적은 순서대로)
  const pick = cat && cats.includes(cat) ? cat : null;
  const blocks = lay ? lay.blocks.filter((b) => !pick || colorOf(b.id) === pick) : [];
  const spent = blocks.reduce((n, b) => n + b.len, 0);
  const focus = log ? focusCells(log.tasks, log.slots) : 0, gain = focus - prevFocus; // 어제보다 늘어난 집중 시간 (칸 수)

  return (
    <section className="home">
      <div className="hero">
        <div className="hhead">
          <div className="hrow">
            <h1 className="hdate">{t.m + 1}월 {t.d}일 <small>{WD[new Date(t.y, t.m, t.d).getDay()]}요일</small></h1>
            {/* 되고 싶은 날까지 남은 날. 누르면 그 날짜를 정하는 계획으로 갑니다 */}
            <Link className="dpill" href="/plan" title={goal} aria-label={`${goal} ${left}. 계획에서 날짜 바꾸기`}>{left}</Link>
          </div>
          <p className="motto">{phrase.trim() ? phrase : <Link href="/note">{t.m + 1}월 캐치프레이즈 적기</Link>}</p>
        </div>
        {/* 오늘의 숫자 두 장: 지킨 일, 집중 시간(어제와 견줌). 집중 시간은 시간 화면으로 이어집니다 */}
        <div className="hstats">
          <div className="blk hstat">
            <span className="hs-ico ok"><Icon name="done" /></span>
            <span className="lbl">오늘 실천</span>
            <p className="hs-big">{done}<small>/ {habits.length}</small></p>
            <div className="pbar" aria-hidden="true"><i style={{ width: `${habits.length ? (done / habits.length) * 100 : 0}%` }} /></div>
          </div>
          <Link className="blk hstat go" href="/time" aria-label={`집중 시간 ${log ? fmt(focus) : "불러오는 중"}. 시간에서 자세히 보기`}>
            <span className="hs-ico gold"><Icon name="time" /></span>
            <span className="lbl">집중 시간 <small>{FOCUS_AREA}</small></span>
            <p className="hs-big">
              {log ? fmt(focus) : "–"}
              {log && gain !== 0 && <span className={`hgain${gain < 0 ? " mute" : ""}`}>{gain > 0 ? "▲ +" : "▼ −"}{fmt(Math.abs(gain))}</span>}
            </p>
            <Icon name="bars" />
          </Link>
        </div>
      </div>

      <div className="hbody">
        <div className="hg hg1">
          <section className="blk htodo">
            <h2><Icon name="check" />오늘 할 일 {habits.length > 0 && <b className="hcount">{done} / {habits.length} 완료</b>}</h2>
            {habits.length ? (
              <>
                <div className="pbar" aria-hidden="true"><i style={{ width: `${(done / habits.length) * 100}%` }} /></div>
                <ul className="tlist">
                  {habits.map((h) => (
                    <li key={h.id}>
                      <button type="button" className="tchk" aria-pressed={checks.has(`${date}|${h.id}`)} onClick={() => toggle(h.id)}>
                        <span className="bx"><XMark /></span><span>{h.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="msg">지킬 일이 아직 없어요. 계획에서 가장 중요한 일에 별표를 누르면 여기에 올라와요.</p>
            )}
            <Link className="btn hfull" href="/plan">+ 지킬 일 고르기</Link>
          </section>

          <section className="blk hnote">
            <h2><Icon name="note" />노트 <Link href="/note">월간 보기 →</Link></h2>
            <div className="hmonth">
              <button type="button" className="nav" onClick={() => move(-1)} aria-label="이전 달">‹</button>
              <b>{view.y !== t.y && `${view.y}년 `}{view.m + 1}월</b>
              <button type="button" className="nav" onClick={() => move(1)} aria-label="다음 달">›</button>
            </div>
            <div className="cal mini" role="group" aria-label={`${view.y}년 ${view.m + 1}월 달력`} inert={!cal}>
              {WD.map((w, i) => <span key={w} className={`wd${i === 0 ? " sun" : ""}`} aria-hidden="true">{w}</span>)}
              {Array.from({ length: lead }, (_, i) => <span key={i} />)}
              {Array.from({ length: total }, (_, i) => i + 1).map((d) => {
                const has = !!(cal?.[d] ?? "").trim(); // 점은 한 줄을 적은 날
                return (
                  <button key={d} type="button" aria-pressed={d === day} onClick={() => setSel(d)}
                    className={`${thisMonth && d === t.d ? "today" : ""}${months > 0 || (months === 0 && d > t.d) ? " future" : ""}`}
                    aria-label={`${view.m + 1}월 ${d}일 ${WD[(lead + d - 1) % 7]}요일${has ? ", 한 줄 있음" : ""}`}>
                    <span className="n">{d}</span><span className="m">{has && <i />}</span>
                  </button>
                );
              })}
            </div>
            <h3><Icon name="pen" />{dayIsToday ? "오늘의 기록" : "이날의 기록"}</h3>
            <div className="hrec" inert={!cal}>
              <p>{view.m + 1}월 {day}일 · {WD[(lead + day - 1) % 7]}요일</p>
              <textarea className="dline" rows={2} maxLength={80} value={cal?.[day] ?? ""} aria-label={`${view.m + 1}월 ${day}일 한 줄`}
                placeholder={dayIsToday ? "오늘 기억하고 싶은 한 줄" : "이날 기억하고 싶은 한 줄"}
                onChange={(e) => onNote(e.target.value.replace(/\n/g, " "))}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.blur(); } }} />
            </div>
          </section>

          <div className="hcol">
            <section className="blk hgraph"><RateGraph ids={ids} checks={checks} today={t} /></section>
            <section className="blk hplan">
              <h2><Icon name="bars" />{f.getFullYear()}년 계획 <Link href="/plan">전체 보기 →</Link><small className="hsub">영역마다 오늘 지킨 일 / 지킬 일</small></h2>
              {byArea.length ? (
                <ul className="hareas">
                  {byArea.map((a) => (
                    <li key={a.id}>
                      <i style={{ background: a.color }} /><span className="nm">{a.name}</span>
                      {/* 지킬 일이 없는 영역은 숫자 대신 줄표. 다 지킨 영역은 숫자를 진하게 */}
                      <b className={!a.n ? "none" : a.done === a.n ? "full" : undefined}>{a.n ? `${a.done}/${a.n}` : "–"}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="msg">아직 영역이 없어요. <Link href="/plan">계획</Link>에서 되고 싶은 모습을 하나 적어 보세요.</p>
              )}
            </section>
          </div>
        </div>

        <div className="hg hg2">
          <section className="blk hmom">
            <h2>
              <Icon name="momentum" />모멘텀
              <span className="hpill">{next ? `${next}단계 · ${write.name}` : "오늘 글 완료"}</span>
              <small className="hsub">오늘도, 마음을 비워 보세요.</small>
            </h2>
            <div className="hm-top">
              <div><h3>{write.title}</h3><p>{write.sub}</p></div>
              {/* 꾸밈: 줄을 긋는 연필 */}
              <svg className="hm-pen" viewBox="0 0 72 60" aria-hidden="true">
                <path d="M4 50c7-7 11 5 17-2s6-13 12-6 4 9 10 3" />
                <g transform="translate(45 44) rotate(-52)"><path d="M0 0 9-4H31a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H9Z" /><path d="M9-4V4M27-4V4" /></g>
              </svg>
            </div>
            <div className="hm-box">
              {/* 15분은 쏟아내기에서만 잽니다. 그 뒤로는 몇 단계까지 썼는지를 보여 줍니다 */}
              <p className="hm-big">{next === 1 ? "15:00" : <>{wrote.filter(Boolean).length}<small>/ 3 단계</small></>}</p>
              <div className="hm-btns">
                <Link className="btn primary" href={next === 1 ? "/momentum?step=1&start=1" : `/momentum?step=${next || 1}`}>
                  <Icon name="play" />{next === 1 ? "시작하기" : next ? "이어서 쓰기" : "다시 보기"}
                </Link>
                <Link className="btn" href="/momentum#recent">지난 글</Link>
              </div>
            </div>
          </section>

          <section className="blk htime">
            <h2><Icon name="time" />오늘 시간 {spent > 0 && <small className="hsum">기록한 시간 <b>{fmt(spent)}</b></small>}</h2>
            {cats.length > 1 && (
              <div className="hchips" role="group" aria-label="영역으로 추려 보기">
                <button type="button" aria-pressed={!pick} onClick={() => setCat(null)}>전체</button>
                {cats.map((c) => (
                  <button key={c} type="button" aria-pressed={pick === c} onClick={() => setCat(c)}><i style={{ background: c }} />{colorName(c, areas)}</button>
                ))}
              </div>
            )}
            {blocks.length ? (
              <ol className="hline">
                {blocks.length > LOGS && <li className="hl-more"><Link href="/time">앞의 기록 {blocks.length - LOGS}개 더 보기</Link></li>}
                {blocks.slice(-LOGS).map((b) => (
                  <li key={b.from}>
                    <time>{clock(b.from)}{b.from >= NEXT && <small>다음 날</small>}</time>
                    <i style={{ background: colorOf(b.id) }} />
                    <span className="nm">{lay!.byId.get(b.id)!.text || "이름 없음"}<small>({fmt(b.len)})</small></span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="msg">{log ? "오늘은 아직 적은 시간이 없어요." : "불러오는 중…"}</p>
            )}
            <Link className="btn hfull" href="/time">+ 기록 추가</Link>
          </section>

          {/* 소개로 가는 카드. 밤하늘은 소개 화면과 같은 그림입니다 */}
          <section className="promo" aria-label="Sheepshank 소개">
            <NightSky />
            <div className="pr-brand"><Knot /><b>Sheepshank</b></div>
            <p className="pr-tag">지금, 더 나은 내일을 위한 기록</p>
            <p className="pr-lead">오늘을 기록하고, 내일을 준비하며,<br />조금 더 나은 방향으로 나아가요.</p>
            <Link className="btn" href="/about">서비스 더 알아보기 →</Link>
          </section>
        </div>
      </div>
    </section>
  );
}
