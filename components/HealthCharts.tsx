"use client";
import { useEffect, useRef, useState } from "react";
import type { Day } from "@/lib/health";

const PL = 44, PR = 24, PT = 28, PB = 24; // 그림의 네 쪽 여백
const STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 500]; // 눈금 간격으로 쓰기 좋은 수

// 건강 화면의 꺾은선 그래프(혈당, 몸무게). 날짜순의 하루하루를 받아, 기록이 있는 날끼리 선으로 잇습니다.
// band 는 내가 정한 범위(혈당), goal 은 목표 한 줄(몸무게), digits 는 소수 자릿수, height 는 가장 낮은 높이.
// 카드가 옆 카드에 맞춰 길어지면 그래프도 같이 커집니다. 점에 마우스를 올리거나 손가락으로 누르면 그날의 값을 보여 줍니다
// many 는 하루에 여러 번 잰 날의 값이 무엇인지 알리는 말 ("평균", "가운데 마지막")
export default function TrendGraph({ days, unit, digits = 0, band, goal, violet, height = 200, many = "평균" }: {
  days: Day[]; unit: string; digits?: number; band?: [number, number]; goal?: number | null; violet?: boolean; height?: number; many?: string;
}) {
  const [{ w, h: H }, setSize] = useState({ w: 0, h: height });
  const [hot, setHot] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const read = () => {
      const w = el.clientWidth, h = Math.max(height, el.clientHeight);
      setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    const ro = new ResizeObserver(read);
    ro.observe(el); read();
    return () => ro.disconnect();
  }, [height]);

  const n = days.length;
  const pts = days.flatMap((d, i) => (d.avg == null ? [] : [{ i, avg: d.avg, day: d }]));
  const cls = `tg${violet ? " violet" : ""}`;
  if (!pts.length) return <div className={cls} ref={box} style={{ minHeight: height }}><p className="msg">이 기간에 적은 기록이 없어요.</p></div>;

  // 세로 눈금: 기록과 범위·목표가 다 들어오는 구간을, 쓰기 좋은 간격으로 네 칸 안팎
  const all = [...days.flatMap((d) => d.values), ...(band ?? []), ...(goal != null ? [goal] : [])];
  const lo = Math.min(...all), hi = Math.max(...all);
  const step = STEPS.find((s) => (hi - lo) / s <= 4) ?? 1000;
  const y0 = Math.floor(lo / step + 1e-9) * step, top = Math.ceil(hi / step - 1e-9) * step, y1 = top > y0 ? top : y0 + step;
  const ticks = Array.from({ length: Math.round((y1 - y0) / step) + 1 }, (_, k) => y0 + k * step);
  const x = (i: number) => PL + (n > 1 ? i / (n - 1) : 0.5) * (w - PL - PR);
  const y = (v: number) => PT + (1 - (v - y0) / (y1 - y0)) * (H - PT - PB);
  const f = (v: number) => v.toFixed(digits);
  const last = pts[pts.length - 1];
  const every = Math.max(1, Math.ceil((n - 1) / Math.max(1, Math.floor((w - PL - PR) / 42)))); // 날짜를 몇 칸마다 적을지
  const col = Math.max(14, n > 1 ? (w - PL - PR) / (n - 1) : w - PL - PR); // 점 하나가 손가락을 받는 폭
  const on = hot != null ? pts.find((p) => p.i === hot) : undefined;
  const tipX = on ? Math.min(Math.max(x(on.i), PL + 46), w - 50) : 0, tipY = on ? (y(on.avg) < 62 ? y(on.avg) + 16 : y(on.avg) - 50) : 0;

  return (
    <div className={cls} ref={box} style={{ minHeight: height }}>
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label={`최근 ${n}일. 가장 최근 기록 ${f(last.avg)} ${unit}`}>
          {ticks.map((v) => (
            <g key={v}>
              <line className="grid" x1={PL} x2={w - PR + 10} y1={y(v)} y2={y(v)} />
              <text x={PL - 7} y={y(v) + 4} textAnchor="end">{step < 1 ? v.toFixed(1) : Math.round(v)}</text>
            </g>
          ))}
          {band && (
            <>
              <rect className="band" x={PL} y={y(band[1])} width={w - PL - PR + 10} height={y(band[0]) - y(band[1])} />
              <line className="edge" x1={PL} x2={w - PR + 10} y1={y(band[1])} y2={y(band[1])} />
              <line className="edge" x1={PL} x2={w - PR + 10} y1={y(band[0])} y2={y(band[0])} />
            </>
          )}
          {goal != null && (
            <>
              <line className="edge" x1={PL} x2={w - PR + 10} y1={y(goal)} y2={y(goal)} />
              <text className="cap" x={PL + 4} y={y(goal) - 5}>목표 {f(goal)}</text>
            </>
          )}
          {days.map((d, i) => (n - 1 - i) % every === 0 && <text key={d.date} x={x(i)} y={H - 5} textAnchor="middle">{d.label}</text>)}
          <polyline points={pts.map((p) => `${x(p.i).toFixed(1)},${y(p.avg).toFixed(1)}`).join(" ")} />
          {/* 하루에 여러 번 잰 날은 잰 값들을 옅은 점으로 같이 찍습니다 */}
          {pts.flatMap((p) => (p.day.values.length > 1 ? p.day.values.map((v, k) => <circle key={`${p.i}-${k}`} className="each" cx={x(p.i)} cy={y(v)} r={2} />) : []))}
          {n <= 31 && pts.slice(0, -1).map((p) => <circle key={p.i} cx={x(p.i)} cy={y(p.avg)} r={n > 7 ? 2.4 : 3.4} />)}
          <circle className="now" cx={x(last.i)} cy={y(last.avg)} r={4.8} />
          {!on && (
            <g className="tag" transform={`translate(${Math.min(x(last.i), w - 42).toFixed(1)},${(y(last.avg) < 36 ? y(last.avg) + 24 : y(last.avg) - 18).toFixed(1)})`}>
              <rect x={-40} y={-11} width={80} height={21} rx={10.5} /><text y={4} textAnchor="middle">{f(last.avg)} {unit}</text>
            </g>
          )}
          {pts.map((p) => (
            <rect key={p.i} className="hit" x={x(p.i) - col / 2} y={PT - 8} width={col} height={H - PT - PB + 16}
              onPointerEnter={(e) => { if (e.pointerType === "mouse") setHot(p.i); }}
              onPointerLeave={(e) => { if (e.pointerType === "mouse") setHot(null); }}
              onPointerDown={(e) => { if (e.pointerType !== "mouse") setHot(hot === p.i ? null : p.i); }} />
          ))}
          {on && (
            <g className="tip" pointerEvents="none">
              <line x1={x(on.i)} x2={x(on.i)} y1={PT - 6} y2={H - PB} />
              <circle className="now" cx={x(on.i)} cy={y(on.avg)} r={4.8} />
              <g transform={`translate(${tipX.toFixed(1)},${tipY.toFixed(1)})`}>
                <rect x={-46} y={0} width={on.day.values.length > 1 ? 132 : 92} height={38} rx={8} />
                <text className="d" x={-38} y={15}>{on.day.label}{on.day.values.length > 1 ? ` · ${on.day.values.length}번 ${many}` : ""}</text>
                <text className="v" x={-38} y={31}>{f(on.avg)} {unit}</text>
              </g>
            </g>
          )}
        </svg>
      )}
    </div>
  );
}

