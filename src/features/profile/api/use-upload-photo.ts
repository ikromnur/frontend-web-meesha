import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";

type UseUploadPhotoProps = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export const useUploadPhoto = ({
  onSuccess,
  onError,
}: UseUploadPhotoProps = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);

      const { data } = await axiosInstance.post("/profile/photo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      if (onSuccess) onSuccess();
    },
    onError,
  });
};
