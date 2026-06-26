import type { ProfilePhoto } from "@/domain/entities/User";

const AUTHENTICATED_PROFILE_PHOTO_PREFIX =
  "/storage/v1/object/authenticated/profile-photos/";
const PUBLIC_PROFILE_PHOTO_PREFIX = "/storage/v1/object/public/profile-photos/";

export const resolveProfilePhotoUri = (
  uri: string | null | undefined,
): string | undefined => {
  const trimmed = uri?.trim();

  if (!trimmed) {
    return undefined;
  }

  if (
    trimmed.startsWith("file://") ||
    trimmed.startsWith("content://") ||
    trimmed.startsWith("ph://")
  ) {
    return trimmed;
  }

  if (trimmed.includes(AUTHENTICATED_PROFILE_PHOTO_PREFIX)) {
    return trimmed.replace(
      AUTHENTICATED_PROFILE_PHOTO_PREFIX,
      PUBLIC_PROFILE_PHOTO_PREFIX,
    );
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return undefined;
};

export const getPrimaryProfilePhotoUri = (
  photos: ProfilePhoto[] | undefined,
): string | undefined => {
  if (!photos?.length) {
    return undefined;
  }

  const primary =
    photos.find((photo) => photo.isPrimary)?.uri ?? photos[0]?.uri;

  return resolveProfilePhotoUri(primary);
};
