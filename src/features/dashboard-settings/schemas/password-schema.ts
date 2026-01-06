import { z } from "zod";
import { passwordSchema } from "@/schemas/auth";

export const changePasswordSchema = z
  .object({
    current_password: z
      .string()
      .min(1, { message: "Password saat ini harap diisi" }),
    new_password: passwordSchema,
    confirm_password: z
      .string()
      .min(1, { message: "Konfirmasi password harap diisi" }),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Password tidak cocok",
    path: ["confirm_password"],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: "Password baru tidak boleh sama dengan password lama",
    path: ["new_password"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
