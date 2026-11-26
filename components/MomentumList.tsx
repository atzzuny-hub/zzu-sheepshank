"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/Shell";
import { getJournalsIn } from "@/lib/data";
import { WD, ym, ymd, type Journal } from "@/lib/util";

const STEPS = [["pour", "쏟아내기"], ["listen", "알아주기"], ["teach", "가르치기"]] as const;
// 목록에는 글의 첫 줄만, 너무 길면 앞부분만 보여 줍니다
const firstLine = (s: string) => Array.from(s.split("\n").find((l) => l.trim())?.trim() ?? "").slice(0, 120).join("");

// 노트의 표 아래에 놓이는, 그 달에 모멘텀 글을 쓴 날의 목록. 누르면 그날의 글이 열립니다.
export default function MomentumList({ y, m }: { y: number; m: number }) {
  const { setStatus } = useApp();
  const [got, setGot] = useState<{ key: string; rows: (Journal & { d: number })[] }>({ key: "", rows: [] });

  useEffect(() => {
    let live = true;
    getJournalsIn(y, m)
      .then((rows) => { if (live) setGot({ key: ym(y, m), rows }); })
      .catch(() => live && setStatus("불러오지 못했어요. 새로고침해 보세요."));
    return () => { live = false; };
  }, [y, m, setStatus]);

  // 달을 넘기면 새 달의 글이 올 때까지 비워 둡니다
  const ready = got.key === ym(y, m);
  // 단계마다 글이 있는지 보고, 세 단계가 다 비어 있는 날은 뺍니다
  const days = (ready ? got.rows : [])
    .map((r) => ({ d: r.d, steps: STEPS.map(([k, name], i) => ({ n: i + 1, name, text: r[k] })).filter((s) => s.text.trim()) }))
    .filter((r) => r.steps.length);

  return (
    <section className="blk mom">
      <h2>모멘텀 <small>{m + 1}월에 쓴 날{ready ? ` ${days.length}일` : ""}</small></h2>
      {ready && !days.length && <p className="msg">아직 쓴 글이 없어요.</p>}
      <ul className="mlist">
        {days.map(({ d, steps }) => {
          const wd = new Date(y, m, d).getDay();
          return (
            <li key={d}>
              <Link href={`/momentum?date=${ymd(y, m, d)}&step=${steps[0].n}`}>
                <span className="day"><span className="d">{d}</span><span className={`w${wd === 0 ? " sun" : ""}`}>{WD[wd]}</span></span>
                <span className="tx">{firstLine(steps[0].text)}</span>
                <span className="st">{steps.map((s) => s.name).join(" · ")}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
