// 메뉴와 버튼에 쓰는 선 아이콘. 매듭 로고와 같은 굵기의 선으로 직접 그렸습니다.
export type IconName =
  | "home" | "note" | "plan" | "momentum" | "time" | "about" | "more" | "out" | "play" | "book"
  | "check" | "done" | "trend" | "pen" | "bars"
  | "heart" | "drop" | "scale" | "move" | "bulb" | "flag";

const SHAPES: Record<IconName, React.ReactNode> = {
  home: <><path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5.5h4V20" /></>,
  note: <><rect x="4.5" y="3.5" width="15" height="17" rx="2" /><path d="M8 8.5h8M8 12h8M8 15.5h5" /></>,
  plan: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle className="dot" cx="12" cy="12" r="1" /></>,
  momentum: (
    <>
      <path d="M11 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5z" />
      <path d="M18 14.5c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z" />
    </>
  ),
  time: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.2 2" /></>,
  about: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5" /><circle className="dot" cx="12" cy="7.8" r="1" /></>,
  more: <><circle className="dot" cx="5.5" cy="12" r="1.5" /><circle className="dot" cx="12" cy="12" r="1.5" /><circle className="dot" cx="18.5" cy="12" r="1.5" /></>,
  out: <><path d="M10 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H10" /><path d="M14.5 8l4 4-4 4" /><path d="M18.5 12H10" /></>,
  play: <path className="dot" d="M8.5 5.5v13l10.5-6.5z" />,
  book: <><path d="M12 6.6c-1.8-1.3-4-1.9-6.5-1.7v12.6c2.5-.2 4.7.4 6.5 1.7 1.8-1.3 4-1.9 6.5-1.7V4.9c-2.5-.2-4.7.4-6.5 1.7z" /><path d="M12 6.6v12.6" /></>,
  // 메인의 카드 머리에 쓰는 것들: 할 일, 다 함, 오르는 선, 연필, 막대 그래프
  check: <><rect x="4.5" y="4.5" width="15" height="15" rx="3" /><path d="M8.3 12.2l2.6 2.6 4.9-5.3" /></>,
  done: <><circle cx="12" cy="12" r="8.5" /><path d="M8.2 12.3l2.6 2.6 5-5.4" /></>,
  trend: <><path d="M3.5 16.5 9 11l4 4 7.5-7.5" /><path d="M15.5 7.5h5v5" /></>,
  pen: <><path d="M5 19l1-4.2L16.3 4.5a1.8 1.8 0 0 1 2.6 0l.6.6a1.8 1.8 0 0 1 0 2.6L9.2 18z" /><path d="M14.4 6.4l3.2 3.2" /></>,
  bars: <path d="M5 19.5V13M10 19.5V8M15 19.5v-8M20 19.5V5" />,
  // 건강: 하트(메뉴), 물방울(혈당), 저울(몸무게), 맥박 선(운동), 전구(한마디), 깃발(목표)
  heart: <path d="M12 20.3S4 15.4 4 9.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.6c0 5.8-8 10.7-8 10.7z" />,
  drop: <><path d="M12 3.6c3 3.6 6 6.8 6 10.3a6 6 0 0 1-12 0c0-3.5 3-6.7 6-10.3z" /><path d="M9.2 14.3a2.9 2.9 0 0 0 2.4 2.7" /></>,
  scale: <><rect x="4" y="4.5" width="16" height="15.5" rx="3" /><path d="M8 10a5.6 5.6 0 0 1 8 0" /><path d="M12 10.3l1.7-2.3" /></>,
  move: <path d="M3 12.5h4l2.5-6.5 4 12 2.5-5.5h5" />,
  bulb: <><path d="M12 3.5a5.5 5.5 0 0 0-3.4 9.8c.6.5.9 1.2.9 2v.2h5v-.2c0-.8.3-1.5.9-2A5.5 5.5 0 0 0 12 3.5z" /><path d="M9.8 18h4.4M10.7 20.5h2.6" /></>,
  flag: <><path d="M6 20.5v-16" /><path d="M6 5h11l-2.3 3.8L17 12.5H6" /></>,
};

export default function Icon({ name }: { name: IconName }) {
  return <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">{SHAPES[name]}</svg>;
}
