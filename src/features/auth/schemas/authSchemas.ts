// Auth formlarının Zod doğrulama kurallarını tanımlar.
import { z } from "zod";
import { sanitizePlainText } from "@/shared/utils/sanitize";
import { normalizeOtp, normalizePhoneNumber } from "@/shared/utils/phone";

const phoneRegex = /^\+?[1-9]\d{9,14}$/;

export const loginSchema = z.object({
  phoneNumber: z
    .string()
    .transform(normalizePhoneNumber)
    .pipe(z.string().regex(phoneRegex, "Telefonu ülke koduyla girin. Örnek: +905551112233"))
});

export const registerSchema = loginSchema.extend({
  name: z
    .string()
    .transform((value) => sanitizePlainText(value).trim())
    .pipe(z.string().min(2, "İsim en az 2 karakter olmalı.").max(80, "İsim 80 karakteri geçemez."))
});

export const forgotPasswordSchema = loginSchema;

export const otpSchema = z.object({
  token: z
    .string()
    .transform(normalizeOtp)
    .pipe(z.string().length(6, "Doğrulama kodu 6 haneli olmalı.")),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;
