"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TrendGraph from "@/components/HealthCharts";
import { GlucoseSheet, Missing, useGlucose } from "@/components/HealthParts";
import { getGoals } from "@/lib/data";
import { BAND_NAME, NO_GOALS, SPANS, bandOf, clock12, daily, dayAgo, dayName, newestFirst, within, type Glucose, type Goals } from "@/lib/health";
import { todayParts } from "@/lib/util";

// 혈당 상세: 가장 최근 값, 기간별 그래프, 그 기간에 적은 기록들. 기록을 누르면 고치거나 지웁니다
export default function GlucosePage() {
  const t = useMemo(todayParts, []);
  const today = dayAgo(t, 0);
  const glu = useGlucose(t);
  const [goals, setGoals] = useState<Goals>(NO_GOALS);
  const [span, setSpan] = useState(7);
  const [form, setForm] = useState<{ record?: Glucose } | null>(null);
  useEffect(() => {
    let live = true;
    getGoals().then((g) => live && setGoals(g)).catch(() => {});
    return () => { live = false; };
  }, []);

  const all = glu.rows ?? [], last = newestFirst(all)[0], rows = newestFirst(within(all, t, span));
  return (
    <section className="he">
      <header className="top">
        <div className="month">
          <Link className="nav" href="/health" aria-label="건강으로 돌아가기">‹</Link>
          <h1>혈당</h1>
        </div>
        <div className="tools">
          <span className="seg" role="group" aria-label="보는 기간">
            {SPANS.map(([label, n]) => <button key={n} type="button" aria-pressed={span === n} onClick={() => setSpan(n)}>{label}</button>)}
          </span>
          <button type="button" className="btn primary" disabled={!glu.rows} onClick={() => setForm({})}>+ 혈당 기록하기</button>
        </div>
      </header>

      {glu.missing ? <Missing /> : glu.rows && (
        <div className="he-detail">
          <div>
            <section className="blk he-last">
              <span className="lbl">최근 혈당</span>
              {last ? (
                <>
                  <p className="he-num big">{last.value}<small>mg/dL</small><em className={`he-badge ${bandOf(last.value, goals)}`}>{BAND_NAME[bandOf(last.value, goals)]}</em></p>
                  <span className="he-foot">{[dayName(last.date, t), clock12(last.at), last.kind].filter(Boolean).join(" · ")} · 내 범위 {goals.glucose_low}~{goals.glucose_high}</span>
                </>
              ) : (
                <p className="msg">아직 적은 혈당이 없어요. 위의 “+ 혈당 기록하기”로 첫 기록을 남겨 보세요.</p>
              )}
            </section>
            <section className="blk">
              <h2>혈당 그래프 <small>하루에 여러 번 잰 날은 평균</small></h2>
              <TrendGraph days={daily(all, t, span)} unit="mg/dL" band={[goals.glucose_low, goals.glucose_high]} height={260} />
            </section>
          </div>
          <section className="blk">
            <h2>기록 <small>최근 {span}일 · {rows.length}번</small></h2>
            <ul className="he-list">
              {rows.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setForm({ record: r })} aria-label={`${dayName(r.date, t)} ${clock12(r.at)}, ${r.value} mg/dL. 눌러서 고치기`}>
                    <span className="when">{[dayName(r.date, t), clock12(r.at)].filter(Boolean).join(" · ")}</span>
                    <b>{r.value}<small>mg/dL</small></b>
                    <span className="what">{[r.kind, r.memo].filter(Boolean).join(" · ")}</span>
                    <em className={`he-badge ${bandOf(r.value, goals)}`}>{BAND_NAME[bandOf(r.value, goals)]}</em>
                  </button>
                </li>
              ))}
            </ul>
            {!rows.length && <p className="msg">이 기간에 적은 기록이 없어요.</p>}
          </section>
        </div>
      )}

      <GlucoseSheet form={form} today={today} onClose={() => setForm(null)} save={glu.save} remove={glu.remove} />
    </section>
  );
}
