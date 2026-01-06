import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { RequestOtpSchema } from "@/schemas/forgot-password";

type UseRequestOtpProps = {
  onSuccess: (email: string) => void;
  onError: (error: unknown) => void;
};

export const useRequestOtp = ({ onSuccess, onError }: UseRequestOtpProps) => {
  return useMutation({
    mutationFn: async (form: RequestOtpSchema) => {
      try {
        // Gunakan Next API route agar ada fallback mock saat backend gagal
        const { data } = await axios.post("/api/auth/request-otp", {
          email: form.email,
          purpose: "forgot-password",
        });
        return data;
      } catch (error: unknown) {
        if (error instanceof Error && 'response' in error) {
          const axiosError = error as {
            response?: {
              data?: { message?: string; error?: string };
              status?: number;
            };
          };
          
          const errorMessage = axiosError.response?.data?.message || 
                              axiosError.response?.data?.error || 
                              'Failed to send OTP';
          
          throw new Error(errorMessage);
        } else if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error('Failed to send OTP. Please try again.');
      }
    },
    onSuccess: (data, variables) => {
      onSuccess(variables.email);
    },
    onError: (error) => {
      onError(error);
    },
  });
};
