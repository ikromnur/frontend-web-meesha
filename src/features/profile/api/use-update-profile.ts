import { useMutation } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";
import { AxiosError } from "axios";

export type UpdateProfilePayload = {
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  photo_profile?: File | null;
};

type UseUpdateProfileProps = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

export const useUpdateProfile = ({
  onSuccess,
  onError,
}: UseUpdateProfileProps = {}) => {
  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      try {
        console.log("[useUpdateProfile] Starting profile update");
        console.log("[useUpdateProfile] Payload:", {
          username: payload.username,
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
        });

        const body = {
          ...(payload.username !== undefined && { username: payload.username }),
          ...(payload.name !== undefined && { name: payload.name }),
          ...(payload.email !== undefined && { email: payload.email }),
          ...(payload.phone !== undefined && { phone: payload.phone }),
        };

        const { data } = await axiosInstance.put("/profile", body);

        console.log("[useUpdateProfile] Update successful");
        return data.data;
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;

        console.error("[useUpdateProfile] Update failed:", {
          status: axiosError.response?.status,
          message: axiosError.message,
          data: axiosError.response?.data,
        });

        if (axiosError.response?.status === 503) {
          throw new Error(
            "Backend server tidak berjalan. Mohon hubungi administrator.",
          );
        }

        if (axiosError.response?.status === 404) {
          throw new Error(
            "Endpoint update profile tidak ditemukan di backend.",
          );
        }

        if (axiosError.response?.status === 401) {
          throw new Error("Session expired. Silakan login kembali.");
        }

        if (axiosError.response?.data?.message) {
          throw new Error(axiosError.response.data.message);
        }

        throw error;
      }
    },
    onSuccess: () => {
      console.log("[useUpdateProfile] Mutation success callback");
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error("[useUpdateProfile] Mutation error callback:", error);
      if (onError) onError(error);
    },
  });
};
