import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email.")
  .max(254)
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or less.");

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name cannot be empty.")
  .max(80, "Name must be 80 characters or less.");

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
