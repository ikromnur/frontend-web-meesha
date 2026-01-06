import { axiosInstance } from "@/lib/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UseDeleteCartProps {
  onSuccess?: () => void;
  onError?: (e: Error) => void;
}

export const UseDeleteCart = ({ onSuccess, onError }: UseDeleteCartProps) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cartId: string) => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/api/carts/${cartId}`;
      const { data } = await axiosInstance.delete(url);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      onSuccess?.();
    },
    onError,
  });
};
