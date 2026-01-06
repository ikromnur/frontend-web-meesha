import { z } from "zod";

export const discountSchema = z.object({
  code: z.string().min(5, "Kode minimal 5 karakter").max(20, "Kode maksimal 20 karakter"),
  value: z.coerce.number().min(1, "Nilai diskon harus lebih dari 0"),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"], { required_error: "Tipe diskon harus dipilih" }),
  startDate: z.date({ required_error: "Tanggal mulai harus diisi" }),
  endDate: z.date({ required_error: "Tanggal berakhir harus diisi" }),
  maxUsage: z.coerce.number().optional(),
  maxUsagePerUser: z.coerce.number().optional(),
}).refine(data => data.endDate > data.startDate, {
  message: "Tanggal berakhir harus setelah tanggal mulai",
  path: ["endDate"],
});

export type DiscountFormValues = z.infer<typeof discountSchema>;
