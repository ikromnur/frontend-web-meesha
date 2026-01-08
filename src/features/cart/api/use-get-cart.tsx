import { axiosInstance } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import { Availability } from "@/types/product";
import { Cart } from "@/types/cart";

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
        const rawItems = Array.isArray(d)
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

        // Map into Cart items with safe numeric values and image resolution
        const items: Cart[] = (rawItems as any[]).map((item) => {
          const qty = Number(item?.quantity ?? 0) || 0;
          const price =
            Number(
              item?.unitPrice ??
                item?.price ??
                item?.product?.unitPrice ??
                item?.product?.price ??
                0,
            ) || 0;
          const imageCandidate =
            item?.image ??
            item?.imageUrl?.[0]?.url ??
            item?.images?.[0]?.url ??
            item?.product?.imageMain ??
            item?.product?.imageUrl?.[0]?.url ??
            item?.product?.images?.[0]?.url ??
            "";
          const availability: Availability | string | undefined =
            item?.availability ?? item?.product?.availability ?? undefined;
          return {
            id: String(item?.id ?? item?.cartId ?? ""),
            product_id: item?.product_id ?? item?.productId,
            name:
              item?.name ??
              item?.product?.name ??
              item?.productName ??
              "Produk",
            image: imageCandidate || "",
            price,
            quantity: qty,
            size: String(item?.size ?? item?.product?.size ?? "S"),
            availability,
          };
        });
        return items;
      } catch (error) {
        onError?.(error as Error);
        throw error;
      }
    },
    queryKey: ["cart"],
    enabled,
  });
};
