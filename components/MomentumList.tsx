"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/Shell";
import { getJournalsIn, getRecentJournals } from "@/lib/data";
import { WD, ym, ymd, type Journal } from "@/lib/util";

const STEPS = [["pour", "쏟아내기"], ["listen", "알아주기"], ["teach", "가르치기"]] as const;
// 목록에는 글의 첫 줄만, 너무 길면 앞부분만 보여 줍니다
const firstLine = (s: string) => Array.from(s.split("\n").find((l) => l.trim())?.trim() ?? "").slice(0, 120).join("");
// 글이 있는 단계만 추립니다 (n 은 1·2·3 단계 번호)
const written = (j: Journal) => STEPS.map(([k, name], i) => ({ n: i + 1, name, text: j[k] })).filter((s) => s.text.trim());
const RECENT = 5; // 모멘텀 화면 아래에 보여 줄 최근 기록의 수

// 모멘텀 화면 아래에 놓이는 최근 기록. 날짜, 글의 첫 줄, 어느 단계까지 썼는지를 보여 주고, 누르면 그날의 글이 열립니다.
// date 는 지금 화면에 열려 있는 날, j 는 그날의 글(불러오는 중이면 null). 쓰는 글은 저장을 기다리지 않고 목록에 바로 비칩니다.
export function RecentMomentum({ date, j }: { date: string; j: Journal | null }) {
  const { setStatus } = useApp();
  const [rows, setRows] = useState<(Journal & { date: string })[] | null>(null);

  useEffect(() => {
    let live = true;
    getRecentJournals(RECENT + 1)
      .then((r) => { if (live) setRows(r); })
      .catch(() => live && setStatus("불러오지 못했어요. 새로고침해 보세요."));
    return () => { live = false; };
  }, [date, setStatus]);

  // 지금 열려 있는 날은 화면의 글로 바꿔 넣고, 세 단계가 다 비어 있는 날은 뺍니다
  const list = [...(j ? [{ date, ...j }] : []), ...(rows ?? []).filter((r) => !j || r.date !== date)]
    .map((r) => ({ date: r.date, steps: written(r) }))
    .filter((r) => r.steps.length)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, RECENT);

  return (
    <section className="blk recent">
      <h2>최근 모멘텀 기록 <Link href="/note#mom">전체 보기 →</Link></h2>
      {rows && !list.length && <p className="msg">아직 쓴 글이 없어요.</p>}
      <ul className="mlist">
        {list.map(({ date: d, steps }) => (
          <li key={d}>
            <Link href={`/momentum?date=${d}&step=${steps[0].n}`} aria-current={d === date ? "true" : undefined} onClick={() => window.scrollTo(0, 0)}>
              <span className="dt">{+d.slice(5, 7)}월 {+d.slice(8, 10)}일</span>
              <span className="tx">{firstLine(steps[0].text)}</span>
              <span className="badge">{steps[steps.length - 1].n}단계</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

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
  const days = (ready ? got.rows : []).map((r) => ({ d: r.d, steps: written(r) })).filter((r) => r.steps.length);

  return (
    <section className="blk mom" id="mom">
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
