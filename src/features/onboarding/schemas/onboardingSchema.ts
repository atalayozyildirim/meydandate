// Onboarding formunun kültürel beyan ve profil alanlarını doğrular.
import { z } from "zod";
import { culturalIdentityValues, cultureImportanceValues, interestValues } from "@/domain/entities/User";

export const onboardingSchema = z.object({
  name: z.string().min(2, "İsim gerekli."),
  age: z.number().min(18, "18 yaş ve üzeri kullanıcılar kaydolabilir.").max(85, "Yaş değerini kontrol edin."),
  city: z.string().min(2, "Şehir gerekli."),
  occupation: z.string().optional(),
  bio: z.string().min(12, "Kısa bir bio yazın.").max(280, "Bio 280 karakteri geçemez."),
  hometown: z.string().optional(),
  favoriteSong: z.string().optional(),
  favoritePoet: z.string().optional(),
  culturalIdentity: z.enum(culturalIdentityValues),
  cultureImportance: z.enum(cultureImportanceValues),
  interests: z.array(z.enum(interestValues)).min(1, "En az bir ilgi alanı seçin."),
  photoUri: z.string().optional()
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
