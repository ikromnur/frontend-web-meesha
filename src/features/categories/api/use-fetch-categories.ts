import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";
import type { Category } from "@/types/category";

interface UseFetchCategoriesProps {
  onError?: (error: Error) => void;
  search?: string;
}

export const useFetchCategories = ({
  onError,
  search,
}: UseFetchCategoriesProps = {}) => {
  return useQuery<Category[]>({
    queryKey: ["categories", search],
    queryFn: async () => {
      try {
        const { data } = await axiosInstance.get("/categories", {
          params: { search },
        });
        return data.data;
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
        console.error("Failed to fetch categories:", error);
        throw error;
      }
    },
  });
};
