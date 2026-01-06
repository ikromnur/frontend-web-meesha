import { z } from "zod";
import {
  emailSchema,
  nameSchema,
  phoneSchema,
} from "@/schemas/auth";

export const dashboardProfileSchema = z.object({
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
  photo_profile: z.any().optional(),
});

export type DashboardProfileFormValues = z.infer<typeof dashboardProfileSchema>;