// 숫자 카드 구석의 작은 선: 기간 동안의 오르내림만 보여 줍니다 (기록이 없는 날은 건너뜁니다)
export function Spark({ values }: { values: (number | null)[] }) {
  const pts = values.flatMap((v, i) => (v == null ? [] : [[i, v]]));
  if (pts.length < 2) return null;
  const lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1])), n = values.length;
  const at = ([i, v]: number[]) => `${((i / (n - 1)) * 100).toFixed(1)},${(hi === lo ? 14 : 24 - ((v - lo) / (hi - lo)) * 20).toFixed(1)}`;
  return (
    <svg className="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts.map(at).join(" ")} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// 숫자 카드 구석의 작은 막대: 운동 시간처럼 쌓이는 값에 씁니다 (가장 큰 값이 꽉 찬 막대)
export function Bars({ values }: { values: number[] }) {
  const hi = Math.max(...values, 1);
  return (
    <span className="bars" aria-hidden="true">
      {values.map((v, i) => <i key={i} style={{ height: `${Math.max(v > 0 ? 12 : 4, (v / hi) * 100)}%` }} />)}
    </span>
  );
}

// 통계의 고리: ratio(0~1)만큼 채우고, 가운데에 children 을 적습니다
export function Ring({ ratio, tone, children }: { ratio: number; tone?: "up" | "violet"; children: React.ReactNode }) {
  const C = 2 * Math.PI * 40, r = Math.max(0, Math.min(1, ratio));
  return (
    <span className={`ring${tone ? ` ${tone}` : ""}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="bg" cx="50" cy="50" r="40" />
        <circle cx="50" cy="50" r="40" strokeDasharray={`${(r * C).toFixed(1)} ${C.toFixed(1)}`} />
      </svg>
      <b>{children}</b>
    </span>
  );
}
