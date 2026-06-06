// Onboarding formunun kulturel beyan ve profil alanlarini dogrular.
import { z } from "zod";
import { culturalIdentityValues, cultureImportanceValues, interestValues } from "@/domain/entities/User";

export const onboardingSchema = z.object({
  name: z.string().min(2, "Isim gerekli."),
  age: z.number().min(18, "18 yas ve uzeri kullanicilar kaydolabilir.").max(85, "Yas degerini kontrol edin."),
  city: z.string().min(2, "Sehir gerekli."),
  occupation: z.string().optional(),
  bio: z.string().min(12, "Kisa bir bio yazin.").max(280, "Bio 280 karakteri gecemez."),
  hometown: z.string().optional(),
  favoriteSong: z.string().optional(),
  favoritePoet: z.string().optional(),
  culturalIdentity: z.enum(culturalIdentityValues),
  cultureImportance: z.enum(cultureImportanceValues),
  interests: z.array(z.enum(interestValues)).min(1, "En az bir ilgi alani secin."),
  photoUri: z.string().optional()
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
