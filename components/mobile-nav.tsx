"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { QuickAddDialog } from "@/components/quick-add";
import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Zwevende glas-dock (mobiel): tekst-labels rond een centrale +-knop voor snel
 *  toevoegen. De actieve module in denim. */
export function MobileNav() {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const items = navItems.filter((item) => item.bottomBar !== false);
  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid);
  const right = items.slice(mid);

  const renderLink = (item: (typeof items)[number]) => {
    const active =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "min-w-0 flex-1 truncate text-center text-[11.5px] font-semibold tracking-[-0.01em] transition-colors",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {item.title}
      </Link>
    );
  };

  return (
    <>
      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center bg-gradient-to-t from-background via-background to-transparent pt-7 md:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.35rem)" }}
      >
        <div className="pointer-events-auto flex h-16 w-[calc(100%-1.5rem)] max-w-md items-center gap-1.5 rounded-[26px] border bg-card/80 px-3 shadow-xl backdrop-blur-xl">
          {left.map(renderLink)}
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label="Snel toevoegen"
            className="-mt-1 flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus className="size-6" />
          </button>
          {right.map(renderLink)}
        </div>
      </nav>
      <QuickAddDialog open={addOpen} onOpenChange={setAddOpen} mode="task" />
    </>
  );
}
