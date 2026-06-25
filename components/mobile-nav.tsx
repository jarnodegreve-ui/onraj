"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Onderbalk (mobiel): een brede, afgeronde balk over de volledige schermbreedte
 *  met de modules gelijk verdeeld; de actieve module in een lime accent-chip. */
export function MobileNav() {
  const pathname = usePathname();
  const items = navItems.filter((item) => item.bottomBar !== false);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 md:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
    >
      <div className="mx-3 flex items-center gap-1 rounded-2xl border bg-background/95 p-1 shadow-lg">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium leading-none transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
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
