"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

// Statistieken zit bewust niet in de onderbalk (te krap met 6 items) — wel in
// de zijbalk via het ☰-menu. Tailwind heeft de grid-cols-klassen letterlijk
// nodig, vandaar de expliciete map.
const COLS: Record<number, string> = {
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

/** Onderbalk voor mobiel gebruik — duim-vriendelijk wisselen tussen modules. */
export function MobileNav() {
  const pathname = usePathname();
  const items = navItems.filter((item) => item.bottomBar !== false);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className={cn("grid", COLS[items.length] ?? "grid-cols-5")}>
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center gap-0.5 px-0.5 pt-1.5 pb-1 text-[10px] font-medium leading-none transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              <span className="max-w-full truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
