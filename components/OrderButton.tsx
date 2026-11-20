"use client";
import { useRef, useState } from "react";
import { saveKeyOrder } from "@/lib/data";
import type { Action } from "@/lib/util";

// 노트에 놓이는 지킬 일의 순서를 바꾸는 버튼과 창
export default function OrderButton({ habits, onChange }: { habits: Action[]; onChange: (next: Action[]) => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [list, setList] = useState<Action[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function open() { setList(habits); setErr(""); dlg.current?.showModal(); }
  function move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
  }
  async function save() {
    setBusy(true);
    try { await saveKeyOrder(list.map((h) => h.id)); onChange(list); dlg.current?.close(); }
    catch { setErr("순서를 저장하지 못했어요. 잠시 뒤 다시 해 보세요."); }
    setBusy(false);
  }

  return (
    <>
      <button className="btn" onClick={open} disabled={habits.length < 2}>순서 바꾸기</button>
      <dialog ref={dlg} aria-labelledby="ordT">
        <h2 id="ordT">지킬 일 순서</h2>
        <p>위에 있을수록 노트의 왼쪽 칸에 놓입니다.</p>
        <div className="hlist">
          {list.map((h, i) => (
            <div className="hitem ord" key={h.id}>
              <span>{i + 1}. {h.text}</span>
              <button type="button" aria-label={`${h.text} 위로`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" aria-label={`${h.text} 아래로`} disabled={i === list.length - 1} onClick={() => move(i, 1)}>↓</button>
            </div>
          ))}
        </div>
        {err && <p role="alert">{err}</p>}
        <div className="dlg-actions">
          <button className="btn" onClick={() => dlg.current?.close()}>취소</button>
          <button className="btn primary" onClick={save} disabled={busy}>{busy ? "저장 중…" : "순서 저장"}</button>
        </div>
      </dialog>
    </>
  );
}