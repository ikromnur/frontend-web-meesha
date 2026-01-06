import { useQuery } from "@tanstack/react-query";

export type TripayChannel = {
  code: string;
  name: string;
  group?: string; // e.g., VA, QRIS
  fee_customer?: number;
};

type UseTripayChannelsParams = {
  code?: string;
  enabled?: boolean;
};

export function useTripayChannels({ code, enabled = true }: UseTripayChannelsParams) {
  const qs = code ? `?code=${encodeURIComponent(code)}` : "";
  // Selalu gunakan route lokal Next.js agar konsisten dan terhindar dari 404 backend
  const url = `/api/payments/tripay/channels${qs}`;

  return useQuery<{ data: TripayChannel[] }>({
    queryKey: ["tripay-channels", code ?? "all"],
    queryFn: async () => {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        const statusMsg = res.status ? ` (status ${res.status})` : "";
        throw new Error((json?.message || "Gagal memuat channel Tripay") + statusMsg);
      }
      return ("data" in json ? json : { data: json }) as { data: TripayChannel[] };
    },
    enabled,
    staleTime: 60_000,
  });
}