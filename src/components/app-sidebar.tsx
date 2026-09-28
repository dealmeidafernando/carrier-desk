"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard } from "@tabler/icons-react";

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
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/"}
                  tooltip="HappyRobot Custom App"
                  render={<Link href="/" />}
                >
                  <IconLayoutDashboard />
                  <span>HappyRobot Custom App</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
