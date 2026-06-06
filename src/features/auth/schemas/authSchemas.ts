// Auth formlarinin Zod dogrulama kurallarini tanimlar.
import { z } from "zod";

const phoneRegex = /^\+?[1-9]\d{9,14}$/;

export const loginSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .regex(phoneRegex, "Telefonu ulke koduyla girin. Ornek: +905551112233")
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, "Isim en az 2 karakter olmali.")
});

export const forgotPasswordSchema = loginSchema;

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
