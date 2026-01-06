"use client";

import React from "react";
import { useNotifications } from "@/features/notification/api/use-notifications";
import { useMarkRead, useMarkAllRead } from "@/features/notification/api/use-mark-read";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Info, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { NotificationType } from "@/types/notification";

const NotificationIcon = ({ type }: { type: NotificationType }) => {
  switch (type) {
    case "SUCCESS":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "WARNING":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "ERROR":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Info className="h-5 w-5 text-blue-500" />;
  }
};

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { data: notifications = [], isLoading } = useNotifications();
  const { mutate: markRead } = useMarkRead();
  const { mutate: markAllRead } = useMarkAllRead();

  const handleClick = (notification: any) => {
    if (!notification.isRead) {
      markRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifikasi Sistem</h1>
        {notifications.length > 0 && (
          <Button variant="outline" onClick={() => markAllRead()}>
            Tandai semua dibaca
          </Button>
        )}
      </div>

      <div className="space-y-4 max-w-4xl">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Tidak ada notifikasi.
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent/50",
                !notification.isRead && "border-l-4 border-l-primary bg-accent/10"
              )}
              onClick={() => handleClick(notification)}
            >
              <CardContent className="p-4 flex gap-4">
                <div className="mt-1">
                  <NotificationIcon type={notification.type} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <h3 className={cn("font-medium", !notification.isRead && "font-bold")}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {format(new Date(notification.createdAt), "dd MMM yyyy HH:mm", { locale: id })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                </div>
                {!notification.isRead && (
                   <div className="self-center">
                     <div className="h-2 w-2 rounded-full bg-primary"></div>
                   </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
