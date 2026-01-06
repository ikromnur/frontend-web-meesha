// Hook ini bertugas mengambil rekomendasi produk dari backend
// menggunakan pendekatan SAW dan menyediakan fallback aman ke
// "popular" jika rekomendasi kosong/error. Secara ringkas:
//
// - Komunikasi ke backend dilakukan melalui `axiosInstance` yang
//   berbasiskan `NEXT_PUBLIC_BACKEND_URL` (default
//   `http://localhost:4000`). Interceptor akan menambahkan prefix
//   `/api` untuk URL relatif sehingga request menjadi
//   `http://localhost:4000/api/products/...`.
// - Query param yang didukung: `limit`, `period`, opsional `filters.*`
//   serta `weights` (bisa string JSON/CSV atau nested
//   `weights.price/popularity/size`).
// - Respons backend bisa berupa Product[] (Format A) atau Format B
//   `{ product, score, scoreBreakdown, stats, badge }`. Fungsi
//   normalisasi `normalizeSawPayload` menerima berbagai bentuk (termasuk
//   variasi `items/recommendations/results` dan nested `data.*`).
// - Fallback: bila endpoint rekomendasi mengembalikan kosong atau gagal,
//   hook akan memanggil `/products/popular` yang juga SAW-backed.
"use client";

import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";
import { Product } from "@/types/product";

type SawItem = {
  product?: Product;
  score?: number;
  scoreBreakdown?: {
    priceNorm?: number;
    popularityNorm?: number;
    sizeNorm?: number;
    weights?: Record<string, number>;
  };
  stats?: { sold_30d?: number; views_30d?: number };
};

type SawResponse = {
  data?: SawItem[] | Product[];
  limit?: number;
  period?: number;
  weights?: Record<string, number> | string;
};

// Normalisasi respons dari berbagai bentuk menjadi struktur konsisten
// { items: Product[], ids: string[], raw: any }.
// Tujuannya agar komponen UI di FE tidak bergantung pada satu bentuk
// payload tertentu dari backend.
function normalizeSawPayload(payload: any): {
  items: Product[];
  ids: string[];
  raw: any;
} {
  // Accept multiple shapes: {data: []}, {items: []}, {data: {data: []}}, {data: {items: []}}
  const raw = payload ?? {};
  const list: any[] = Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.items)
    ? raw.items
    : Array.isArray(raw?.recommendations)
    ? raw.recommendations
    : Array.isArray(raw?.results)
    ? raw.results
    : Array.isArray(raw?.data?.data)
    ? raw.data.data
    : Array.isArray(raw?.data?.items)
    ? raw.data.items
    : Array.isArray(raw?.data?.recommendations)
    ? raw.data.recommendations
    : Array.isArray(raw?.data?.results)
    ? raw.data.results
    : [];

  const items: Product[] = list.map((it: any) =>
    it?.product ? it.product : it
  ) as Product[];
  const ids = items.map((p) => p.id);
  return { items, ids, raw };
}

export const UseFetchRecommendations = (opts?: {
  limit?: number;
  period?: number;
  filters?: Record<string, string | number | boolean | undefined>;
  weights?: Record<string, number> | string;
}) => {
  // Bangun query param: limit dan period diset default, filters
  // ditambahkan bila bernilai, weights bisa berupa string atau nested.
  const limit = opts?.limit ?? 10;
  const period = opts?.period ?? 30;
  const filters = opts?.filters ?? {};
  const weights = opts?.weights;

  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(limit));
  searchParams.set("period", String(period));
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      searchParams.set(k, String(v));
    }
  });

  // Support both string weights (JSON/CSV) and nested weights.*
  if (typeof weights === "string" && weights.trim().length > 0) {
    searchParams.set("weights", weights);
  } else if (weights && typeof weights === "object") {
    const { price, popularity, size } = weights as Record<string, number>;
    if (typeof price === "number")
      searchParams.set("weights.price", String(price));
    if (typeof popularity === "number")
      searchParams.set("weights.popularity", String(popularity));
    if (typeof size === "number")
      searchParams.set("weights.size", String(size));
  }

  const queryKey = ["products", "recommendations", limit, period, filters];

  // Eksekusi query via TanStack Query. Alur:
  // 1) Coba GET `/products/recommendations` ke backend 4000.
  // 2) Normalisasi payload.
  // 3) Jika kosong, fallback GET `/products/popular`.
  // 4) Jika keduanya gagal, kembalikan struktur aman `items: []`.
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const res = await axiosInstance.get(
          `/products/recommendations?${searchParams.toString()}`
        );
        const normalized = normalizeSawPayload(res.data);
        if (Array.isArray(normalized.items) && normalized.items.length > 0) {
          return normalized;
        }

        // Fallback to popular (now SAW-backed) if recommendations are empty
        const resPopular = await axiosInstance.get(
          `/products/popular?${searchParams.toString()}`
        );
        const normalizedPopular = normalizeSawPayload(resPopular.data);
        return normalizedPopular;
      } catch (err) {
        // On failure, attempt fallback to popular (SAW-backed), else return empty
        try {
          const resPopular = await axiosInstance.get(
            `/products/popular?${searchParams.toString()}`
          );
          const normalizedPopular = normalizeSawPayload(resPopular.data);
          return normalizedPopular;
        } catch (error) {
          return { items: [], ids: [], raw: { data: [], limit, period } };
        }
      }
    },
    staleTime: 0, // Always fetch fresh data to support real-time updates
    refetchOnWindowFocus: true,
  });

  return query;
};
