"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import type { ProductRatingItem } from "./use-fetch-ratings";

interface UseFetchAllRatingsParams {
  search?: string;
  date?: string; // ISO date (yyyy-mm-dd) in Asia/Jakarta
  limit?: number;
}

// Fetch all store ratings with optional search and single-date filter.
// Falls back gracefully if backend ignores params by filtering on client.
export function UseFetchAllRatings({
  search,
  date,
  limit = 100,
}: UseFetchAllRatingsParams = {}) {
  return useQuery<ProductRatingItem[]>({
    queryKey: ["all-ratings", search ?? null, date ?? null, limit],
    queryFn: async () => {
      // Use internal API route
      const { data } = await axios.get("/ratings", {
        params: { search, date, limit },
      });
      const raw = data?.data ?? data ?? [];
      const items: ProductRatingItem[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.ratings)
        ? raw.ratings
        : [];
      // Normalize createdAt/repliedAt to string ISO if present
      return items.map((r) => ({
        ...r,
        createdAt: r?.createdAt ?? (r as any)?.created_at,
        replyAt: r?.replyAt ?? (r as any)?.replied_at,
        reply: r?.reply ?? (r as any)?.reply_text ?? r?.reply,
      }));
    },
  });
}
