import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { ResetPasswordSchema } from "@/schemas/forgot-password";

type UseResetPasswordProps = {
  onSuccess: () => void;
  onError: (error: unknown) => void;
};

export const useResetPassword = ({
  onSuccess,
  onError,
}: UseResetPasswordProps) => {
  return useMutation({
    mutationFn: async (form: ResetPasswordSchema) => {
      const { data } = await axios.post("/api/auth/reset-password", {
        email: form.email,
        otp: form.otp,
        newPassword: form.newPassword,
      });
      return data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      onError(error);
    },
  });
};
