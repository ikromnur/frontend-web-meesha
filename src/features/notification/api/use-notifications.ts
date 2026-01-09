import { axiosInstance } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import { NotificationResponse } from "@/types/notification";

export const useNotifications = () => {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      // FIX: Gunakan relative path dan override baseURL
      const { data } = await axiosInstance.get<NotificationResponse>("/api/notifications", {
        baseURL: "",
      });
      return data.data;
    },
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
        // FIX: Gunakan relative path dan override baseURL
        const { data } = await axiosInstance.get<{ data: { count: number } }>("/api/notifications/unread-count", {
            baseURL: "",
        });
        return data.data.count;
    },
    refetchInterval: 30000, // Refresh every 30s
  });
};
