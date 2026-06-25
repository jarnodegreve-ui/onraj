"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const KEY = "onraj-install-hint-dismissed";

/**
 * Eenmalige hint voor iOS-Safari (niet in standalone): hoe voeg je ONRAJ toe
 * aan je beginscherm? iOS toont geen automatische install-prompt, vandaar.
 */
export function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(nav.userAgent);
    const dismissed = window.localStorage.getItem(KEY) === "1";
    // Mount-check (legitiem effect: leest localStorage + matchMedia).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isIOS && !standalone && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-40 flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xl md:hidden">
      <span className="font-heading text-lg leading-none text-primary" aria-hidden>
        ❯
      </span>
      <p className="flex-1 text-xs leading-snug">
        Zet <span className="font-medium">onraj</span> op je beginscherm: tik op
        deel{" "}
        <Share className="inline size-3.5 -translate-y-px" aria-hidden /> →{" "}
        <span className="font-medium">Zet op beginscherm</span>.
      </p>
      <button
        type="button"
        aria-label="Sluiten"
        onClick={() => {
          window.localStorage.setItem(KEY, "1");
          setShow(false);
        }}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
