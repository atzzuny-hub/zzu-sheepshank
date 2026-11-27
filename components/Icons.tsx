// 메뉴와 버튼에 쓰는 선 아이콘. 매듭 로고와 같은 굵기의 선으로 직접 그렸습니다.
export type IconName = "home" | "note" | "plan" | "momentum" | "time" | "about" | "more" | "out" | "play" | "book";

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
};

export default function Icon({ name }: { name: IconName }) {
  return <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">{SHAPES[name]}</svg>;
}
