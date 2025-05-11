import { axiosInstance } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

interface UseFetchProductsProps {
  onError: (e: Error) => void;
  page?: number;
  search?: string;
  categories?: string[];
  types?: string[];
  objectives?: string[];
  colors?: string[];
  size?: string[];
  lte?: number;
  gte?: number;
}

export const UseFetchProducts = ({
  onError,
  page = 1,
  categories,
  types,
  objectives,
  colors,
  search = "",
  size,
  lte,
  gte,
}: UseFetchProductsProps) => {
  return useQuery({
    queryKey: [
      "products",
      page,
      categories,
      types,
      objectives,
      colors,
      search,
      size,
      lte,
      gte,
    ],
    queryFn: async () => {
      try {
        const queryParams: Record<string, unknown> = {
          page,
          categories,
          types,
          objectives,
          colors,
          search,
          size,
        };

        // Hanya kirim kalau bukan undefined, NaN, atau 0
        if (typeof gte === "number" && !isNaN(gte) && gte !== 0) {
          queryParams.gte = gte;
        }

        if (typeof lte === "number" && !isNaN(lte) && lte !== 0) {
          queryParams.lte = lte;
        }

        const { data } = await axiosInstance.get("/products", {
          params: queryParams,
        });

        return data.data;
      } catch (error) {
        onError(error as Error);
        console.error(error);
        throw error;
      }
    },
  });
};
