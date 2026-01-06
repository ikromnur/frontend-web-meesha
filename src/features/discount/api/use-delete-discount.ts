import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";

export const useDeleteDiscount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/discounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast({
        title: "Berhasil!",
        description: "Kode diskon telah berhasil dihapus.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error!",
        description: error.message || "Gagal menghapus kode diskon.",
        variant: "destructive",
      });
    },
  });
};
