import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { axiosInstance } from "@/lib/axios";
import { CategoryFormValues } from "@/schemas/category";
import { useToast } from "@/hooks/use-toast";

type UseCreateCategoryProps = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

export const useCreateCategory = ({
  onSuccess,
  onError,
}: UseCreateCategoryProps = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      console.log("[MUTATION] Sending POST request to /categories with data:", values);
      const { data } = await axiosInstance.post("/categories", values);
      console.log("[MUTATION] Response data:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Berhasil!",
        description: "Kategori baru telah berhasil ditambahkan.",
      });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      console.error("Error creating category:", error);

      let errorMessage = "Gagal menambahkan kategori baru.";

      if (isAxiosError(error)) {
        const data = error.response?.data as { message?: string; error?: string } | undefined;
        if (data?.message) {
          errorMessage = data.message;
        } else if (data?.error) {
          errorMessage = data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
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
