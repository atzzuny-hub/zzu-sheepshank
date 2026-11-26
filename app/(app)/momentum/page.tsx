"use client";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/Shell";
import { getJournal, saveJournal } from "@/lib/data";
import { WD, p2, todayParts, ymd, type Journal } from "@/lib/util";

const STEPS = [
  { k: "pour", role: "내면아이", name: "쏟아내기", ph: "지금 떠오르는 말부터 적어요",
    guide: "내면아이가 되어, 15분 동안 멈추지 않고 안에 있는 말을 다 적어요. 순서도 표현도 욕도 신경 쓰지 말고 날것 그대로요." },
  { k: "listen", role: "친구", name: "알아주기", ph: "그랬구나, 하고 따라 써요",
    guide: "친구가 되어, 쏟아낸 글을 따라 쓰면서 그 마음을 알아줘요. 아직 고치거나 판단하지 않아요. “그랬구나, 그래서 힘들었구나”까지만 하고 해결은 3단계로 넘겨요." },
  { k: "teach", role: "현자", name: "가르치기", ph: "오늘 일을 지혜롭게 매듭지어요",
    guide: "현자의 입장에서 마음을 바르게 고쳐먹고, 오늘 일을 매듭짓는 결론까지 써요. 아래 물음은 실마리로 쓰고, 글은 물음표가 아닌 결론으로 끝내요." },
] as const;
const ASKS = ["만약 내가 이랬으면 어땠을까?", "그 일로 내가 알게 된 사실은 무엇일까?", "그 일로 내가 성장한 점은 무엇일까?"];
const EMPTY: Journal = { pour: "", listen: "", teach: "" };

type Day = ReturnType<typeof todayParts>;
// 주소의 ?date=2026-11-03 을 날짜로 읽습니다. 없거나, 없는 날짜이거나, 내일 이후이면 오늘입니다.
function dayFrom(s: string | null, today: Day): Day {
  const hit = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!hit) return today;
  const y = +hit[1], m = +hit[2] - 1, d = +hit[3], dt = new Date(y, m, d);
  const real = dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d; // 11월 31일 같은 날짜를 거릅니다
  return real && dt <= new Date() ? { y, m, d } : today;
}

