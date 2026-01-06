import { z } from "zod";
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  phoneSchema,
} from "@/schemas/auth";

export const registerFormSchema = z
  .object({
    username: z
      .string()
      .min(3, { message: "Username minimal 3 karakter" })
      .max(50, { message: "Username maksimal 50 karakter" })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message: "Username hanya boleh mengandung huruf, angka, dan underscore",
      }),
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z
      .string({
        required_error: "Confirm password is required",
      })
      .min(1, { message: "Password harap diisi" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormSchema = z.infer<typeof registerFormSchema>;
