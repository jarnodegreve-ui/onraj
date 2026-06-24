/**
 * ONRAJ-merkmark (terminal-stijl): de compacte app-mark `o▌` — de "o" als
 * bold ring + een lime cursor-blok, op een donkere afgeronde tegel. Stroke-/
 * vorm-gebaseerd (geen font), dus messcherp op elk formaat.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="120" height="120" rx="26" fill="#15171a" />
      <circle cx="44" cy="62" r="15" stroke="#f4f4f2" strokeWidth="11" />
      <rect x="74" y="40" width="12" height="44" rx="1" fill="#c2f04d" />
    </svg>
  );
}
