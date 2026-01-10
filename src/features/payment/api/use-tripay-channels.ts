import { useQuery } from "@tanstack/react-query";
import { getSession } from "next-auth/react";

export type TripayChannel = {
  code: string; // e.g., BNIVA, BRIVA, MANDIRVA, BCAVA, QRIS
  name: string;
  group?: string; // e.g., Virtual Account, QRIS
  fee_merchant?: number;
  fee_customer?: number;
  active?: boolean;
};

export const useTripayChannels = () => {
  return useQuery<{ data: TripayChannel[] }>({
    queryKey: ["tripay-channels"],
    queryFn: async () => {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      const session = await getSession();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (session?.accessToken) headers["Authorization"] = `Bearer ${session.accessToken}`;
      const resp = await fetch(`${base}/api/v1/payments/tripay/channels`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const message = json?.message || `Failed to fetch Tripay channels (${resp.status})`;
        throw new Error(message);
      }
      const list = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      return { data: list } as { data: TripayChannel[] };
    },
  });
};