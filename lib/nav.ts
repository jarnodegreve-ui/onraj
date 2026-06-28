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
  accent: string; // huisstijl-accentkleur (hex)
  bottomBar?: boolean; // false = niet in de mobiele onderbalk (wel in de zijbalk)
};

/** De modules van het portaal — gedeeld door de sidebar, topbar en dashboard. */
export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, accent: "#3d68be" },
  { title: "Taken", href: "/taken", icon: ListTodo, accent: "#3d68be" },
  {
    title: "Inbox",
    href: "/inbox",
    icon: Inbox,
    accent: "#3d68be",
  },
  {
    title: "Notities",
    href: "/notities",
    icon: NotebookPen,
    accent: "#3d68be",
    bottomBar: false,
  },
  { title: "Financiën", href: "/financien", icon: Wallet, accent: "#3d68be" },
  {
    title: "Statistieken",
    href: "/statistieken",
    icon: ChartColumn,
    accent: "#3d68be",
    bottomBar: false,
  },
];

/** Zoekt de actieve nav-module op basis van het huidige pad. */
export function activeNavItem(pathname: string): NavItem | undefined {
  return navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
