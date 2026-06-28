"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

/**
 * Subtiele live klok als dashboard-hero: weekdag + datum (mono, gedempt) met
 * daaronder de tijd inclusief seconden. Client-side, tikt elke seconde. Vóór
 * mount tonen we een onzichtbare placeholder (vaste hoogte, geen hydration-
 * mismatch op de tijd).
 */
export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Eerste waarde in een rAF (dus niet synchroon in de effect-body) en daarna
    // elke seconde bijwerken. De placeholder dekt de ~1 frame tot de eerste tick.
    const raf = requestAnimationFrame(() => setNow(new Date()));
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-1.5">
      <p className="font-mono text-xs tracking-wide text-muted-foreground first-letter:uppercase">
        {now ? format(now, "EEEE d MMMM", { locale: nl }) : " "}
      </p>
      <p className="font-mono text-4xl font-bold tracking-tight tabular-nums">
        {now ? (
          <>
            {format(now, "HH:mm")}
            <span className="text-xl font-medium text-muted-foreground">
              :{format(now, "ss")}
            </span>
          </>
        ) : (
          <span className="opacity-0">00:00</span>
        )}
      </p>
    </div>
  );
}
