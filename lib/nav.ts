import {
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  accent: string; // huisstijl-accentkleur (hex)
};

/** De modules van het portaal — gedeeld door de sidebar, topbar en dashboard. */
export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, accent: "#002fa7" },
  { title: "Taken", href: "/taken", icon: ListTodo, accent: "#14b8a6" },
  { title: "Notities", href: "/notities", icon: NotebookPen, accent: "#002fa7" },
  { title: "Financiën", href: "/financien", icon: Wallet, accent: "#14b8a6" },
  { title: "Agenda", href: "/agenda", icon: CalendarDays, accent: "#a855f7" },
];

/** Zoekt de actieve nav-module op basis van het huidige pad. */
export function activeNavItem(pathname: string): NavItem | undefined {
  return navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
