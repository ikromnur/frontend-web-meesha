import { axiosInstance } from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";
import { ContactFormValues } from "../form/contact";

interface UseCreateMessageProps {
  onSuccess?: () => void;
  onError?: (e: Error) => void;
}

export const UseCreateMessage = ({
  onSuccess,
  onError,
}: UseCreateMessageProps) => {
  return useMutation({
    mutationFn: async (payload: ContactFormValues) => {
      // Map frontend form fields to backend schema
      const backendPayload = {
        senderName: payload.name,
        senderEmail: payload.email,
        subject: `Pesan dari ${payload.name}`,
        body: payload.message,
        // phone is not defined in Message schema; send along if backend tolerates extra fields
        phone: payload.phone,
      };

      const { data } = await axiosInstance.post("/messages", backendPayload);
      return data;
    },
    onSuccess,
    onError,
  });
};
