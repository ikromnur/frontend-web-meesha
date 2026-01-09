import { axiosInstance } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import { Availability } from "@/types/product";
import { Cart, Size } from "@/types/cart";

interface UseGetCartProps {
  onError?: (e: Error) => void;
  enabled?: boolean;
}

export const UseGetCart = (params?: UseGetCartProps) => {
  const { onError, enabled = true } = params ?? {};
  return useQuery({
    queryFn: async () => {
      try {
        // FIX: Gunakan relative path dan override baseURL agar request mengarah ke Next.js API Route, bukan backend langsung
        const { data } = await axiosInstance.get("/api/carts", {
          baseURL: "", // Override default baseURL (localhost:4000) agar menjadi relative request
        });
        
        // Normalisasi respons: terima baik berupa array atau objek yang berisi array
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

        // Masukkan item ke dalam Keranjang dengan nilai numerik yang aman dan resolusi gambar.
        const normalizeSize = (val: any): Size => {
          const s = String(val ?? "")
            .toLowerCase()
            .trim();
          if (s === "s" || s === "small") return Size.SMALL;
          if (s === "m" || s === "medium") return Size.MEDIUM;
          if (s === "l" || s === "large") return Size.LARGE;
          if (
            s === "xl" ||
            s === "extra large" ||
            s === "extra_large" ||
            s === "extra-large"
          )
            return Size.EXTRA_LARGE;
          return Size.SMALL;
        };
        const normalizeAvailability = (val: any): Availability | undefined => {
          if (!val) return undefined;
          const s = String(val).toUpperCase().trim();
          if (s === Availability.READY) return Availability.READY;
          if (s === Availability.PO_2_DAY) return Availability.PO_2_DAY;
          if (s === Availability.PO_5_DAY) return Availability.PO_5_DAY;
          // Alternatif dengan heuristik
          const compact = s.replace(/[^A-Z0-9+]/g, "");
          if (
            (compact.includes("PO") || compact.includes("PREORDER")) &&
            compact.includes("5")
          )
            return Availability.PO_5_DAY;
          if (
            (compact.includes("PO") || compact.includes("PREORDER")) &&
            compact.includes("2")
          )
            return Availability.PO_2_DAY;
          if (compact.includes("READY")) return Availability.READY;
          if (compact.includes("H+5")) return Availability.PO_5_DAY;
          if (compact.includes("H+2")) return Availability.PO_2_DAY;
          return undefined;
        };

        const items: Cart[] = (rawItems as any[]).map((item) => {
          const toNumber = (val: any): number => {
            if (val == null) return 0;
            if (typeof val === "number") {
              const n = Number(val);
              return isFinite(n) ? n : 0;
            }
            if (typeof val === "string") {
              const cleaned = val.replace(/[^\d.]/g, "");
              const n = parseFloat(cleaned);
              return isFinite(n) ? n : 0;
            }
            const n = Number(val);
            return isFinite(n) ? n : 0;
          };
          const qty = toNumber(item?.quantity ?? 0);
          const price = toNumber(
            item?.unitPrice ??
              item?.price ??
              item?.product?.unitPrice ??
              item?.product?.price ??
              0
          );
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
            size: normalizeSize(item?.size ?? item?.product?.size ?? "S"),
            availability: normalizeAvailability(
              availability ?? item?.preorderDays ?? item?.leadTimeDays
            ),
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
