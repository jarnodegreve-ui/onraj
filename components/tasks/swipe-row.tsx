"use client";

import { useRef } from "react";
import { Check, Trash2 } from "lucide-react";

const THRESHOLD = 76; // px om een actie te triggeren
const MAX = 132; // px maximale uitslag

/**
 * Veeg-wrapper voor een rij (touch). Rechts → onComplete (afvinken), links →
 * onDelete (verwijderen). Volledig imperatief: tijdens het vegen wordt de
 * translate rechtstreeks op de DOM gezet (geen React-state → geen re-render per
 * frame), zodat het boterzacht volgt. `touch-action: pan-y` houdt verticaal
 * scrollen intact; alleen een duidelijk horizontale veeg wordt overgenomen.
 */
export function SwipeRow({
  children,
  onComplete,
  onDelete,
}: {
  children: React.ReactNode;
  onComplete?: () => void;
  onDelete?: () => void;
}) {
  const fg = useRef<HTMLDivElement>(null);
  const leftAction = useRef<HTMLSpanElement>(null);
  const rightAction = useRef<HTMLSpanElement>(null);
  const st = useRef<{
    x: number;
    y: number;
    axis: "x" | "y" | null;
    dx: number;
  } | null>(null);

  function paint(dx: number, settle: boolean) {
    const el = fg.current;
    if (el) {
      el.style.transition = settle ? "transform 0.2s ease-out" : "none";
      el.style.willChange = settle ? "auto" : "transform";
      el.style.transform = dx ? `translateX(${dx}px)` : "translateX(0)";
    }
    if (leftAction.current)
      leftAction.current.style.opacity = dx > 4 ? "1" : "0";
    if (rightAction.current)
      rightAction.current.style.opacity = dx < -4 ? "1" : "0";
  }

  function onTouchStart(event: React.TouchEvent) {
    const t = event.touches[0];
    st.current = { x: t.clientX, y: t.clientY, axis: null, dx: 0 };
  }

  function onTouchMove(event: React.TouchEvent) {
    const s = st.current;
    if (!s) return;
    const t = event.touches[0];
    const dX = t.clientX - s.x;
    const dY = t.clientY - s.y;
    if (s.axis === null) {
      if (Math.abs(dX) < 8 && Math.abs(dY) < 8) return;
      s.axis = Math.abs(dX) > Math.abs(dY) ? "x" : "y";
    }
    if (s.axis !== "x") return; // verticaal → laat de pagina scrollen
    let v = dX;
    if (v > 0 && !onComplete) v = 0;
    if (v < 0 && !onDelete) v = 0;
    v = Math.max(-MAX, Math.min(MAX, v));
    s.dx = v;
    paint(v, false);
  }

  function onTouchEnd() {
    const s = st.current;
    st.current = null;
    if (!s || s.axis !== "x") {
      paint(0, true);
      return;
    }
    if (s.dx >= THRESHOLD && onComplete) onComplete();
    else if (s.dx <= -THRESHOLD && onDelete) onDelete();
    paint(0, true);
  }

  return (
    <div className="relative overflow-hidden">
      {/* Actie-achtergronden, onthuld door het wegschuiven van de voorgrond. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-5">
        <span
          ref={leftAction}
          className="flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 transition-opacity"
        >
          <Check className="size-5" /> Afvinken
        </span>
        <span
          ref={rightAction}
          className="ml-auto flex items-center gap-1.5 text-sm font-medium text-destructive opacity-0 transition-opacity"
        >
          Verwijderen <Trash2 className="size-5" />
        </span>
      </div>
      <div
        ref={fg}
        className="relative touch-pan-y bg-card"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
