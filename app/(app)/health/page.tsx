"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/Shell";
import Icon from "@/components/Icons";
import NightSky from "@/components/NightSky";
import TrendGraph, { Bars, Ring, Spark } from "@/components/HealthCharts";
import { GlucoseSheet, GoalsSheet, Missing, WeightSheet, useGlucose, useWeights } from "@/components/HealthParts";
import { getFuture, getGoals, getHealthNote, getTimelogs, saveGoals, saveHealthNote, type TimeTask } from "@/lib/data";
import {
  BAND_NAME, KEEP, NO_GOALS, SPANS, bandOf, clock12, daily, dayAgo, mean, newestFirst, within, type Glucose, type Goals, type Weight,
} from "@/lib/health";
import { MOVE, MOVE_AREA, PER, cellsOf, clock, dayLayout, fmt } from "@/lib/time";
import { WD, dday, todayParts } from "@/lib/util";

const r1 = (v: number) => Math.round(v * 10) / 10;
const signed = (v: number, digits = 0) => `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)}`; // +5, −0.3

export default function HealthPage() {
  const { uid, queue, setStatus } = useApp();
  const t = useMemo(todayParts, []);
  const today = dayAgo(t, 0);
  const glu = useGlucose(t), wei = useWeights(t);
  const [goals, setGoals] = useState<Goals>(NO_GOALS);
  const [future, setFuture] = useState("");
  const [note, setNote] = useState("");
  // 운동 시간은 시간 화면의 기록에서 가져옵니다 (null 이면 불러오는 중)
  const [logs, setLogs] = useState<{ date: string; tasks: TimeTask[]; slots: Record<string, string> }[] | null>(null);
  const [span, setSpan] = useState(7); // 숫자 카드와 그래프가 보는 기간(날 수)
  const [gForm, setGForm] = useState<{ record?: Glucose } | null>(null);
  const [wForm, setWForm] = useState<{ record?: Weight } | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);

  // 목표, 오늘의 메모, 남은 날, 시간 기록: 하나를 못 불러와도 나머지는 보이게 따로따로 불러옵니다
  useEffect(() => {
    let live = true;
    getGoals().then((g) => live && setGoals(g)).catch(() => {});
    getHealthNote(today).then((n) => live && setNote(n)).catch(() => {});
    getFuture().then((f) => live && setFuture(f)).catch(() => {});
    getTimelogs(dayAgo(t, KEEP - 1), today).then((r) => live && setLogs(r)).catch(() => live && setLogs([]));
    return () => { live = false; };
  }, [t, today]);

  const { label: left, goal } = dday(future, t);
  const head = (
    <div className="hero">
      <div className="hhead">
        <div className="hrow">
          <h1 className="hdate">{t.m + 1}월 {t.d}일 <small>{WD[new Date(t.y, t.m, t.d).getDay()]}요일</small></h1>
          <Link className="dpill" href="/plan" title={goal} aria-label={`${goal} ${left}. 계획에서 날짜 바꾸기`}>{left}</Link>
        </div>
        <p className="motto">건강한 몸이, 더 나은 하루를 만든다.</p>
      </div>
      <span className="seg" role="group" aria-label="보는 기간">
        {SPANS.map(([label, n]) => <button key={n} type="button" aria-pressed={span === n} onClick={() => setSpan(n)}>{label}</button>)}
      </span>
    </div>
  );
  if (glu.missing || wei.missing) return <section className="he">{head}<Missing /></section>;
  if (!glu.rows || !wei.rows) return null;
  const G = glu.rows, W = wei.rows;

  /* ----- 혈당: 고른 기간과, 견줄 그 앞의 같은 기간 ----- */
  const gNow = within(G, t, span), gAvg = mean(gNow.map((r) => r.value)), gPrev = mean(within(G, t, span, span).map((r) => r.value));
  const gDelta = gAvg != null && gPrev != null ? Math.round(gAvg) - Math.round(gPrev) : 0;
  const inRange = gNow.length ? gNow.filter((r) => bandOf(r.value, goals) === "in").length / gNow.length : null; // 범위 안이었던 기록의 비율
  const gToday = newestFirst(G.filter((r) => r.date === today));
  const gOut = gToday.filter((r) => bandOf(r.value, goals) !== "in").length;
  const gTip = !G.length ? "혈당을 재서 적으면 여기에 선으로 이어져요."
    : gToday.length ? (gOut ? `오늘 잰 ${gToday.length}번 가운데 ${gOut}번이 내 범위 밖이었어요.` : "오늘 잰 혈당이 모두 내 범위 안이에요.")
    : inRange != null ? `최근 ${span}일 동안 기록의 ${Math.round(inRange * 100)}%가 내 범위 안이었어요.` : `최근 ${span}일 동안은 적은 혈당이 없어요.`;

  /* ----- 몸무게: 가장 최근 기록, 그 앞의 기록, 목표까지 ----- */
  const wAll = newestFirst(W), wLast = wAll[0], wBefore = wAll[1];
  const wDelta = wLast && wBefore ? r1(wLast.value - wBefore.value) : 0;
  const toGoal = wLast && goals.weight_goal != null ? r1(wLast.value - goals.weight_goal) : null; // 양수면 줄여야 할, 음수면 늘려야 할 무게
  const closer = toGoal != null && wDelta !== 0 && Math.abs(toGoal) < Math.abs(toGoal - wDelta); // 앞의 기록보다 목표에 가까워졌는지
  const wToday = newestFirst(W.filter((r) => r.date === today));
  const wGoal = goals.weight_goal != null ? `${goals.weight_goal.toFixed(1)}kg` : ""; // 정해 둔 목표 몸무게 (없으면 빈칸)
  // 목표는 정했는데 몸무게를 아직 적지 않았을 수도, 그 반대일 수도 있어서 둘을 따로 봅니다
  const wTip = !wLast ? (wGoal ? `몸무게를 적으면 목표 ${wGoal}까지 남은 무게가 보여요.` : "몸무게를 적으면 변화가 선으로 보여요.")
    : toGoal == null ? "목표 몸무게를 정하면 남은 무게가 여기에 보여요."
    : toGoal === 0 ? "목표 몸무게에 닿았어요." : `목표 ${wGoal}까지 ${Math.abs(toGoal).toFixed(1)}kg 남았어요.`;

  /* ----- 운동: 시간 화면에서 운동 영역의 색으로 적은 시간 (10분이 한 칸) ----- */
  const moveBy = new Map((logs ?? []).map((l) => [l.date, cellsOf(l.tasks, l.slots, MOVE)]));
  const moveOn = (ago: number) => moveBy.get(dayAgo(t, ago)) ?? 0;
  const sumFrom = (from: number, days: number) => Array.from({ length: days }, (_, i) => moveOn(from + i)).reduce((s, v) => s + v, 0);
  const mNow = sumFrom(0, span), mDelta = mNow - sumFrom(span, span);
  const chunk = span === 7 ? 1 : span / 6; // 작은 막대 하나가 맡는 날 수 (7일은 하루씩, 그 밖에는 여섯 토막)
  const mBars = Array.from({ length: span / chunk }, (_, k) => sumFrom(span - (k + 1) * chunk, chunk));
  const weekly = mNow / PER / (span / 7); // 한 주에 몇 시간꼴인지
  const log = logs?.find((l) => l.date === today), lay = log && dayLayout(log.tasks, log.slots);
  const moves = lay ? lay.blocks.filter((b) => lay.byId.get(b.id)!.color === MOVE) : [];

  async function onGoals(g: Goals) {
    try { await saveGoals(uid, g); setGoals(g); setStatus("저장됨"); return true; }
    catch { setStatus("저장하지 못했어요. 다시 해 보세요."); return false; }
  }
  function onNote(v: string) {
    setNote(v);
    queue(`hnote:${today}`, () => saveHealthNote(uid, today, v));
  }

  return (
    <section className="he">
      {head}

      {/* 고른 기간의 숫자 네 장 */}
      <div className="he-stats">
        <section className="blk he-stat">
          <span className="lbl"><Icon name="drop" />혈당 평균</span>
          <p className="he-num">
            {gAvg != null ? Math.round(gAvg) : "–"}<small>mg/dL</small>
            {gDelta !== 0 && <span className="hgain mute" aria-label={`앞의 ${span}일보다 ${Math.abs(gDelta)} ${gDelta > 0 ? "높음" : "낮음"}`}>{gDelta > 0 ? "▲" : "▼"} {signed(gDelta)}</span>}
          </p>
          <Spark values={daily(G, t, span).map((d) => d.avg)} />
        </section>
        <section className="blk he-stat">
          <span className="lbl"><Icon name="flag" />혈당 범위</span>
          <p className="he-num">{goals.glucose_low} ~ {goals.glucose_high}<small>mg/dL</small></p>
          <span className="he-foot">{inRange != null ? `기록 ${gNow.length}번 가운데 ${Math.round(inRange * 100)}%가 범위 안` : "이 기간에 적은 기록이 없어요"}</span>
        </section>
        <section className="blk he-stat">
          <span className="lbl"><Icon name="scale" />몸무게</span>
          <p className="he-num">
            {wLast ? wLast.value.toFixed(1) : "–"}<small>kg</small>
            {wDelta !== 0 && <span className={`hgain${closer ? "" : " mute"}`} aria-label={`앞의 기록보다 ${Math.abs(wDelta).toFixed(1)}kg ${wDelta > 0 ? "늘었음" : "줄었음"}`}>{wDelta > 0 ? "▲" : "▼"} {signed(wDelta, 1)}</span>}
          </p>
          <Spark values={daily(W, t, span, true).map((d) => d.avg)} />
        </section>
        <Link className="blk he-stat" href="/time" aria-label={`운동 시간 ${fmt(mNow)}. 시간에서 자세히 보기`}>
          <span className="lbl"><Icon name="move" />운동 시간 <small>{MOVE_AREA}</small></span>
          <p className="he-num hand">
            {logs ? fmt(mNow) : "–"}
            {logs && mDelta !== 0 && <span className={`hgain${mDelta < 0 ? " mute" : ""}`}>{mDelta > 0 ? "▲ +" : "▼ −"}{fmt(Math.abs(mDelta))}</span>}
          </p>
          <Bars values={mBars} />
        </Link>
      </div>

      <div className="he-g1">
        <section className="blk">
          <h2><Icon name="drop" />혈당 관리 <Link href="/health/glucose">더보기 →</Link></h2>
          <TrendGraph days={daily(G, t, span)} unit="mg/dL" band={[goals.glucose_low, goals.glucose_high]} />
          <p className="he-tip"><Icon name="bulb" /><span><b>오늘의 혈당</b>{gTip}</span></p>
        </section>
        <section className="blk">
          <h2><Icon name="scale" />몸무게 관리 <Link href="/health/weight">더보기 →</Link></h2>
          <TrendGraph days={daily(W, t, span, true)} unit="kg" digits={1} goal={goals.weight_goal} violet many="가운데 마지막" />
          <p className="he-tip"><Icon name="flag" /><span><b>목표</b>{wTip}</span></p>
        </section>

        {/* 오늘 적은 것들. 여기서 바로 적고, 적은 줄을 누르면 고칩니다 */}
        <section className="blk he-today">
          <h2>오늘의 건강 기록</h2>
          <div className="he-rec">
            <p className="lbl"><Icon name="drop" />혈당<button type="button" className="btn" onClick={() => setGForm({})}>+ 적기</button></p>
            {gToday.map((r) => (
              <button key={r.id} type="button" className="he-row" onClick={() => setGForm({ record: r })}
                aria-label={`혈당 ${r.value} mg/dL, ${clock12(r.at)} ${r.kind}. 눌러서 고치기`}>
                <b>{r.value}<small>mg/dL</small></b>
                <span>{[clock12(r.at), r.kind].filter(Boolean).join(" · ")}</span>
                <em className={`he-badge ${bandOf(r.value, goals)}`}>{BAND_NAME[bandOf(r.value, goals)]}</em>
              </button>
            ))}
            {!gToday.length && <p className="none">오늘은 아직 재지 않았어요.</p>}
          </div>
          <div className="he-rec">
            <p className="lbl"><Icon name="scale" />몸무게<button type="button" className="btn" onClick={() => setWForm({})}>+ 적기</button></p>
            {wToday.map((r) => (
              <button key={r.id} type="button" className="he-row" onClick={() => setWForm({ record: r })}
                aria-label={`몸무게 ${r.value.toFixed(1)} kg, ${clock12(r.at)}. 눌러서 고치기`}>
                <b>{r.value.toFixed(1)}<small>kg</small></b>
                <span>{clock12(r.at)}</span>
                {r.id === wLast?.id && wDelta !== 0 && <em className="he-delta">{wDelta > 0 ? "▲" : "▼"} {signed(wDelta, 1)}</em>}
              </button>
            ))}
            {!wToday.length && <p className="none">오늘은 아직 재지 않았어요.</p>}
          </div>
          <div className="he-rec">
            <p className="lbl"><Icon name="move" />운동<Link className="btn" href="/time">시간에서 적기</Link></p>
            {moves.map((b) => (
              <p key={b.from} className="he-row"><b className="hand">{lay!.byId.get(b.id)!.text || "이름 없음"}</b><span>{fmt(b.len)} · {clock12(clock(b.from))}</span></p>
            ))}
            {!moves.length && <p className="none">{logs ? `시간에서 ${MOVE_AREA} 색으로 적으면 여기에 모여요.` : "불러오는 중…"}</p>}
          </div>
        </section>
      </div>

      <div className="he-g2">
        <section className="blk">
          <h2><Icon name="bars" />혈당 &amp; 몸무게 통계 <small>최근 {span}일</small></h2>
          <div className="he-rings">
            <figure>
              <Ring ratio={inRange ?? 0} tone="up">{inRange != null ? `${Math.round(inRange * 100)}%` : "–"}</Ring>
              <figcaption>혈당 범위 안<small>({goals.glucose_low}~{goals.glucose_high})</small></figcaption>
            </figure>
            <figure>
              {/* 고리는 지금 몸무게와 목표가 얼마나 가까운지 (같으면 꽉 참) */}
              <Ring ratio={wLast && goals.weight_goal ? Math.min(wLast.value, goals.weight_goal) / Math.max(wLast.value, goals.weight_goal) : 0}>
                {wLast ? <>{wLast.value.toFixed(1)}<small>kg</small></> : "–"}
              </Ring>
              <figcaption>목표까지<small>({!wGoal ? "목표 없음" : toGoal == null ? `목표 ${wGoal}` : toGoal === 0 ? "닿았어요" : `${signed(-toGoal, 1)}kg`})</small></figcaption>
            </figure>
            <figure>
              <Ring ratio={goals.move_goal ? weekly / goals.move_goal : 0} tone="violet">{logs ? <>{weekly.toFixed(1)}<small>h</small></> : "–"}</Ring>
              <figcaption>한 주 운동<small>({goals.move_goal ? `목표 ${goals.move_goal}h` : "목표 없음"})</small></figcaption>
            </figure>
          </div>
        </section>

        <section className="blk he-memo">
          <h2><Icon name="pen" />건강 메모 <small>{t.m + 1}월 {t.d}일</small></h2>
          <textarea className="dline" rows={3} maxLength={200} value={note} placeholder="오늘 몸은 어땠는지, 무엇을 먹고 얼마나 움직였는지" aria-label="오늘의 건강 메모"
            onChange={(e) => onNote(e.target.value)} />
        </section>

        {/* 응원 한마디. 단추는 목표를 정하는 창을 엽니다 */}
        <section className="promo he-cheer" aria-label="건강 목표">
          <NightSky />
          <p className="pr-tag">작은 습관이<br />건강한 인생을 만듭니다.</p>
          <p className="pr-lead">혈당 {goals.glucose_low}~{goals.glucose_high}{goals.weight_goal != null && ` · 몸무게 ${goals.weight_goal.toFixed(1)}kg`}{goals.move_goal != null && ` · 운동 주 ${goals.move_goal}시간`}</p>
          <button type="button" className="btn" onClick={() => setGoalOpen(true)}>목표 정하기</button>
        </section>
      </div>

      <GlucoseSheet form={gForm} today={today} onClose={() => setGForm(null)} save={glu.save} remove={glu.remove} />
      <WeightSheet form={wForm} today={today} onClose={() => setWForm(null)} save={wei.save} remove={wei.remove} />
      <GoalsSheet open={goalOpen} goals={goals} onClose={() => setGoalOpen(false)} save={onGoals} />
    </section>
  );
}
