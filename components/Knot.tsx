export default function Knot({ className, draw }: { className?: string; draw?: boolean }) {
  const pl = draw ? { pathLength: 1 } : {};
  return (
    <svg className={className} viewBox="0 0 64 24" role={draw ? "img" : undefined} aria-label={draw ? "십생크 매듭 그림" : undefined} aria-hidden={draw ? undefined : true}>
      <path {...pl} d="M2 7 H52 a2.5 2.5 0 0 1 0 5 H12 a2.5 2.5 0 0 0 0 5 H62" />
      <ellipse {...pl} cx="17" cy="12" rx="3" ry="8.5" />
      <ellipse {...pl} cx="47" cy="12" rx="3" ry="8.5" />
    </svg>
  );
}
export function XMark() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.5 4 C8 8 12 12 15.5 16.5 M16 4 C12 8.5 8 12 4 16" />
    </svg>
  );
}
