import { axiosInstance } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

interface UseGetCartProps {
  onError?: (e: Error) => void;
  enabled?: boolean;
}

export const UseGetCart = (params?: UseGetCartProps) => {
  const { onError, enabled = true } = params ?? {};
  return useQuery({
    queryFn: async () => {
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const url = `${origin}/api/carts`;
        const { data } = await axiosInstance.get(url);
        // Normalize response: accept either an array or an object containing an array
        const d: any = data;
        const normalized = Array.isArray(d)
          ? d
          : Array.isArray(d?.data)
          ? d.data
          : Array.isArray(d?.items)
          ? d.items
          : Array.isArray(d?.data?.items)
          ? d.data.items
          : Array.isArray(d?.data?.data)
          ? d.data.data
          : [];
        return normalized;
      } catch (error) {
        onError?.(error as Error);
        throw error;
      }
    },
    queryKey: ["cart"],
    enabled,
  });
};
