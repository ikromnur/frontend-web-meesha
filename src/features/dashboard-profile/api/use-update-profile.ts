import { useMutation } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";

type UpdateProfilePayload = {
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

export const UseUpdateProfile = ({
  onSuccess,
  onError,
}: UseUpdateProfileProps) => {
  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const formData = new FormData();

      if (payload.username) formData.append("username", payload.username);
      if (payload.name) formData.append("name", payload.name);
      if (payload.email) formData.append("email", payload.email);
      if (payload.phone) formData.append("phone", payload.phone);
      if (payload.photo_profile)
        formData.append("photo_profile", payload.photo_profile);

      const { data } = await axiosInstance.put("/profile", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return data.data;
    },
    onSuccess,
    onError,
  });
};
