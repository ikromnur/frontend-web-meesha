import { axiosInstance } from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";

export interface ReplyPayload {
  messageId: string;
  replyText: string;
}

interface UseReplyMessageProps {
  onSuccess?: () => void;
  onError?: (e: Error) => void;
}

export const useReplyMessage = ({ onSuccess, onError }: UseReplyMessageProps = {}) => {
  return useMutation({
    mutationFn: async (payload: ReplyPayload) => {
      const { data } = await axiosInstance.post("/messages/reply", payload);
      return data;
    },
    onSuccess,
    onError,
  });
};