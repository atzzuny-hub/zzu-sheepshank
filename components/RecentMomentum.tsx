"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/Shell";
import { getRecentJournals } from "@/lib/data";
import type { Journal } from "@/lib/util";

const KEYS = ["pour", "listen", "teach"] as const; // 쏟아내기, 알아주기, 가르치기 순서
// 목록에는 글의 첫 줄만, 너무 길면 앞부분만 보여 줍니다
const firstLine = (s: string) => Array.from(s.split("\n").find((l) => l.trim())?.trim() ?? "").slice(0, 120).join("");
// 글이 있는 단계만 추립니다 (n 은 1·2·3 단계 번호)
const written = (j: Journal) => KEYS.map((k, i) => ({ n: i + 1, text: j[k] })).filter((s) => s.text.trim());
const RECENT = 5; // 처음에 보여 줄 최근 기록의 수
const MORE = 30; // '전체 보기'와 '더 보기'를 누를 때마다 늘어나는 수

// 모멘텀 화면 아래에 놓이는 최근 기록. 날짜, 글의 첫 줄, 어느 단계까지 썼는지를 보여 주고, 누르면 그날의 글이 열립니다.
// date 는 지금 화면에 열려 있는 날, j 는 그날의 글(불러오는 중이면 null). 쓰는 글은 저장을 기다리지 않고 목록에 바로 비칩니다.
export default function RecentMomentum({ date, j }: { date: string; j: Journal | null }) {
  const { setStatus } = useApp();
  const [limit, setLimit] = useState(RECENT);
  const [rows, setRows] = useState<(Journal & { date: string })[] | null>(null);
  const root = useRef<HTMLElement>(null);

  // 더 있는지 알려고 보여 줄 수보다 하나 더 불러옵니다
  useEffect(() => {
    let live = true;
    getRecentJournals(limit + 1)
      .then((r) => { if (live) setRows(r); })
      .catch(() => live && setStatus("불러오지 못했어요. 새로고침해 보세요."));
    return () => { live = false; };
  }, [date, limit, setStatus]);
  // 메인의 '지난 글'로 들어오면(주소 끝이 #recent) 이 목록으로 내려옵니다.
  // 위의 종이는 글 길이만큼 늘어나서, 목록과 그날의 글을 다 불러온 뒤에 자리를 잡습니다
  const settled = !!rows && !!j;
  useEffect(() => {
    if (settled && window.location.hash === "#recent") root.current?.scrollIntoView({ block: "start" });
  }, [settled]);

  // 지금 열려 있는 날은 화면의 글로 바꿔 넣고, 세 단계가 다 비어 있는 날은 뺍니다
  const all = [...(j ? [{ date, ...j }] : []), ...(rows ?? []).filter((r) => !j || r.date !== date)]
    .map((r) => ({ date: r.date, steps: written(r) }))
    .filter((r) => r.steps.length)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const open = limit > RECENT, more = all.length > limit;

  return (
    <section className="blk recent" id="recent" ref={root}>
      <h2>
        최근 모멘텀 기록
        {(open || more) && <button type="button" onClick={() => setLimit(open ? RECENT : MORE)}>{open ? "접기" : "전체 보기 →"}</button>}
      </h2>
      {rows && !all.length && <p className="msg">아직 쓴 글이 없어요.</p>}
      <ul className="mlist">
        {all.slice(0, limit).map(({ date: d, steps }) => (
          <li key={d}>
            <Link href={`/momentum?date=${d}&step=${steps[0].n}`} aria-current={d === date ? "true" : undefined} onClick={() => window.scrollTo(0, 0)}>
              <span className="dt">{+d.slice(5, 7)}월 {+d.slice(8, 10)}일</span>
              <span className="tx">{firstLine(steps[0].text)}</span>
              <span className="badge">{steps[steps.length - 1].n}단계</span>
            </Link>
          </li>
        ))}
      </ul>
      {open && more && <button type="button" className="btn mmore" onClick={() => setLimit(limit + MORE)}>더 보기</button>}
    </section>
  );
}
