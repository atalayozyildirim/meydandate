import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { onboardingSchema, type OnboardingFormValues } from "../schemas/onboardingSchema";

export const useOnboardingForm = () => {
  const currentUser = useAuthStore((state) => state.currentUser);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      age: undefined,
      city: "",
      occupation: currentUser?.occupation ?? "",
      bio: currentUser?.bio ?? "",
      hometown: currentUser?.hometown ?? "",
      favoriteSong: currentUser?.favoriteSong ?? "",
      favoritePoet: currentUser?.favoritePoet ?? "",
      culturalIdentity: currentUser?.culturalIdentity ?? "prefer_not_to_say",
      cultureImportance: currentUser?.cultureImportance ?? "somewhat_important",
      interests: currentUser?.interests ?? [],
      photoUri: currentUser?.photos[0]?.uri ?? "",
    },
  });

  const selectedPhotoUri = form.watch("photoUri");
  const formValues = form.watch();

  return {
    form,
    selectedPhotoUri,
    formValues,
  };
};
