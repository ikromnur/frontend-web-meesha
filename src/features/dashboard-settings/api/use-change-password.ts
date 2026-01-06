import { useMutation } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";

type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

type UseChangePasswordProps = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

export const UseChangePassword = ({
  onSuccess,
  onError,
}: UseChangePasswordProps) => {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      const { data } = await axiosInstance.put("/auth/change-password", payload);
      return data;
    },
    onSuccess,
    onError,
  });
};
