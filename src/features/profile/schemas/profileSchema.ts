// Profil düzenleme formunun doğrulama kurallarını tanımlar.
import { z } from "zod";
import { culturalIdentityValues, cultureImportanceValues, interestValues } from "@/domain/entities/User";
import { sanitizePlainText } from "@/shared/utils/sanitize";

const safeRequiredText = (min: number, max: number, minMessage: string, maxMessage: string) =>
  z
    .string()
    .transform((value) => sanitizePlainText(value).trim())
    .pipe(z.string().min(min, minMessage).max(max, maxMessage));

const safeOptionalText = (max: number, maxMessage: string) =>
  z
    .string()
    .transform((value) => sanitizePlainText(value).trim())
    .pipe(z.string().max(max, maxMessage))
    .optional();

export const profileSchema = z.object({
  name: safeRequiredText(2, 80, "İsim gerekli.", "İsim 80 karakteri geçemez."),
  age: z.number().min(18, "18 yaş ve üzeri kullanıcılar kaydolabilir.").max(85, "Yaş değerini kontrol edin."),
  city: safeRequiredText(2, 80, "Şehir gerekli.", "Şehir 80 karakteri geçemez."),
  occupation: safeOptionalText(120, "Meslek 120 karakteri geçemez."),
  bio: safeRequiredText(12, 280, "Bio biraz daha açık olmalı.", "Bio 280 karakteri geçemez."),
  hometown: safeOptionalText(80, "Memleket 80 karakteri geçemez."),
  favoriteSong: safeOptionalText(120, "Favori türkü 120 karakteri geçemez."),
  favoritePoet: safeOptionalText(120, "Favori ozan 120 karakteri geçemez."),
  culturalIdentity: z.enum(culturalIdentityValues),
  cultureImportance: z.enum(cultureImportanceValues),
  interests: z.array(z.enum(interestValues)).min(1, "En az bir ilgi alanı seçin."),
  photoUri: z.string().optional()
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
