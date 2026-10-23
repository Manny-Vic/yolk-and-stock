import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardList,
  Coins,
  Package,
  ReceiptText,
  Settings,
  ShoppingBasket,
  Truck,
  Users,
  Waves,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useStore } from "@/store/useStore";

const items = [
  { title: "POS / New Order", url: "/", icon: ShoppingBasket },
  { title: "Orders", url: "/orders", icon: ClipboardList },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Purchases & Suppliers", url: "/suppliers", icon: Truck },
  { title: "Customers & Credit", url: "/customers", icon: Users },
  { title: "Expenses", url: "/expenses", icon: ReceiptText },
  { title: "Cash Flow", url: "/cashflow", icon: Waves },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const storeName = useStore((s) => s.settings.storeName);
  const phone = useStore((s) => s.settings.phone);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2.5 px-2 py-1.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Coins className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              {storeName}
            </span>
            <span className="block truncate text-[11px] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
              Wholesale POS · {phone}
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Business</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
