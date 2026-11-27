"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { sb, configured } from "@/lib/supabase";
import Knot from "./Knot";
import About from "./About";
import Icon, { type IconName } from "./Icons";

type App = { uid: string; setStatus: (s: string) => void; queue: (key: string, fn: () => Promise<unknown>) => void };
const Ctx = createContext<App | null>(null);
export function useApp(): App {
  const v = useContext(Ctx);
  if (!v) throw new Error("Shell 안에서만 쓸 수 있습니다");
  return v;
}

// 저장을 잠깐 모았다가 한 번에 보냅니다. 화면을 옮겨도 타이머는 살아 있습니다.
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let pending = 0;

// 폰과 좁은 창에서는 앞의 여섯 개가 아래 탭바에 놓이고 소개는 메뉴(⋯) 안으로 들어갑니다.
// 넓은 창에서는 일곱 개가 모두 왼쪽 옆줄에 놓입니다. 배치는 globals.css 의 "틀" 부분이 정합니다.
const TABS: [string, string, IconName][] = [
  ["/", "메인", "home"], ["/note", "노트", "note"], ["/plan", "계획", "plan"],
  ["/momentum", "모멘텀", "momentum"], ["/time", "시간", "time"], ["/health", "건강", "heart"], ["/about", "소개", "about"],
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(), router = useRouter();
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [status, setStatus] = useState("");
  const menu = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!configured) return;
    sb().auth.getSession().then(({ data }) => setUid(data.session?.user.id ?? null));
    const { data } = sb().auth.onAuthStateChange((_e, s) => setUid(s?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (uid === null && path !== "/") router.replace("/login");
  }, [uid, path, router]);

  const queue = useCallback((key: string, fn: () => Promise<unknown>) => {
    const old = timers.get(key);
    if (old) clearTimeout(old); else pending++;
    setStatus("저장 중…");
    timers.set(key, setTimeout(async () => {
      timers.delete(key);
      try { await fn(); pending--; if (pending <= 0) { pending = 0; setStatus("저장됨"); } }
      catch { pending--; setStatus("저장하지 못했어요. 잠시 뒤 다시 고쳐 보세요."); }
    }, 600));
  }, []);
  const app = useMemo(() => (uid ? { uid, setStatus, queue } : null), [uid, queue]);

  if (!configured)
    return (
      <div className="wrap login">
        <h1>Sheepshank</h1>
        <p>.env.local 파일에 Supabase 주소와 공개 키를 넣고 개발 서버를 다시 시작해 주세요.</p>
      </div>
    );
  if (uid === undefined) return <div className="wrap"><p className="status">불러오는 중…</p></div>;
  if (uid === null)
    return path === "/" ? <div className="main"><div className="wrap"><About loggedOut /></div></div> : null;

  // 폰에서는 저장 상태가 탭바 위에 작게 뜹니다. 저장됨과 안내는 잠깐 보였다 사라지고, 실패는 다시 저장될 때까지 남습니다.
  const tone = !status ? "" : status === "저장됨" ? " ok" : status === "저장 중…" ? " busy" : status.includes("못했어요") ? " fail" : " note";
  const logout = () => { menu.current?.close(); sb().auth.signOut(); };

  return (
    <Ctx.Provider value={app}>
      <div className="app">
        <header className="side">
          <div className="topbar">
            <Link className="brand" href="/" aria-label="Sheepshank 메인으로">
              <Knot /><span>Sheepshank</span>
            </Link>
            <button type="button" className="more" aria-label="메뉴 열기" onClick={() => menu.current?.showModal()}>
              <Icon name="more" />
            </button>
          </div>
          <nav className="pages" aria-label="페이지">
            {TABS.map(([href, label, icon]) => (
              // 건강의 상세 화면(/health/glucose 같은 곳)에서도 건강 메뉴에 불이 들어옵니다
              <Link key={href} href={href} aria-current={path === href || (href !== "/" && path.startsWith(`${href}/`)) ? "page" : undefined}>
                <Icon name={icon} /><span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="side-foot">
            <span className={`status${tone}`} role="status">{status}</span>
            <button type="button" className="out" onClick={logout}><Icon name="out" /><span>로그아웃</span></button>
          </div>
        </header>
        {/* .main 은 옆줄을 뺀 화면 영역 전체. 소개의 밤하늘처럼 이 폭을 끝까지 채우는 그림이 기준으로 삼습니다 */}
        <div className="main"><div className="wrap">{children}</div></div>
        <dialog ref={menu} className="menu" aria-label="메뉴" onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
          <div className="menu-in">
            <Link href="/about" onClick={() => menu.current?.close()}><Icon name="about" /><span>소개</span></Link>
            <button type="button" onClick={logout}><Icon name="out" /><span>로그아웃</span></button>
            <button type="button" className="close" onClick={() => menu.current?.close()}>닫기</button>
          </div>
        </dialog>
      </div>
    </Ctx.Provider>
  );
}
