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
};

/** De vier modules van het portaal — gedeeld door de sidebar en de topbar. */
export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Taken", href: "/taken", icon: ListTodo },
  { title: "Notities", href: "/notities", icon: NotebookPen },
  { title: "Financiën", href: "/financien", icon: Wallet },
  { title: "Agenda", href: "/agenda", icon: CalendarDays },
];

/** Zoekt de actieve nav-module op basis van het huidige pad. */
export function activeNavItem(pathname: string): NavItem | undefined {
  return navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
