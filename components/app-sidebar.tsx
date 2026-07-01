"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { BrandLockup } from "@/components/brand-lockup";
import { BrandMark } from "@/components/brand-mark";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function AppSidebar({
  email,
  inboxCount = 0,
}: {
  email: string | null;
  inboxCount?: number;
}) {
  const pathname = usePathname();
  const { setOpenMobile, state, isMobile } = useSidebar();
  // Alleen op desktop kan de balk inklappen tot iconen; in de mobiele Sheet is
  // hij altijd volledig. Expliciet beslissen i.p.v. via group-data-CSS, want die
  // valt in de mobiele Sheet verkeerd uit (mark én wordmark over elkaar).
  const collapsed = !isMobile && state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      {/* Safe-area bovenaan: anders tekent de wordmark op mobiel onder de
          (black-translucent) statusbalk en overlapt hij de OS-klok. */}
      <SidebarHeader className="pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <Link
          href="/dashboard"
          onClick={() => setOpenMobile(false)}
          aria-label="Naar dashboard"
          className={cn(
            "flex items-center rounded-md px-2 py-2 outline-none transition-colors hover:bg-sidebar-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50",
            collapsed && "justify-center px-0",
          )}
        >
          {/* Ingeklapt (desktop): compact icoon. Anders (incl. mobiel): wordmark. */}
          {collapsed ? (
            <BrandMark className="size-8 shrink-0" />
          ) : (
            <BrandLockup className="text-[21px] text-sidebar-foreground" />
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const showBadge = item.href === "/inbox" && inboxCount > 0;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      size="lg"
                      className="gap-3 text-[15px] [&_svg]:size-5"
                      render={
                        <Link
                          href={item.href}
                          onClick={() => setOpenMobile(false)}
                        >
                          <item.icon />
                          <span className="group-data-[collapsible=icon]:hidden">
                            {item.title}
                          </span>
                        </Link>
                      }
                    />
                    {showBadge && (
                      <SidebarMenuBadge className="top-1/2! right-2 -translate-y-1/2 rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                        {inboxCount > 99 ? "99+" : inboxCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith("/instellingen")}
                  tooltip="Instellingen"
                  size="lg"
                  className="gap-3 text-[15px] [&_svg]:size-5"
                  render={
                    <Link
                      href="/instellingen"
                      onClick={() => setOpenMobile(false)}
                    >
                      <Settings />
                      <span className="group-data-[collapsible=icon]:hidden">
                        Instellingen
                      </span>
                    </Link>
                  }
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser email={email} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
