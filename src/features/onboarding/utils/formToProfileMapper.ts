import type { OnboardingProfile } from "@/domain/repositories/UserRepository";
import type { OnboardingFormValues } from "../schemas/onboardingSchema";

export const toProfilePayload = (
  values: OnboardingFormValues,
): OnboardingProfile => {
  const payload: OnboardingProfile = {
    name: values.name,
    age: values.age,
    city: values.city,
    bio: values.bio,
    culturalIdentity: values.culturalIdentity,
    cultureImportance: values.cultureImportance,
    interests: values.interests,
  };

  if (values.occupation) {
    payload.occupation = values.occupation;
  }

  if (values.hometown) {
    payload.hometown = values.hometown;
  }

  if (values.favoriteSong) {
    payload.favoriteSong = values.favoriteSong;
  }

  if (values.favoritePoet) {
    payload.favoritePoet = values.favoritePoet;
  }

  if (values.photoUri) {
    payload.photos = [
      { id: "profile-photo-primary", uri: values.photoUri, isPrimary: true },
    ];
  }

  return payload;
};
