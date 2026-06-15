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

const getErrorField = (
  error: unknown,
  field: keyof SupabaseErrorLike,
) => {
  const supabaseError = toSupabaseErrorLike(error);
  const value = supabaseError?.[field];
  return typeof value === "string" ? value : "";
};

export const isMissingRpcError = (error: unknown, rpcName: string) => {
  const code = getErrorField(error, "code");
  const text = [
    getErrorField(error, "message"),
    getErrorField(error, "details"),
    getErrorField(error, "hint"),
  ].join(" ");

  return (
    code === "PGRST202" ||
    (text.includes(rpcName) && /schema cache|function/i.test(text))
  );
};

export const isMissingRowError = (error: unknown) => {
  const text = [
    getErrorField(error, "message"),
    getErrorField(error, "details"),
    getErrorField(error, "hint"),
  ].join(" ");

  return /not found|bulunamadi|bulunamadı/i.test(text);
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
