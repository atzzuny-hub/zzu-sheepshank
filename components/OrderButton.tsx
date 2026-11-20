"use client";
import { useRef, useState } from "react";
import { saveKeyOrder } from "@/lib/data";
import type { Action } from "@/lib/util";

// 노트에 놓이는 지킬 일의 순서를 바꾸는 버튼과 창.
// 왼쪽 손잡이(≡)를 끌어서 옮기고, 키보드로는 화살표 버튼을 씁니다.
export default function OrderButton({ habits, onChange }: { habits: Action[]; onChange: (next: Action[]) => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<Action[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function open() { setList(habits); setErr(""); dlg.current?.showModal(); }
  function moveTo(id: string, to: number) {
    setList((prev) => {
      const from = prev.findIndex((h) => h.id === id);
      if (from < 0 || to === from || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  }
  function onDown(e: React.PointerEvent<HTMLElement>, id: string) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragId(id);
  }
  function onMove(e: React.PointerEvent<HTMLElement>) {
    if (!dragId || !box.current) return;
    const rows = Array.from(box.current.children) as HTMLElement[];
    let to = rows.findIndex((r) => e.clientY < r.getBoundingClientRect().bottom);
    if (to < 0) to = rows.length - 1;
    moveTo(dragId, to);
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
        <p>왼쪽 손잡이를 끌어서 옮기세요. 위에 있을수록 노트의 왼쪽 칸에 놓입니다.</p>
        <div className="hlist ord-list" ref={box}>
          {list.map((h, i) => (
            <div className={`hitem ord${dragId === h.id ? " drag" : ""}`} key={h.id}>
              <span className="grip" aria-hidden="true" onPointerDown={(e) => onDown(e, h.id)} onPointerMove={onMove}
                onPointerUp={() => setDragId(null)} onPointerCancel={() => setDragId(null)}>≡</span>
              <span className="nm">{h.text}</span>
              <button type="button" aria-label={`${h.text} 위로`} disabled={i === 0} onClick={() => moveTo(h.id, i - 1)}>↑</button>
              <button type="button" aria-label={`${h.text} 아래로`} disabled={i === list.length - 1} onClick={() => moveTo(h.id, i + 1)}>↓</button>
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