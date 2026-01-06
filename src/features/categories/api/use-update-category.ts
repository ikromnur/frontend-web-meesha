import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { axiosInstance } from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import type { UpdateCategoryInput } from "@/types/category";

type UseUpdateCategoryProps = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

export const useUpdateCategory = ({ onSuccess, onError }: UseUpdateCategoryProps = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (values: UpdateCategoryInput) => {
      const { id, ...payload } = values;
      const { data } = await axiosInstance.patch(`/categories/${id}`, payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate list and specific category detail
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ["category", variables.id] });
      }
      toast({
        title: "Berhasil!",
        description: "Kategori berhasil diperbarui.",
      });
      onSuccess?.();
    },
    onError: (error) => {
      let errorMessage = "Gagal memperbarui kategori.";

      if (isAxiosError(error)) {
        const data = error.response?.data as { message?: string; error?: string } | undefined;
        if (data?.message) errorMessage = data.message;
        else if (data?.error) errorMessage = data.error;
        else if (error.message) errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }

      toast({ title: "Error!", description: errorMessage, variant: "destructive" });
      onError?.(error);
    },
  });
};
