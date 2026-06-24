/**
 * ONRAJ-merkmark: de "R" met een open gradient-boog in Yves Klein-blauw
 * (heldere Klein → diep IKB). Stroke-gebaseerd, dus messcherp op elk formaat.
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
      <defs>
        <linearGradient
          id="onrajMark"
          x1="10"
          y1="8"
          x2="54"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4F6BFF" />
          <stop offset="1" stopColor="#1E3FCC" />
        </linearGradient>
      </defs>
      <g
        stroke="url(#onrajMark)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <circle
          cx="32"
          cy="32"
          r="24"
          strokeDasharray="128 23"
          transform="rotate(46 32 32)"
        />
        <path d="M25 20V45" />
        <path d="M25 20H32.5A7.5 7.5 0 0 1 32.5 35H25" />
        <path d="M30 35L41 45" />
      </g>
    </svg>
  );
}
