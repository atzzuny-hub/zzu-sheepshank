"use client";
import Link from "next/link";
import { useState } from "react";
import { sb, configured } from "@/lib/supabase";
import Knot from "@/components/Knot";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");

  async function send() {
    if (!email.includes("@") || !configured) return;
    setState("sending");
    const { error } = await sb().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setErr(error.message); setState("error"); } else setState("sent");
  }

  return (
    <div className="wrap login">
      <Link className="brand" href="/" aria-label="Sheepshank"><Knot /></Link>
      <h1>Sheepshank</h1>
      {state === "sent" ? (
        <p className="msg">{email} 로 로그인 링크를 보냈어요. 메일의 링크를 누르면 바로 들어옵니다.</p>
      ) : (
        <>
          <p>이메일로 로그인 링크를 보내 드려요. 비밀번호는 필요 없습니다.</p>
          <label htmlFor="email">이메일</label>
          <input id="email" type="email" autoComplete="email" value={email} placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
          <button className="btn primary" onClick={send} disabled={state === "sending"}>
            {state === "sending" ? "보내는 중…" : "로그인 링크 받기"}
          </button>
          {state === "error" && <p className="msg">링크를 보내지 못했어요. {err}</p>}
          {!configured && <p className="msg">.env.local 파일에 Supabase 주소와 공개 키를 먼저 넣어 주세요.</p>}
        </>
      )}
    </div>
  );
}