function Momentum() {
  const { uid, queue, setStatus } = useApp();
  const today = useMemo(todayParts, []);
  const sp = useSearchParams();
  const start = Math.min(3, Math.max(1, Number(sp.get("step")) || 1));
  // 보여 줄 날은 주소가 정합니다. 그래서 노트의 목록에서 누른 날도, ‹ › 로 옮긴 날도 주소만 보면 알 수 있습니다.
  const day = dayFrom(sp.get("date"), today);
  const [step, setStep] = useState(start);
  const [j, setJ] = useState<Journal>(EMPTY);
  const [ready, setReady] = useState(false);
  const [left, setLeft] = useState(900);
  const [running, setRunning] = useState(false);
  const [nudge, setNudge] = useState("");
  const lastType = useRef(0);
  const ta = useRef<HTMLTextAreaElement>(null);

  const date = ymd(day.y, day.m, day.d);
  const isToday = day.y === today.y && day.m === today.m && day.d === today.d;
  const st = STEPS[step - 1], text = j[st.k];

  // 날이 바뀌면 그날의 첫 단계부터 봅니다 (주소에 step 이 있으면 그 단계부터).
  // 그날의 글을 불러올 때까지는 바로 잠가서, 앞의 날 글이 새 날짜로 저장되는 일이 없게 합니다.
  const [shown, setShown] = useState(date);
  if (shown !== date) { setShown(date); setReady(false); go(start); }

  useEffect(() => {
    let live = true;
    setReady(false);
    getJournal(date)
      .then((r) => { if (live) { setJ(r); setReady(true); } })
      .catch(() => live && setStatus("불러오지 못했어요. 새로고침해 보세요."));
    return () => { live = false; };
  }, [date, setStatus]);

  // 종이가 글 길이만큼 늘어납니다
  useLayoutEffect(() => {
    const t = ta.current; if (!t) return;
    t.style.height = "auto"; t.style.height = `${Math.max(t.scrollHeight + 2, 416)}px`;
  }, [text, step, ready]);

  // 15분 타이머는 쏟아내기에서만 돕니다
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((v) => Math.max(0, v - 1));
      if (Date.now() - lastType.current > 7000) setNudge("멈추지 말고 계속 적어요");
    }, 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (left === 0 && running) { setRunning(false); setNudge("15분이 지났어요. 더 적어도 괜찮아요."); }
  }, [left, running]);

  function go(s: number) { setStep(s); setNudge(""); if (s !== 1) setRunning(false); }
  function moveDay(delta: number) {
    // 빠르게 여러 번 눌러도 건너뛰지 않도록, 화면이 아니라 지금 주소의 날짜에서 옮깁니다
    const cur = dayFrom(new URLSearchParams(window.location.search).get("date"), today);
    const dt = new Date(cur.y, cur.m, cur.d + delta);
    if (dt > new Date(today.y, today.m, today.d)) return;
    window.history.replaceState(null, "", `?date=${ymd(dt.getFullYear(), dt.getMonth(), dt.getDate())}`);
  }
  function onText(v: string) {
    const next = { ...j, [st.k]: v };
    setJ(next);
    lastType.current = Date.now();
    let hint = "";
    if (step === 2 && /그래도|해야|하자|했어야|앞으로는/.test(v.slice(-40))) hint = "해결은 3단계로 넘기고, 지금은 “그랬구나”까지만요";
    if (step === 3 && /[?？]\s*$/.test(v)) hint = "물음표 말고 결론으로 매듭지어요";
    setNudge(hint);
    queue(`journal:${date}`, () => saveJournal(uid, date, next));
  }

  const paper = (
    <textarea ref={ta} className="paper" value={text} placeholder={st.ph} aria-label={st.name} spellCheck={false}
      onChange={(e) => onText(e.target.value)} />
  );
  const orig = (t: string, empty: string) => (
    <div className={`paper orig${t.trim() ? "" : " blank"}`}>{t.trim() ? t : empty}</div>
  );
  const back = j.listen.trim() ? j.listen : j.pour;

  return (
    <section>
      <header className="top">
        <div className="month">
          <button className="nav" onClick={() => moveDay(-1)} aria-label="전날">‹</button>
          <h1>{day.m + 1}월 {day.d}일</h1>
          <span className="year">{day.y} {WD[new Date(day.y, day.m, day.d).getDay()]}요일</span>
          <button className="nav" onClick={() => moveDay(1)} disabled={isToday} aria-label="다음 날">›</button>
        </div>
        {step === 1 && (
          <div className="tools">
            <span className={`timer${left === 0 ? " done" : ""}`}>{p2(Math.floor(left / 60))}:{p2(left % 60)}</span>
            <button className="btn primary" disabled={left === 0}
              onClick={() => { lastType.current = Date.now(); setRunning(!running); ta.current?.focus(); }}>
              {running ? "잠깐 멈춤" : left === 0 ? "15분 지남" : left === 900 ? "15분 시작" : "이어서"}
            </button>
            <button className="btn" onClick={() => { setRunning(false); setLeft(900); }}>처음부터</button>
          </div>
        )}
      </header>

      <div className="steps" role="tablist" aria-label="글쓰기 단계">
        {STEPS.map((s, i) => (
          <button key={s.k} role="tab" aria-selected={step === i + 1} className={j[s.k].trim() ? "has" : undefined} onClick={() => go(i + 1)}>
            <b>{i + 1} {s.role}</b><span>{s.name}</span>
          </button>
        ))}
      </div>

      <div id="wbody" inert={!ready}>
        <p className="guide">{st.guide}</p>
        {step === 1 && paper}
        {step === 2 && (
          <div className="pair">
            <div><p className="sub">쏟아낸 글</p>{orig(j.pour, "아직 쏟아낸 글이 없어요. 1단계에서 먼저 적어 주세요.")}</div>
            <div><p className="sub">알아주는 글</p>{paper}</div>
          </div>
        )}
        {step === 3 && (
          <>
            <ul className="asks">{ASKS.map((q) => <li key={q}>{q}</li>)}</ul>
            {back.trim() && (
              <details className="back">
                <summary>{j.listen.trim() ? "알아준 글 다시 보기" : "쏟아낸 글 다시 보기"}</summary>
                {orig(back, "")}
              </details>
            )}
            {paper}
          </>
        )}
        <div className="wfoot">
          <span>{text.length}자</span>
          <span className="nudge" role="status">{nudge}</span>
          {step < 3 && <button className="btn" onClick={() => { go(step + 1); window.scrollTo(0, 0); }}>다음 단계로</button>}
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  return <Suspense><Momentum /></Suspense>;
}
