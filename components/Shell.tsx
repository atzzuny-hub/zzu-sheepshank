"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { sb, configured } from "@/lib/supabase";
import Knot from "./Knot";
import About from "./About";

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

const TABS = [["/", "메인"], ["/note", "노트"], ["/plan", "계획"], ["/momentum", "모멘텀"], ["/time", "시간"], ["/about", "소개"]];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(), router = useRouter();
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [status, setStatus] = useState("");

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
    return path === "/" ? <div className="wrap"><About loggedOut /></div> : null;

  return (
    <Ctx.Provider value={app}>
      <div className="wrap">
        <Link className="brand" href="/" aria-label="Sheepshank 메인으로">
          <Knot /><span>Sheepshank</span>
        </Link>
        <nav className="pages" aria-label="페이지">
          {TABS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>
          ))}
          <span className="status" role="status">{status}</span>
          <button className="out" onClick={() => sb().auth.signOut()}>로그아웃</button>
        </nav>
        {children}
      </div>
    </Ctx.Provider>
  );
}
