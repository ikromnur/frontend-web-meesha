import { z } from "zod";

export const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .max(50, "Username maksimal 50 karakter")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username hanya boleh mengandung huruf, angka, dan underscore",
    )
    .optional()
    .or(z.literal("")),
  name: z.string().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Email tidak valid"),
  phone: z
    .string()
    .min(10, "Nomor HP minimal 10 digit")
    .optional()
    .or(z.literal("")),
  photo_profile: z.instanceof(File).nullable().optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
