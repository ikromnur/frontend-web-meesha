import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Order, OrderFilters } from "../types/order.types";

interface UseGetMyOrdersProps {
  filters?: OrderFilters;
  enabled?: boolean;
}

// Hook khusus untuk riwayat pesanan pengguna (non-admin)
// Menggunakan proxy Next: GET /api/orders yang sudah menormalkan data
export const useGetMyOrders = ({
  filters,
  enabled = true,
}: UseGetMyOrdersProps = {}) => {
  const { toast } = useToast();

  const query = useQuery<Order[]>({
    queryKey: ["my-orders", filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      // Kirim status jika ada; default ke "all" agar UI konsisten
      const status = filters?.status || "all";
      params.set("status", status);

      if (filters?.search) {
        params.append("search", filters.search);
      }

      try {
        const { data } = await api.get("/api/orders", {
          params: Object.fromEntries(params.entries()),
        });

        const orders: Order[] = (
          Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.orders)
            ? data.orders
            : Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data)
            ? data
            : []
        ) as Order[];

        return orders;
      } catch (err: any) {
        const status = err?.response?.status;
        // Anggap 404/405 sebagai "tidak ada data" agar UI tidak error
        if (status === 404 || status === 405) {
          return [] as Order[];
        }
        throw err;
      }
    },
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
  });

  // Tampilkan toast error untuk kasus selain 404/405
  if (query.isError) {
    const err: any = query.error;
    const status = err?.response?.status;
    if (status !== 404 && status !== 405) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Gagal memuat riwayat pesanan";
      toast({ title: "Gagal", description: message, variant: "destructive" });
    }
  }

  return query;
};
