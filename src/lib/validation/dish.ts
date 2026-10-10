import { z } from "zod";

export const dishName = z
  .string()
  .trim()
  .min(1, "Comment s'appelle ce plat ?")
  .max(80, "Un nom plus court ?")
  .refine((name) => /[\p{L}\p{N}]/u.test(name), "Un nom avec au moins une lettre ?");
