"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sb, configured } from "@/lib/supabase";
import Knot from "@/components/Knot";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    if (!configured || busy) return;
    if (!email.includes("@")) { setMsg("이메일을 확인해 주세요."); return; }
    if (pw.length < 6) { setMsg("비밀번호는 6자 이상이어야 해요."); return; }
    setBusy(true); setMsg("");
    const auth = sb().auth, cred = { email: email.trim(), password: pw };
    if (mode === "in") {
      const { error } = await auth.signInWithPassword(cred);
      setBusy(false);
      if (error) setMsg("이메일이나 비밀번호가 맞지 않아요. 처음이라면 아래에서 가입해 주세요.");
      else router.replace("/");
    } else {
      const { data, error } = await auth.signUp(cred);
      setBusy(false);
      if (error) setMsg(`가입하지 못했어요. ${error.message}`);
      else if (data.session) router.replace("/");
      else { setMode("in"); setMsg("확인 메일을 보냈어요. 메일의 링크를 누른 뒤 여기서 로그인해 주세요."); }
    }
  }
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === "Enter") submit(); };

  return (
    <div className="wrap login">
      <Link className="brand" href="/" aria-label="Sheepshank"><Knot /></Link>
      <h1>Sheepshank</h1>
      <p>{mode === "in" ? "이메일과 비밀번호로 로그인합니다." : "쓸 이메일과 비밀번호를 정해 주세요."}</p>
      <label htmlFor="email">이메일</label>
      <input id="email" type="email" autoComplete="email" value={email} placeholder="you@example.com"
        onChange={(e) => setEmail(e.target.value)} onKeyDown={onEnter} />
      <label htmlFor="pw">비밀번호</label>
      <input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={pw}
        placeholder="6자 이상" onChange={(e) => setPw(e.target.value)} onKeyDown={onEnter} />
      <button className="btn primary" onClick={submit} disabled={busy}>
        {busy ? "잠시만요…" : mode === "in" ? "로그인" : "가입하고 시작하기"}
      </button>
      <button className="btn again" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }}>
        {mode === "in" ? "처음이에요. 가입하기" : "이미 계정이 있어요. 로그인"}
      </button>
      {msg && <p className="msg" role="alert">{msg}</p>}
      {!configured && <p className="msg">.env.local 파일에 Supabase 주소와 공개 키를 먼저 넣어 주세요.</p>}
    </div>
  );
}