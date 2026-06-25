"use client";

import { useRef, useState } from "react";
import { Check, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

const THRESHOLD = 76; // px om een actie te triggeren
const MAX = 132; // px maximale uitslag

/**
 * Veeg-wrapper voor een rij (touch). Veeg naar rechts → onComplete (afvinken),
 * naar links → onDelete (verwijderen). Touch-only: op desktop vuren er geen
 * touch-events, dus dan is dit inert. `touch-action: pan-y` houdt verticaal
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
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(
    null,
  );

  function onTouchStart(event: React.TouchEvent) {
    const t = event.touches[0];
    start.current = { x: t.clientX, y: t.clientY, axis: null };
  }

  function onTouchMove(event: React.TouchEvent) {
    const s = start.current;
    if (!s) return;
    const t = event.touches[0];
    const dX = t.clientX - s.x;
    const dY = t.clientY - s.y;
    if (s.axis === null) {
      if (Math.abs(dX) < 8 && Math.abs(dY) < 8) return;
      s.axis = Math.abs(dX) > Math.abs(dY) ? "x" : "y";
      if (s.axis === "x") setDragging(true);
    }
    if (s.axis !== "x") return; // verticaal → laat de pagina scrollen
    let v = dX;
    if (v > 0 && !onComplete) v = 0;
    if (v < 0 && !onDelete) v = 0;
    setDx(Math.max(-MAX, Math.min(MAX, v)));
  }

  function onTouchEnd() {
    const s = start.current;
    start.current = null;
    setDragging(false);
    if (!s || s.axis !== "x") {
      setDx(0);
      return;
    }
    if (dx >= THRESHOLD && onComplete) onComplete();
    else if (dx <= -THRESHOLD && onDelete) onDelete();
    setDx(0);
  }

  return (
    <div className="relative overflow-hidden">
      {/* Actie-achtergronden, onthuld door het wegschuiven van de voorgrond. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-5">
        <span
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity",
            dx > 4 ? "opacity-100" : "opacity-0",
          )}
        >
          <Check className="size-5" /> Afvinken
        </span>
        <span
          className={cn(
            "ml-auto flex items-center gap-1.5 text-sm font-medium text-destructive transition-opacity",
            dx < -4 ? "opacity-100" : "opacity-0",
          )}
        >
          Verwijderen <Trash2 className="size-5" />
        </span>
      </div>
      <div
        className="relative touch-pan-y bg-card"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform 0.2s ease-out",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
