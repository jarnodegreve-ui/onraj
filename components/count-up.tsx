"use client";

import { useEffect, useRef, useState } from "react";

import { formatEuro } from "@/lib/format";

type Format = "euro" | "integer";

function formatValue(value: number, format: Format): string {
  if (format === "euro") return formatEuro(value);
  return new Intl.NumberFormat("nl-BE").format(Math.round(value));
}

// Ease-out cubic: start snel, remt af — voelt natuurlijk voor "optellen".
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Laat een getal kort "optellen" naar zijn eindwaarde (~700 ms, ease-out).
 * SSR-veilig: server + eerste paint tonen al de eindwaarde (geen 0-flash voor
 * no-JS/crawlers); na mount animeert de client van 0 → eindwaarde.
 * `suppressHydrationWarning` dempt het verwachte verschil. Respecteert
 * prefers-reduced-motion (dan meteen de eindwaarde, geen animatie).
 */
export function CountUp({
  value,
  format = "integer",
  duration = 700,
  className,
}: {
  value: number;
  format?: Format;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(() => formatValue(value, format));
  const frame = useRef<number | null>(null);
  // Laatst getoonde numerieke waarde: bij mount 0 (telt op vanaf nul), daarna
  // de vorige waarde zodat een data-update soepel doortelt i.p.v. terug te
  // klappen naar 0 (bv. na pull-to-refresh of een maandwissel in financiën).
  const shownRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const from = shownRef.current;
    let startTs: number | null = null;
    const step = (ts: number) => {
      if (startTs === null) startTs = ts;
      // Reduced motion: spring meteen naar de eindwaarde (geen animatie).
      const progress = reduce ? 1 : Math.min((ts - startTs) / duration, 1);
      const raw = from + (value - from) * easeOutCubic(progress);
      const current = Object.is(raw, -0) ? 0 : raw; // vermijd "-€ 0,00"-flikkering
      shownRef.current = current;
      setDisplay(formatValue(current, format));
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [value, format, duration]);

  return (
    <span className={className} suppressHydrationWarning>
      {display}
    </span>
  );
}
