import { useQuery } from "@tanstack/react-query";
// Gunakan endpoint admin v1 melalui rewrites: /api/v1/orders/stats
import { OrderStats } from "../types/order.types";
import { api } from "@/lib/api";
import { format, parse } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface UseGetOrderStatsProps {
  date?: string;
  enabled?: boolean;
  pickupOnly?: boolean; // jika true, backend menghitung stats berdasarkan tanggal pickup
}

export const useGetOrderStats = ({
  date,
  enabled = true,
  pickupOnly = false,
}: UseGetOrderStatsProps = {}) => {
  return useQuery({
    queryKey: ["order-stats", date, pickupOnly],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (date) {
        let isoDate = date;
        const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!isoRegex.test(isoDate)) {
          try {
            const parsed = parse(String(date), "dd MMMM yyyy", new Date(), {
              locale: localeId,
            });
            if (!isNaN(parsed.getTime())) {
              isoDate = format(parsed, "yyyy-MM-dd");
            }
          } catch {}
        }
        if (isoRegex.test(isoDate)) {
          params.append("date", isoDate);
        }
      }

      if (pickupOnly) {
        params.append("pickup", "true");
      }

      const { data: json } = await api.get(`/api/v1/orders/stats`, {
        params: Object.fromEntries(params.entries()),
      });
      const raw = json?.data ?? json;
      const pending = Number(raw?.pending ?? raw?.PENDING ?? 0);
      const processing = Number(raw?.processing ?? raw?.PROCESSING ?? 0);
      const completed = Number(raw?.completed ?? raw?.COMPLETED ?? 0);
      const cancelled = Number(raw?.cancelled ?? raw?.CANCELLED ?? 0);
      const total = Number(
        raw?.total || raw?.TOTAL || pending + processing + completed + cancelled
      );
      const stats: OrderStats = {
        pending,
        processing,
        completed,
        cancelled,
        total,
      };
      return stats;
    },
    enabled,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};
