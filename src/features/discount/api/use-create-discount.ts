"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";
import { type DiscountFormValues } from "@/schemas/discount";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export const useCreateDiscount = () => {
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
      const { data } = await axiosInstance.post("/discounts", formattedValues);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast({
        title: "Berhasil!",
        description: "Kode diskon baru telah berhasil dibuat.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error!",
        description: error.message || "Gagal membuat kode diskon baru.",
        variant: "destructive",
      });
    },
  });
};