import axios from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";

type SubmitRatingPayload = {
  productId: string;
  orderId?: string;
  rating: number; // 1-5
  comment?: string;
};

export const UseSubmitRating = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
} = {}) => {
  return useMutation({
    mutationFn: async (payload: SubmitRatingPayload) => {
      const { productId, orderId, rating, comment } = payload;
      const body = { productId, orderId, rating, comment };
      // Use internal API route
      const { data } = await axios.post("/ratings", body);
      return data?.data ?? data;
    },
    onSuccess,
    onError,
  });
};
