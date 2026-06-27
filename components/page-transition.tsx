"use client";

import { usePathname } from "next/navigation";

/**
 * Zachte paginaovergang: bij elke route-wissel hermount deze wrapper (key =
 * pathname), waardoor tw-animate-css de fade opnieuw afspeelt. Een pure
 * opacity-fade (geen transform) zodat het niet vecht met Next.js'
 * scroll-restoration. Geen experimentele View-Transitions-flags nodig en
 * degradeert netjes; `motion-reduce` schakelt de animatie volledig uit.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      className="animate-in fade-in-0 duration-300 ease-out motion-reduce:animate-none"
    >
      {children}
    </div>
  );
}
