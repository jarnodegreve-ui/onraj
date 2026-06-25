"use client";

import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

// Eén gedeelde klok voor álle cursors, zodat ze gelijktijdig knipperen
// (losse CSS-animaties starten op verschillende momenten → uit fase).
let on = true;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    timer = setInterval(() => {
      on = !on;
      listeners.forEach((l) => l());
    }, 550);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Knipperend lime cursor-blok; alle instanties lopen synchroon. */
export function TerminalCursor({ className }: { className?: string }) {
  const visible = useSyncExternalStore(
    subscribe,
    () => on,
    () => true,
  );
  return (
    <span
      aria-hidden
      className={cn("inline-block bg-primary", className)}
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
}
