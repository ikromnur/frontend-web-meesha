import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";

export interface CustomerToday {
  id: string;
  username: string;
  email: string;
  noHp: string;
  avatarUrl: string | null;
}

export const useCustomersToday = () => {
  return useQuery({
    queryKey: ["customers-today"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/v1/customers/today");
      const items = Array.isArray(data?.data) ? data.data : [];
      return items as CustomerToday[];
    },
    refetchInterval: 30000,
  });
};