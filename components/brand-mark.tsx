/**
 * ONRAJ-merkmark: gradient (blauw→teal→paars) rounded-square met vier
 * kwadranten — notities, agenda, taken-check en financiën-bars.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="onrajGradient"
          x1="6"
          y1="6"
          x2="42"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2563EB" />
          <stop offset="0.55" stopColor="#14B8A6" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <g
        stroke="url(#onrajGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="5" width="38" height="38" rx="11" />
        <path d="M24 8V40" opacity="0.45" />
        <path d="M8 24H40" opacity="0.45" />
        {/* notities */}
        <path d="M11 13H19M11 16.5H19M11 20H16" />
        {/* agenda */}
        <rect x="29" y="13" width="9" height="7" rx="1" />
        <path d="M29 15.5H38M31.5 11V13.5M35.5 11V13.5" />
        {/* taken-check */}
        <circle cx="15" cy="33" r="5.5" />
        <path d="M12.5 33L14.3 34.8L17.7 31.2" />
        {/* financiën-bars */}
        <path d="M30 37V33M34 37V30M38 37V27" strokeWidth="2.4" />
      </g>
    </svg>
  );
}
