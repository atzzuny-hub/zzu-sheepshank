"use client";
import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icons";
import { p2, ymd } from "@/lib/util";

export const GRAPH_DAYS = 90; // 가장 길게 보는 날 수. 메인이 이만큼의 체크를 불러옵니다
const SPANS: [string, number][] = [["1주", 7], ["1달", 30], ["3달", GRAPH_DAYS]];
const MINH = 160, PL = 36, PR = 20, PT = 22, PB = 24; // 그림의 가장 낮은 높이와 네 쪽 여백

// 메인의 실천 그래프 카드. 날마다 지킬 일 가운데 몇 %를 지켰는지를 선으로 잇고, 오늘 값에 이름표를 붙입니다.
// ids 는 지킬 일의 id, checks 는 "2026-11-27|<id>" 꼴의 체크 모음, today 는 오늘
export default function RateGraph({ ids, checks, today }: { ids: string[]; checks: Set<string>; today: { y: number; m: number; d: number } }) {
  const [span, setSpan] = useState(7);
  const [{ w, h: H }, setSize] = useState({ w: 0, h: MINH });
  const box = useRef<HTMLDivElement>(null);
  const fill = `rg${useId().replace(/[^\w-]/g, "")}`;
  const has = ids.length > 0;

  useEffect(() => {
    const el = box.current; if (!el) return;
    // 그림은 상자의 폭과 높이를 그대로 채웁니다. 카드가 옆 카드에 맞춰 길어지면 그래프도 같이 커집니다
    const read = () => {
      const w = el.clientWidth, h = Math.max(MINH, el.clientHeight);
      setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    const ro = new ResizeObserver(read);
    ro.observe(el); read();
    return () => ro.disconnect();
  }, [has]);

  const days = Array.from({ length: span }, (_, i) => {
    const dt = new Date(today.y, today.m, today.d - (span - 1 - i)), key = ymd(dt.getFullYear(), dt.getMonth(), dt.getDate());
    return { label: `${dt.getMonth() + 1}.${p2(dt.getDate())}`, pc: has ? (ids.filter((id) => checks.has(`${key}|${id}`)).length / ids.length) * 100 : 0 };
  });
  const x = (i: number) => PL + (i / (span - 1)) * (w - PL - PR);
  const y = (pc: number) => PT + (1 - pc / 100) * (H - PT - PB);
  const pts = days.map((d, i) => `${x(i).toFixed(1)},${y(d.pc).toFixed(1)}`);
  const now = Math.round(days[span - 1].pc), nx = x(span - 1), ny = y(days[span - 1].pc);
  const avg = Math.round(days.reduce((s, d) => s + d.pc, 0) / span);
  // 날짜는 글자가 겹치지 않을 만큼만 적습니다 (오늘에서 거꾸로 몇 칸마다)
  const every = Math.max(1, Math.ceil((span - 1) / Math.max(1, Math.floor((w - PL - PR) / 40))));

  return (
    <>
      <h2>
        <Icon name="trend" />실천 그래프
        {has && (
          <span className="seg" role="group" aria-label="보는 기간">
            {SPANS.map(([label, n]) => <button key={n} type="button" aria-pressed={span === n} onClick={() => setSpan(n)}>{label}</button>)}
          </span>
        )}
      </h2>
      {has ? (
        <div className="rg" ref={box}>
          {w > 0 && (
            <svg width={w} height={H} role="img" aria-label={`최근 ${span}일 동안 날마다 지킨 일의 비율. 오늘 ${now}%, 평균 ${avg}%`}>
              <defs>
                <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1"><stop className="a" offset="0" /><stop className="b" offset="1" /></linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((v) => (
                <g key={v}>
                  <line className={v ? "grid" : undefined} x1={PL} x2={w - PR + 10} y1={y(v)} y2={y(v)} />
                  <text x={PL - 7} y={y(v) + 4} textAnchor="end">{v}%</text>
                </g>
              ))}
              {days.map((d, i) => (span - 1 - i) % every === 0 && <text key={i} x={x(i)} y={H - 5} textAnchor="middle">{d.label}</text>)}
              <path fill={`url(#${fill})`} d={`M${pts.join("L")}L${nx.toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`} />
              <polyline points={pts.join(" ")} />
              {span <= 31 && days.slice(0, -1).map((d, i) => <circle key={i} cx={x(i)} cy={y(d.pc)} r={span > 7 ? 2.2 : 3.2} />)}
              <circle className="now" cx={nx} cy={ny} r={4.5} />
              {/* 오늘 값의 이름표. 점 위에 두고, 위가 좁으면 점 아래에 둡니다 */}
              <g className="tag" transform={`translate(${Math.min(nx, w - 23).toFixed(1)},${(ny < 32 ? ny + 24 : ny - 18).toFixed(1)})`}>
                <rect x={-21} y={-10} width={42} height={20} rx={10} /><text y={4} textAnchor="middle">{now}%</text>
              </g>
            </svg>
          )}
        </div>
      ) : (
        <p className="msg">계획에서 별표로 뽑은 일이 생기면, 날마다 얼마나 지켰는지 여기에 그려져요.</p>
      )}
    </>
  );
}
