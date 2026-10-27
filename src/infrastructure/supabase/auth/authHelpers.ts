import { installCryptoPolyfill } from "@/shared/utils/installCryptoPolyfill";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../client";

installCryptoPolyfill();

export type AppleFullName = {
  givenName?: string | null;
  middleName?: string | null;
  familyName?: string | null;
};

export const signOutAndThrow = async (message: string): Promise<never> => {
  await supabase.auth.signOut();
  throw new Error(message);
};

export const readCallbackParam = (callbackUrl: string, key: string) => {
  try {
    const url = new URL(callbackUrl);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

    const value = url.searchParams.get(key) ?? hashParams.get(key);

    if (value === null) return null;

    if (key === "access_token" || key === "refresh_token" || key === "code") {
      if (!/^[A-Za-z0-9\-._~+/]+$/.test(value)) {
        return null;
      }
    } else if (
      key === "error" ||
      key === "error_code" ||
      key === "error_description"
    ) {
      if (!/^[\w\s\-.,;:!?'"()]+$/.test(value)) {
        return null;
      }
    }

    return value;
  } catch {
    return null;
  }
};

export const dismissAuthSession = () => {
  try {
    WebBrowser.dismissAuthSession();
  } catch {}
};

export const isSmsProviderInvalidParameter = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : String(error ?? "");

  return /60200|invalid parameter|error sending confirmation otp/i.test(message);
};

export const getAuthErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");

export const isOtpSignupNotAllowed = (error: unknown) =>
  /signup(s)? not allowed|signups? (is|are) disabled|otp.*not allowed/i.test(
    getAuthErrorMessage(error),
  );
