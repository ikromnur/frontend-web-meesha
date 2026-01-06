import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";
import { type DiscountFormValues } from "@/schemas/discount";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export const useUpdateDiscount = (id?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (values: DiscountFormValues) => {
      const formattedValues = {
        ...values,
        value: Number(values.value),
        startDate: format(values.startDate, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
        endDate: format(values.endDate, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
      };
      const { data } = await axiosInstance.patch(`/discounts/${id}`, formattedValues);
      return data;
    },
    onSuccess: () => {
      // Invalidate both the list query and the single item query
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      queryClient.invalidateQueries({ queryKey: ["discounts", id] });
      toast({
        title: "Berhasil!",
        description: "Kode diskon telah berhasil diperbarui.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error!",
        description: error.message || "Gagal memperbarui kode diskon.",
        variant: "destructive",
      });
    },
  });
};
