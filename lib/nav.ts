import {
  ChartColumn,
  Inbox,
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
  bottomBar?: boolean; // false = niet in de mobiele onderbalk (wel in de zijbalk)
};

/** De modules van het portaal — gedeeld door de sidebar, topbar en dashboard.
 *  Modules hebben géén eigen accentkleur: identiteit komt van editorial
 *  kickers, denim is gereserveerd voor interactie. */
export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Taken", href: "/taken", icon: ListTodo },
  { title: "Inbox", href: "/inbox", icon: Inbox },
  { title: "Notities", href: "/notities", icon: NotebookPen, bottomBar: false },
  { title: "Financiën", href: "/financien", icon: Wallet },
  {
    title: "Statistieken",
    href: "/statistieken",
    icon: ChartColumn,
    bottomBar: false,
  },
];

/** Zoekt de actieve nav-module op basis van het huidige pad. */
export function activeNavItem(pathname: string): NavItem | undefined {
  return navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
