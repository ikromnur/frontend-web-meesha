import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

export const useDeleteDiscount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Gunakan internal API route (proxy) untuk menghindari masalah CORS
      // dan memastikan error handling yang lebih baik.
      await axios.delete(`/api/discounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast({
        title: "Berhasil!",
        description: "Kode diskon telah berhasil dihapus.",
      });
    },
    onError: (error: any) => {
      // Prioritize error message from response data (backend)
      const backendMessage = error?.response?.data?.message;
      const message =
        backendMessage || error?.message || "Gagal menghapus kode diskon.";

      toast({
        title: "Gagal Menghapus",
        description: message,
        variant: "destructive",
      });
    },
  });
};
