"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBroadcast,
  IconLayoutDashboard,
  IconList,
  IconUserCheck,
} from "@tabler/icons-react";

import logo from "@/brand-assets/blacklogo.png";
import icon from "@/brand-assets/blackicon.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const NAV = [
  { href: "/", label: "Overview", icon: IconLayoutDashboard },
  { href: "/live", label: "Live call", icon: IconBroadcast },
  { href: "/calls", label: "Calls", icon: IconList },
  { href: "/queue", label: "Rep queue", icon: IconUserCheck },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 justify-center">
        <Link
          href="/"
          className="flex h-10 w-full items-center justify-start pl-2.5 pr-3 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1!"
        >
          {collapsed ? (
            <img
              src={icon.src}
              alt="HappyRobot"
              className="size-7 shrink-0 object-contain"
            />
          ) : (
            <img
              src={logo.src}
              alt="HappyRobot"
              className="h-5 w-auto max-w-full object-contain object-left"
            />
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pt-6">
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
