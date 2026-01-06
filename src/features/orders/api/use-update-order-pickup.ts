import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface UpdateOrderPickupPayload {
  order_id: string; // gunakan db_id seperti pola di dashboard
  pickupAt: string; // ISO datetime
  pickupReason?: string; // alasan perubahan jadwal ambil (optional)
}

interface UseUpdateOrderPickupProps {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export const useUpdateOrderPickup = ({
  onSuccess,
  onError,
}: UseUpdateOrderPickupProps = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateOrderPickupPayload) => {
      const path = `/api/v1/orders/${payload.order_id}`;
      const body: Record<string, any> = { pickupAt: payload.pickupAt };
      if (payload.pickupReason && payload.pickupReason.trim()) {
        body.pickupReason = payload.pickupReason.trim();
      }
      console.log("[useUpdateOrderPickup] PATCH", path, body);
      const { data } = await api.patch(path, body);
      return data;
    },
    onSuccess: () => {
      // Invalidate orders-related queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-stats"] });
      onSuccess?.();
    },
    onError,
  });
};
