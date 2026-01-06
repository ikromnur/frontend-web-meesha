"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "@/lib/axios";

type ReplyPayload = {
  ratingId: string;
  reply: string;
};

type Options = {
  onSuccess?: () => void;
  onError?: (error: any) => void;
};

export function UseReplyRating(options?: Options) {
  return useMutation({
    mutationKey: ["reply-rating"],
    mutationFn: async (payload: ReplyPayload) => {
      // Use internal API route
      const res = await axios.post("/ratings/reply", payload);
      return res.data;
    },
    onSuccess: () => {
      options?.onSuccess?.();
    },
    onError: (e) => {
      options?.onError?.(e);
    },
  });
}
