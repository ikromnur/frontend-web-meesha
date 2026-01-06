import { useMutation, useQueryClient } from "@tanstack/react-query";
import { OrderStatusUpdate } from "../types/order.types";
import { api } from "@/lib/api";
import { mapUiToBackend } from "@/features/orders/utils";

interface UseUpdateOrderStatusProps {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export const useUpdateOrderStatus = ({
  onSuccess,
  onError,
}: UseUpdateOrderStatusProps = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: OrderStatusUpdate) => {
      const body = {
        status: mapUiToBackend(String(payload.status)),
        notes: payload.notes,
      } as Record<string, any>;
      if (payload.pickupAt) {
        body.pickupAt = payload.pickupAt;
      }

      const primaryUrl = `/api/v1/orders/${payload.order_id}`;
      console.log("[useUpdateOrderStatus] TRY v1", primaryUrl, body);
      try {
        const { data } = await api.patch(primaryUrl, body);
        return data;
      } catch (e: any) {
        const status = e?.response?.status;
        const message =
          e?.response?.data?.error?.message ||
          e?.response?.data?.message ||
          e?.message;
        console.warn("[useUpdateOrderStatus] v1 failed", { status, message });
        // Fallback ke proxy Next hanya jika memang tersedia
        const fallbackUrl = `/api/orders/${payload.order_id}`;
        console.log("[useUpdateOrderStatus] FALLBACK", fallbackUrl, body);
        const { data } = await api.patch(fallbackUrl, body);
        return data;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch orders
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-stats"] });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError,
  });
};
