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

export function AppSidebar({
  email,
  inboxCount = 0,
}: {
  email: string | null;
  inboxCount?: number;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/dashboard"
          onClick={() => setOpenMobile(false)}
          aria-label="Naar dashboard"
          className="flex items-center rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent/50 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          {/* Ingeklapt: compact icoon. Uitgeklapt: de wordmark `ONRAJ●`. */}
          <BrandMark className="hidden size-8 shrink-0 group-data-[collapsible=icon]:block" />
          <BrandLockup className="text-[21px] text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
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
