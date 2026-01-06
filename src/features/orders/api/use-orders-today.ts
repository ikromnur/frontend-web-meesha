import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Status mengikuti spesifikasi frontend
export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

export interface OrdersTodayQuery {
  status?: OrderStatus | "all";
}

export const useOrdersToday = ({ status = "all" }: OrdersTodayQuery = {}) => {
  return useQuery({
    queryKey: ["orders-today", status],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/orders/today", {
        params: status && status !== "all" ? { status } : undefined,
      });
      const items = Array.isArray(data?.data) ? data.data : [];
      return items as any[]; // gunakan render toleran di komponen
    },
    refetchInterval: 30000,
  });
};
