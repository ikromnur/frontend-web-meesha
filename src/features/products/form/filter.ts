import { z } from "zod";

export const filterSchema = z.object({
  search: z.string().optional(),
  categories: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
  objectives: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  size: z.array(z.string()).optional(),
  budget: z
    .object({
      gte: z.number().optional(),
      lte: z.number().optional(),
    })
    .optional(),
});

export type FilterSchema = z.infer<typeof filterSchema>;
