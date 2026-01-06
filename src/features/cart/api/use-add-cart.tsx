import { axiosInstance } from "@/lib/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface AddCartPayload {
  productId: string; // gunakan UUID string dari backend
  quantity?: number;
  size?: string;
}

interface UseAddCartProps {
  onSuccess?: (cartId?: string) => void;
  onError?: (e: Error) => void;
}

export const UseAddCart = ({ onSuccess, onError }: UseAddCartProps) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, quantity, size }: AddCartPayload) => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/api/carts`;
      const body = { productId, quantity, ...(size ? { size } : {}) };
      const { data } = await axiosInstance.post(url, body);
      const cartId: string | undefined = (data as any)?.data?.id;
      return { ...data, cartId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      onSuccess?.((data as any)?.cartId);
    },
    onError,
  });
};
