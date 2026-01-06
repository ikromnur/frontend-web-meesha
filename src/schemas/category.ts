import { z } from "zod";

export const categorySchema = z.object({
  key: z
    .string({ required_error: "Key kategori wajib diisi" })
    .min(2, { message: "Key minimal 2 karakter" })
    .max(50, { message: "Key maksimal 50 karakter" })
    .regex(/^[a-z0-9_-]+$/, {
      message: "Key hanya boleh mengandung huruf kecil, angka, underscore, dan dash",
    }),
  name: z
    .string({ required_error: "Nama kategori wajib diisi" })
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(100, { message: "Nama maksimal 100 karakter" }),
  description: z
    .string()
    .max(500, { message: "Deskripsi maksimal 500 karakter" })
    .optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const categorySchemaWithId = categorySchema.extend({
  id: z.string().optional(),
});

export type CategoryFormValuesWithId = z.infer<typeof categorySchemaWithId>;
