"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const THRESHOLD = 72; // px (na weerstand) om te verversen
const MAX = 110; // max zichtbare uitslag
const RESISTANCE = 0.5; // veerkracht: half meebewegen

/**
 * Pull-to-refresh (mobiel, touch-only). De browser-bounce staat uit
 * (overscroll-behavior-y: none), dus we leveren onze eigen verversing: trek
 * vanaf de bovenkant van de pagina omlaag → `router.refresh()`. Het slepen is
 * imperatief (geen React-state per frame); `useTransition` stuurt de
 * "bezig"-spinner tot de RSC-refresh klaar is. Reduced-motion: geen kwaad,
 * de transities zijn kort en puur cosmetisch.
 */
export function PullToRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const wrapRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);
  const armedRef = useRef(false); // true terwijl een door ons gestarte refresh loopt
  const drag = useRef<{
    startX: number;
    startY: number;
    pulling: boolean;
    dist: number;
  } | null>(null);

  // Plaats de indicator imperatief (geen re-render tijdens het slepen).
  function paint(dist: number, settle: boolean) {
    const wrap = wrapRef.current;
    const spin = spinRef.current;
    if (!wrap || !spin) return;
    const y = Math.min(dist, MAX);
    wrap.style.transition = settle
      ? "transform 0.25s ease, opacity 0.25s ease"
      : "none";
    wrap.style.transform = `translateY(${y}px)`;
    wrap.style.opacity = y > 2 ? "1" : "0";
    spin.style.transform = `rotate(${(y / THRESHOLD) * 270}deg)`;
  }

  useEffect(() => {
    function atTop() {
      return (document.scrollingElement?.scrollTop ?? window.scrollY) <= 0;
    }

    function onStart(event: TouchEvent) {
      if (isPending || window.innerWidth >= 768 || !atTop()) return;
      const t = event.touches[0];
      drag.current = {
        startX: t.clientX,
        startY: t.clientY,
        pulling: false,
        dist: 0,
      };
    }

    function onMove(event: TouchEvent) {
      const d = drag.current;
      if (!d) return;
      const dy = event.touches[0].clientY - d.startY;
      const dx = event.touches[0].clientX - d.startX;
      if (!d.pulling) {
        // Kies de as pas na een duidelijke beweging; laat een (diagonale)
        // horizontale veeg over aan SwipeRow (rij-veeg) i.p.v. te verversen.
        if (Math.abs(dx) < 8 && dy < 8) return;
        if (Math.abs(dx) > dy || dy <= 0) {
          drag.current = null;
          return;
        }
        d.pulling = true;
      }
      if (!atTop()) {
        drag.current = null;
        paint(0, true);
        return;
      }
      d.dist = Math.max(dy, 0) * RESISTANCE;
      // Stop de pagina van meeschuiven terwijl we trekken.
      if (event.cancelable) event.preventDefault();
      paint(d.dist, false);
    }

    function onEnd() {
      const d = drag.current;
      drag.current = null;
      if (!d || !d.pulling) {
        paint(0, true);
        return;
      }
      if (d.dist >= THRESHOLD) {
        armedRef.current = true;
        paint(THRESHOLD, true); // pin op drempelhoogte tijdens het verversen
        startTransition(() => router.refresh());
      } else {
        paint(0, true);
      }
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [isPending, router, startTransition]);

  // Verversing klaar (isPending → false): animeer de indicator terug omhoog.
  useEffect(() => {
    if (!isPending && armedRef.current) {
      armedRef.current = false;
      paint(0, true);
    }
  }, [isPending]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center pt-[calc(env(safe-area-inset-top)+4rem)] opacity-0 md:hidden"
    >
      <div className="flex size-9 items-center justify-center rounded-full border bg-card text-primary shadow-md">
        <div ref={spinRef}>
          <Loader2 className={isPending ? "size-4 animate-spin" : "size-4"} />
        </div>
      </div>
    </div>
  );
}
