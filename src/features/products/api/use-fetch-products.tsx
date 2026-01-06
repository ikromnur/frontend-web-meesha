import { axiosInstance } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";

interface UseFetchProductsProps {
  onError?: (e: Error) => void;
  page?: number;
  limit?: number | "all";
  search?: string;
  categories?: string[];
  objectives?: string[];
  colors?: string[];
  size?: string[];
  availability?: string[];
  lte?: number;
  gte?: number;
}

export const UseFetchProducts = ({
  onError,
  page = 1,
  limit,
  categories,
  objectives,
  colors,
  search = "",
  size,
  availability,
  lte,
  gte,
}: UseFetchProductsProps) => {
  return useQuery({
    queryKey: [
      "products",
      page,
      limit,
      categories,
      objectives,
      colors,
      search,
      size,
      availability,
      lte,
      gte,
    ],
    queryFn: async () => {
      try {
        const toCsv = (arr?: string[]) =>
          Array.isArray(arr) && arr.length > 0 ? arr.join(",") : undefined;

        const queryParams: Record<string, unknown> = {
          page,
          ...(limit === "all"
            ? { limit: "all" }
            : typeof limit === "number" && limit > 0
            ? { limit }
            : {}),
          categories: toCsv(categories),
          objectives: toCsv(objectives),
          colors: toCsv(colors),
          search,
          size: toCsv(size),
          availability: toCsv(availability),
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

        // Normalize response to a consistent shape
        const d: any = data;
        const payload = d?.data && typeof d.data === "object" ? d.data : d;
        const normalized = {
          data: Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(d?.data)
            ? d.data
            : Array.isArray(d?.items)
            ? d.items
            : Array.isArray(d?.data?.items)
            ? d.data.items
            : Array.isArray(d?.data?.data)
            ? d.data.data
            : [],
          page: Number(payload?.page ?? d?.page ?? 1),
          totalPages: Number(payload?.totalPages ?? d?.totalPages ?? 1),
          totalItems: Number(
            payload?.totalItems ??
              d?.totalItems ??
              payload?.total ??
              d?.total ??
              0
          ),
          total: Number(
            payload?.total ??
              d?.total ??
              payload?.totalItems ??
              d?.totalItems ??
              0
          ),
        };

        return normalized;
      } catch (error) {
        const axiosError = error as AxiosError;

        // Only call onError for actual errors, not empty data
        if (axiosError.response?.status !== 404 && onError) {
          onError(error as Error);
        }

        console.warn("Products fetch error:", error);

        // Return empty data structure instead of throwing
        return { data: [], page: 1, totalPages: 0, totalItems: 0, total: 0 };
      }
    },
    retry: false, // Don't retry on failure
  });
};
