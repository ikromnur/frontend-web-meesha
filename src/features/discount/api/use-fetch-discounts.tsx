import { axiosInstance } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

import type { Discount } from "@/types/discount";

interface UseFetchDiscountsProps {
  onError?: (e: Error) => void;
  search?: string;
}

export const UseFetchDiscounts = ({ onError, search }: UseFetchDiscountsProps = {}) => {
  return useQuery<Discount[]>({ // Specify the return type for useQuery
    queryKey: ["discounts", search],
    queryFn: async () => {
      try {
        const { data } = await axiosInstance.get("/discounts", {
          params: { search },
        });
        return data.data;
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
        console.error("Failed to fetch discounts:", error);
        throw error;
      }
    },
  });
};
