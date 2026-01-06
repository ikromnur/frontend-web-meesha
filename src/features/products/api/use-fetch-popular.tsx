import { axiosInstance } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import type { Product } from "@/types/product";

export type PopularStat = {
  productId: string;
  sold_30d?: number;
  views_30d?: number;
};

export type PopularProduct = Product & {
  sold_30d?: number;
  views_30d?: number;
};

interface UseFetchPopularProps {
  limit?: number;
  onError?: (e: Error) => void;
}

// Flexible normalizer: accepts various backend payload shapes
function normalizePopularPayload(raw: any): PopularProduct[] {
  const list: any[] = Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.items)
    ? raw.items
    : Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data?.data)
    ? raw.data.data
    : [];

  return list.map((p: any) => {
    const img = p?.imageUrl ?? p?.image ?? p?.images;
    const imageUrl =
      typeof img === "string"
        ? { url: img, publicId: p?.imagePublicId || "" }
        : Array.isArray(img)
        ? { url: img[0]?.url ?? "", publicId: img[0]?.publicId ?? "" }
        : { url: img?.url ?? "", publicId: img?.publicId ?? "" };

    const product: PopularProduct = {
      id: String(p?.id ?? p?._id ?? p?.productId ?? ""),
      name: String(p?.name ?? p?.productName ?? ""),
      description: String(p?.description ?? p?.desc ?? ""),
      price: Number(p?.price ?? p?.unitPrice ?? 0),
      stock: Number(p?.stock ?? p?.quantity ?? 0),
      imageUrl,
      size: String(p?.size ?? p?.productSize ?? "") as any,
      variant: Array.isArray(p?.variant) ? p.variant : [],
      createdAt: String(p?.createdAt ?? new Date().toISOString()),
      updatedAt: String(p?.updatedAt ?? new Date().toISOString()),
      category: p?.category ?? { id: "", key: "", name: "" },
      // type: p?.type ?? { id: "", key: "", name: "" },
      objective: p?.objective ?? { id: "", key: "", name: "" },
      color: p?.color ?? { id: "", key: "", name: "" },
      availability: p?.availability ?? "READY",
      sold_30d: Number(p?.sold_30d ?? p?.soldLast30Days ?? p?.sold ?? 0) || undefined,
      views_30d: Number(p?.views_30d ?? p?.viewsLast30Days ?? p?.views ?? 0) || undefined,
    };
    return product;
  });
}

export const UseFetchPopularProducts = ({ limit = 10, onError }: UseFetchPopularProps) => {
  return useQuery<PopularProduct[]>({
    queryKey: ["popularProducts", limit],
    queryFn: async () => {
      try {
        const { data } = await axiosInstance.get("/products/popular", {
          params: { limit },
        });
        const normalized = normalizePopularPayload(data);
        if (Array.isArray(normalized) && normalized.length > 0) return normalized.slice(0, limit);

        // Fallback: when backend not ready, gracefully fetch general products and slice
        const { data: all } = await axiosInstance.get("/products", { params: { limit: "all" } });
        const fallback = normalizePopularPayload(all);
        return fallback.slice(0, limit);
      } catch (error) {
        const axiosError = error as AxiosError;
        if (onError && axiosError.response?.status !== 404) {
          onError(error as Error);
        }
        // Try fallback to generic products list
        try {
          const { data: all } = await axiosInstance.get("/products", { params: { limit: "all" } });
          const fallback = normalizePopularPayload(all);
          return fallback.slice(0, limit);
        } catch (err) {
          // If both fail, return empty array
          return [];
        }
      }
    },
    retry: false,
  });
};

