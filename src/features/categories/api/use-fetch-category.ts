import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";
import type { Category } from "@/types/category";

interface UseFetchCategoryProps {
  id: string;
  onError?: (error: Error) => void;
}

export const useFetchCategory = ({ id, onError }: UseFetchCategoryProps) => {
  return useQuery<Category>({
    queryKey: ["category", id],
    queryFn: async () => {
      try {
        const { data } = await axiosInstance.get(`/categories/${id}`);
        return data.data as Category;
      } catch (error) {
        if (onError) onError(error as Error);
        console.error("Failed to fetch category:", error);
        throw error;
      }
    },
    enabled: !!id,
  });
};
