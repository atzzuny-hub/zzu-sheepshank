"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sb, configured } from "@/lib/supabase";

// 메일의 로그인 링크가 돌아오는 곳. Supabase 가 주소에 담긴 정보를 읽어 로그인시킵니다.
export default function Callback() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!configured) return;
    const { data } = sb().auth.onAuthStateChange((_e, s) => { if (s) router.replace("/"); });
    sb().auth.getSession().then(({ data: d }) => { if (d.session) router.replace("/"); });
    const t = setTimeout(() => setFailed(true), 6000);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, [router]);
  return (
    <div className="wrap login">
      {failed ? (
        <p className="msg">로그인하지 못했어요. 링크가 만료됐을 수 있습니다. <Link href="/login">링크 다시 받기</Link></p>
      ) : (
        <p>로그인하는 중…</p>
      )}
    </div>
  );
}
