"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { CommandPalette } from "@/components/command-palette";
import { QuickAdd } from "@/components/quick-add";
import { buttonVariants } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { activeNavItem } from "@/lib/nav";

export function AppTopbar() {
  const pathname = usePathname();
  const current = activeNavItem(pathname);
  const title =
    current?.title ??
    (pathname.startsWith("/instellingen") ? "Instellingen" : "onraj");

  return (
    <header
      className="sticky top-0 z-10 shrink-0 border-b bg-background/80 backdrop-blur-sm"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <h1 className="ml-1 text-sm font-semibold">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <QuickAdd />
          <CommandPalette />
          <Link
            href="/instellingen"
            aria-label="Instellingen"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <Settings className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
