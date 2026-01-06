import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";

type UseDeletePhotoProps = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export const useDeletePhoto = ({
  onSuccess,
  onError,
}: UseDeletePhotoProps = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.delete("/profile/photo");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      if (onSuccess) onSuccess();
    },
    onError,
  });
};
