import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface DashboardStats {
  // Toleran terhadap variasi kunci dari backend
  productsSold?: number;
  totalProfit?: number;
  newCustomers?: number;
  // Fallback nama alternatif
  totalSold?: number;
  profit?: number;
  customersNew?: number;
}

export const useDashboardStats = () => {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/v1/dashboard/stats");
      const raw = data?.data ?? data ?? {};
      return raw as DashboardStats;
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (query.isError) {
      const err: any = query.error;
      const status = err?.response?.status;
      // Hindari toast merah untuk 404/405 (misalnya data belum tersedia atau method tidak didukung)
      if (status === 404 || status === 405) {
        return;
      }
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Gagal memuat statistik dashboard";
      toast({
        title: "Gagal",
        description: message,
        variant: "destructive",
      });
    }
  }, [query.isError, query.error, toast]);

  return query;
}
