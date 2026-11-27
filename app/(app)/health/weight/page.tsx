"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TrendGraph from "@/components/HealthCharts";
import { Missing, WeightSheet, useWeights } from "@/components/HealthParts";
import { getGoals } from "@/lib/data";
import { NO_GOALS, SPANS, clock12, daily, dayAgo, dayName, newestFirst, within, type Goals, type Weight } from "@/lib/health";
import { todayParts } from "@/lib/util";

const r1 = (v: number) => Math.round(v * 10) / 10;
const signed = (v: number) => `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}`;

// 몸무게 상세: 가장 최근 값과 앞의 기록과의 차이, 기간별 그래프, 그 기간에 적은 기록들
export default function WeightPage() {
  const t = useMemo(todayParts, []);
  const today = dayAgo(t, 0);
  const wei = useWeights(t);
  const [goals, setGoals] = useState<Goals>(NO_GOALS);
  const [span, setSpan] = useState(30); // 몸무게는 하루하루보다 흐름을 보는 것이라 한 달부터 보여 줍니다
  const [form, setForm] = useState<{ record?: Weight } | null>(null);
  useEffect(() => {
    let live = true;
    getGoals().then((g) => live && setGoals(g)).catch(() => {});
    return () => { live = false; };
  }, []);

  const all = newestFirst(wei.rows ?? []), last = all[0], before = all[1];
  const delta = last && before ? r1(last.value - before.value) : 0;
  const toGoal = last && goals.weight_goal != null ? r1(last.value - goals.weight_goal) : null;
  const rows = within(all, t, span);
  // 줄마다 그 앞(더 옛) 기록과의 차이를 같이 적습니다
  const diff = (r: Weight) => { const older = all[all.indexOf(r) + 1]; return older ? r1(r.value - older.value) : 0; };
  return (
    <section className="he">
      <header className="top">
        <div className="month">
          <Link className="nav" href="/health" aria-label="건강으로 돌아가기">‹</Link>
          <h1>몸무게</h1>
        </div>
        <div className="tools">
          <span className="seg" role="group" aria-label="보는 기간">
            {SPANS.map(([label, n]) => <button key={n} type="button" aria-pressed={span === n} onClick={() => setSpan(n)}>{label}</button>)}
          </span>
          <button type="button" className="btn primary" disabled={!wei.rows} onClick={() => setForm({})}>+ 몸무게 기록하기</button>
        </div>
      </header>

      {wei.missing ? <Missing /> : wei.rows && (
        <div className="he-detail">
          <div>
            <section className="blk he-last">
              <span className="lbl">최근 몸무게</span>
              {last ? (
                <>
                  <p className="he-num big">{last.value.toFixed(1)}<small>kg</small></p>
                  <span className="he-foot">
                    {[dayName(last.date, t), clock12(last.at)].filter(Boolean).join(" · ")}
                    {delta !== 0 && ` · 앞의 기록보다 ${signed(delta)}kg`}
                    {toGoal != null && (toGoal === 0 ? " · 목표에 닿았어요" : ` · 목표까지 ${Math.abs(toGoal).toFixed(1)}kg`)}
                  </span>
                </>
              ) : (
                <p className="msg">아직 적은 몸무게가 없어요. 위의 “+ 몸무게 기록하기”로 첫 기록을 남겨 보세요.</p>
              )}
            </section>
            <section className="blk">
              <h2>몸무게 변화</h2>
              <TrendGraph days={daily(all, t, span, true)} unit="kg" digits={1} goal={goals.weight_goal} violet height={260} many="가운데 마지막" />
            </section>
          </div>
          <section className="blk">
            <h2>기록 <small>최근 {span}일 · {rows.length}번</small></h2>
            <ul className="he-list">
              {rows.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setForm({ record: r })} aria-label={`${dayName(r.date, t)} ${clock12(r.at)}, ${r.value.toFixed(1)} kg. 눌러서 고치기`}>
                    <span className="when">{[dayName(r.date, t), clock12(r.at)].filter(Boolean).join(" · ")}</span>
                    <b>{r.value.toFixed(1)}<small>kg</small></b>
                    <span className="what">{r.memo}</span>
                    {diff(r) !== 0 && <em className="he-delta">{diff(r) > 0 ? "▲" : "▼"} {signed(diff(r))}</em>}
                  </button>
                </li>
              ))}
            </ul>
            {!rows.length && <p className="msg">이 기간에 적은 기록이 없어요.</p>}
          </section>
        </div>
      )}

      <WeightSheet form={form} today={today} onClose={() => setForm(null)} save={wei.save} remove={wei.remove} />
    </section>
  );
}
