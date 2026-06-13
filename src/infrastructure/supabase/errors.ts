type SupabaseErrorLike = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toSupabaseErrorLike = (error: unknown): SupabaseErrorLike | null => {
  if (!isObject(error)) {
    return null;
  }

  return {
    code: typeof error.code === "string" ? error.code : undefined,
    details: typeof error.details === "string" ? error.details : undefined,
    hint: typeof error.hint === "string" ? error.hint : undefined,
    message: typeof error.message === "string" ? error.message : undefined,
  };
};

export const createSupabaseRepositoryError = (fallbackMessage: string, error: unknown) => {
  const supabaseError = toSupabaseErrorLike(error);
  const details = [
    supabaseError?.code,
    supabaseError?.message,
    supabaseError?.details,
    supabaseError?.hint ? `Hint: ${supabaseError.hint}` : undefined,
  ].filter(Boolean);

  if (__DEV__ && details.length > 0) {
    return new Error(`${fallbackMessage} ${details.join(" - ")}`);
  }

  return new Error(fallbackMessage);
};
