import { axiosInstance } from "@/lib/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UpdateCartPayload {
  cartId: string; // gunakan UUID string
  quantity?: number;
  size?: string;
}

interface UseUpdateCartProps {
  onSuccess?: () => void;
  onError?: (e: Error) => void;
}

export const UseUpdateCart = ({ onSuccess, onError }: UseUpdateCartProps) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cartId, quantity, size }: UpdateCartPayload) => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/api/carts/${cartId}`;
      const body = { ...(quantity !== undefined ? { quantity } : {}), ...(size ? { size } : {}) };
      const { data } = await axiosInstance.put(url, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      onSuccess?.();
    },
    onError,
  });
};
