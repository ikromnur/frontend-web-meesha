"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";

export type ProductRatingItem = {
  id?: string;
  productId?: string;
  userId?: string;
  orderId?: string | null;
  rating: number; // 1-5
  comment?: string | null;
  // Optional admin reply content
  reply?: string | null;
  replyAt?: string | Date | null;
  createdAt?: string | Date;
  // Backend returns userName flattened
  userName?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
  } | null;
};

interface UseFetchRatingsParams {
  productId?: string;
  orderId?: string;
  limit?: number;
}

export const UseFetchRatings = ({
  productId,
  orderId,
  limit = 10,
}: UseFetchRatingsParams) => {
  return useQuery({
    queryKey: ["ratings", productId ?? null, orderId ?? null, limit],
    queryFn: async () => {
      // Use internal API route
      const { data } = await axios.get("/ratings", {
        params: { productId, orderId, limit },
      });
      const raw = data?.data ?? data ?? [];
      const items: ProductRatingItem[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.ratings)
        ? raw.ratings
        : [];
      return items;
    },
    enabled: !!productId || !!orderId,
  });
};
