"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SidebarAdmin } from "@/components/container/sidebar";
import { NotificationDropdown } from "@/components/container/notification-dropdown";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // Paksa update state saat URL berubah
  useEffect(() => {}, [router]);

  return (
    <SidebarProvider>
      <SidebarAdmin />
      <SidebarInset>
        <header className="justify-between flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
          <div className="flex items-center px-4">
            <NotificationDropdown viewAllLink="/dashboard/notifications" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
