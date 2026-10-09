import { z } from "zod";
import { email, firstName } from "@/lib/validation/common";

export const password = z
  .string()
  .min(10, "10 caractères minimum, pour bien protéger tes données")
  .max(128, "128 caractères maximum");

export const registerSchema = z.object({
  name: firstName,
  email,
  password,
  inviteCode: z.string().trim().max(32).optional().default(""),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Ton mot de passe ?").max(128),
});

export const recoverSchema = z.object({
  email,
  code: z.string().trim().min(8, "Le code fait 12 caractères").max(32),
  password,
});
export type RecoverInput = z.infer<typeof recoverSchema>;
