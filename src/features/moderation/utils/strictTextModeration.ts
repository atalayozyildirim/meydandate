// Serbest metin alanlarini tek moderation akisiyle perma-ban uyumlu denetler.
import { messageFilteringMiddleware } from "@/features/moderation/middleware/messageFilteringMiddleware";
import { PermanentBanError } from "@/features/moderation/utils/permanentBan";

export interface StrictTextField<T extends object> {
  key: Extract<keyof T, string>;
  label: string;
}

export const moderateStrictUserText = async ({
  scope,
  userId,
  text,
  label,
}: {
  scope: string;
  userId: string;
  text: string;
  label: string;
}) => {
  if (!text.trim()) {
    return text;
  }

  const moderation = await messageFilteringMiddleware(scope, userId, text);

  if (moderation.isBlocked) {
    if (moderation.action === "ban") {
      throw new PermanentBanError(
        `${label} ağır güvenlik ihlali nedeniyle engellendi. Hesap kalıcı olarak banlandı.`,
      );
    }

    throw new Error(`${label} güvenlik filtresinden geçemedi.`);
  }

  return moderation.filteredBody;
};

export const moderateStrictTextFields = async <T extends object>({
  scope,
  userId,
  payload,
  fields,
}: {
  scope: string;
  userId: string;
  payload: T;
  fields: Array<StrictTextField<T>>;
}): Promise<T> => {
  const moderated = { ...payload };
  const mutablePayload = moderated as Record<string, unknown>;

  for (const field of fields) {
    const value = mutablePayload[field.key];

    if (typeof value !== "string") {
      continue;
    }

    mutablePayload[field.key] = await moderateStrictUserText({
      scope: `${scope}:${field.key}`,
      userId,
      text: value,
      label: field.label,
    });
  }

  return moderated;
};
