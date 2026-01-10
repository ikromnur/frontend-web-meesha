"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, useUnreadCount } from "@/features/notification/api/use-notifications";
import { useMarkRead, useMarkAllRead } from "@/features/notification/api/use-mark-read";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const NotificationDropdown = ({ viewAllLink = "/notifications" }: { viewAllLink?: string }) => {
  const router = useRouter();
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const { mutate: markRead } = useMarkRead();
  const { mutate: markAllRead } = useMarkAllRead();

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifikasi</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-auto p-1"
              onClick={() => markAllRead()}
            >
              Tandai semua dibaca
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Tidak ada notifikasi
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 cursor-pointer",
                  !notification.isRead && "bg-muted/50"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex w-full justify-between gap-2">
                          <span className="font-semibold text-sm">{notification.title}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {(() => {
                              try {
                                return formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: id });
                              } catch {
                                return "";
                              }
                            })()}
                          </span>
                        </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
            className="justify-center text-primary font-medium cursor-pointer"
            onClick={() => router.push(viewAllLink)}
        >
          Lihat Semua
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
