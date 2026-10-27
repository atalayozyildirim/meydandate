import { z } from "zod";
import { isAdultDate } from "../ageGate";

export const documentKinds = [
  "terms",
  "privacy",
  "kvkk",
  "community_rules",
] as const;
const legalDocument = z.object({
  kind: z.enum(documentKinds),
  version: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
});
export type LegalDocument = z.infer<typeof legalDocument>;
export const parseLegalDocuments = (value: unknown): LegalDocument[] => {
  const { documents } = z
    .object({ documents: z.array(legalDocument).length(4) })
    .parse(value);
  if (new Set(documents.map((document) => document.kind)).size !== 4)
    throw new Error("Gerekli bilgilendirme metinleri eksik.");
  return documents;
};

const accessSchema = z.object({
  userId: z.string().uuid(),
  eligible: z.boolean(),
  profileCompleted: z.boolean(),
  termsAccepted: z.boolean(),
  displayName: z.string(),
  city: z.string(),
});
export type CommunityAccess = z.infer<typeof accessSchema>;
export function parseAccess(
  value: unknown,
  verifiedUserId: string,
): CommunityAccess {
  const access = accessSchema.parse(value);
  if (access.userId !== verifiedUserId)
    throw new Error("Oturum ile profil eşleşmiyor.");
  return access;
}
export const canEnterCommunity = (access: CommunityAccess) =>
  access.eligible && access.profileCompleted && access.termsAccepted;

export type OnboardingInput = {
  displayName: string;
  birthDate: string;
  city: string;
  interests: string[];
  termsVersion: string;
  communityRulesVersion: string;
};
export function validateOnboarding(
  input: OnboardingInput,
  today?: string,
): OnboardingInput {
  const displayName = input.displayName.trim();
  const city = input.city.trim();
  if (displayName.length < 2 || displayName.length > 80)
    throw new Error("Adın 2–80 karakter arasında olmalı.");
  if (!isAdultDate(input.birthDate, today))
    throw new Error(
      "Geçerli doğum tarihini gir. Ehlibyte 18 yaş ve üzeri içindir.",
    );
  if (!city || city.length > 80) throw new Error("Yaşadığın şehri gir.");
  if (!input.termsVersion || !input.communityRulesVersion)
    throw new Error(
      "Güncel koşulları ve topluluk kurallarını kabul etmelisin.",
    );
  const interests = [
    ...new Set(input.interests.map((item) => item.trim()).filter(Boolean)),
  ];
  if (interests.length > 10 || interests.some((item) => item.length > 80))
    throw new Error("En fazla 10 ilgi alanı seçebilirsin.");
  return { ...input, displayName, city, interests };
}

export function normalizeCommunityPhone(value: string): string {
  let phone = value.replace(/[\s()-]/g, "");
  if (/^05\d{9}$/.test(phone)) phone = `+9${phone}`;
  else if (/^5\d{9}$/.test(phone)) phone = `+90${phone}`;
  if (!/^\+[1-9]\d{7,14}$/.test(phone))
    throw new Error("Telefonunu ülke koduyla gir. Örnek: +90 5XX XXX XX XX.");
  return phone;
}

