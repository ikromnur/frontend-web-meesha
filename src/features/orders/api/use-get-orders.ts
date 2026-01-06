import { useQuery } from "@tanstack/react-query";
import { Order, OrderFilters } from "../types/order.types";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { format, parse } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface UseGetOrdersProps {
  filters?: OrderFilters;
  enabled?: boolean;
}

export const useGetOrders = ({
  filters,
  enabled = true,
}: UseGetOrdersProps = {}) => {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["orders", filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      // Pastikan 'date' selalu ISO yyyy-MM-dd
      if (filters?.date) {
        let isoDate = filters.date;
        const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!isoRegex.test(isoDate)) {
          try {
            // Coba parse format lokal Indonesia seperti "04 Desember 2025"
            const parsed = parse(
              String(filters.date),
              "dd MMMM yyyy",
              new Date(),
              {
                locale: localeId,
              }
            );
            if (!isNaN(parsed.getTime())) {
              isoDate = format(parsed, "yyyy-MM-dd");
            }
          } catch {}
        }
        if (isoRegex.test(isoDate)) {
          params.append("date", isoDate);
        }
      }

      if (filters?.status && filters.status !== "all") {
        params.append("status", filters.status);
      }

      if (filters?.search) {
        params.append("search", filters.search);
      }

      // Pickup-scope: saat tab "Ambil" aktif di frontend, kirim pickup=true
      if (filters?.pickupOnly) {
        params.append("pickup", "true");
      }

      // Pastikan selalu mengirim status=all jika tidak ada filter tertentu
      if (!filters?.status || filters.status === "all") {
        params.set("status", "all");
      }
      // Panggil endpoint admin v1 via rewrites: /api/v1/orders
      const { data: payload } = await api.get(`/api/v1/orders`, {
        params: Object.fromEntries(params.entries()),
      });
      const orders: Order[] = (
        Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.orders)
          ? payload.orders
          : Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload)
          ? payload
          : []
      ) as Order[];
      return orders;
    },
    enabled,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (query.isError) {
      const err: any = query.error;
      const status = err?.response?.status;
      // Hindari toast merah untuk 404/405 (data kosong atau endpoint belum tersedia)
      if (status === 404 || status === 405) {
        return;
      }
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Gagal memuat daftar pesanan";
      toast({
        title: "Gagal",
        description: message,
        variant: "destructive",
      });
    }
  }, [query.isError, query.error, toast]);

  return query;
};
