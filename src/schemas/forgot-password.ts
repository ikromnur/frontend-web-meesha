import { z } from "zod";
import { emailSchema, passwordSchema } from "./auth";

// Schema untuk request OTP (halaman 1)
export const requestOtpSchema = z.object({
  email: emailSchema,
});

export type RequestOtpSchema = z.infer<typeof requestOtpSchema>;

// Schema untuk reset password dengan OTP (halaman 2)
export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    otp: z.string().optional(),
    newPassword: passwordSchema,
    confirmPassword: z
      .string({ required_error: "Konfirmasi password wajib diisi" })
      .min(1, { message: "Konfirmasi password wajib diisi" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
