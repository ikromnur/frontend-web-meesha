import { Availability, Size } from "@/types/product";
import { z } from "zod";

const selectObjectSchema = z.object({
  id: z.string().min(1, { message: "Harus dipilih" }),
  key: z.string(),
  name: z.string(),
});

const optionalSelectObjectSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
});

const productBaseSchema = z.object({
  name: z.string().min(1, { message: "Nama wajib diisi" }),
  price: z.number().min(0, { message: "Harga minimal 0" }),
  stock: z.number().int().min(0, { message: "Stok minimal 0" }),
  description: z.string().min(1, { message: "Deskripsi wajib diisi" }),
  imageUrl: z.any().optional(),
  images: z
    .array(
      z.union([
        z.instanceof(File),
        z.object({
          url: z.string(),
          publicId: z.string(),
        }),
      ])
    )
    .max(5, { message: "Maksimal 5 foto" })
    .optional()
    .nullable(),
  size: z.nativeEnum(Size),
  availability: z.nativeEnum(Availability),
  variant: z.array(z.string().min(1, "Variant tidak boleh kosong")).min(1, {
    message: "Minimal 1 variant harus ditambahkan",
  }),
  category: selectObjectSchema,
  // type removed
  objective: optionalSelectObjectSchema,
  color: optionalSelectObjectSchema,
  removeImagePublicIds: z.array(z.string()).optional(),
});

const ensureHasPhoto = (val: any, ctx: z.RefinementCtx) => {
  const hasMain = !!(
    val.imageUrl instanceof File ||
    (val.imageUrl &&
      typeof val.imageUrl === "object" &&
      (val.imageUrl as any).url)
  );
  const hasAdditional = Array.isArray(val.images) && val.images.length > 0;
  if (!hasMain && !hasAdditional) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Foto dibutuhkan, minimal 1 gambar",
      path: ["images"],
    });
  }
};

export const productSchema = productBaseSchema.superRefine(ensureHasPhoto);

export type ProductSchema = z.infer<typeof productSchema>;

export const productSchemaWithId = productBaseSchema
  .extend({ id: z.string().optional() })
  .superRefine(ensureHasPhoto);

export type ProductFormValues = z.infer<typeof productSchemaWithId>;
