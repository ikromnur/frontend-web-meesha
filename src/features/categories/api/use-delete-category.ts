import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { isAxiosError } from "axios";

type UseDeleteCategoryProps = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

export const useDeleteCategory = ({
  onSuccess,
  onError,
}: UseDeleteCategoryProps = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Berhasil!",
        description: "Kategori telah berhasil dihapus.",
      });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      let errorMessage = "Gagal menghapus kategori.";
      if (isAxiosError(error)) {
        const data = error.response?.data as { message?: string; error?: string } | undefined;
        if (data?.message) errorMessage = data.message;
        else if (data?.error) errorMessage = data.error;
        else if (error.message) errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }

      toast({
        title: "Error!",
        description: errorMessage,
        variant: "destructive",
      });
      if (onError) {
        onError(error);
      }
    },
  });
};
