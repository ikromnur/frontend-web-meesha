import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";
import { type Discount } from "@/types/discount";

export const useGetDiscount = (id?: string) => {
  return useQuery<Discount>({
    enabled: !!id, // Only run this query if the id is not undefined
    queryKey: ["discounts", id],
    queryFn: async () => {
      try {
        const { data } = await axiosInstance.get(`/discounts/${id}`);
        return data.data;
      } catch (error) {
        console.error(`Failed to fetch discount with id ${id}:`, error);
        throw error;
      }
    },
  });
};
