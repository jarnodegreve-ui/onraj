/**
 * ONRAJ-merkmark: het compacte app-icoon `o●` — de "o" als ring + een denim-dot
 * accent, op een warm-donkere afgeronde tegel. Vorm-gebaseerd (geen font), dus
 * messcherp op elk formaat.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="18" fill="#141416" />
      <circle cx="27" cy="34" r="11" stroke="#ece7df" strokeWidth="6.5" />
      <circle cx="45" cy="42" r="4.5" fill="#3d68be" />
    </svg>
  );
}
