import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { env } from "@/infrastructure/config/env";
import type { SocialAuthRuntime } from "./SocialAuthCoordinator";

WebBrowser.maybeCompleteAuthSession();

export const socialAuthRuntime: SocialAuthRuntime = {
  platform: Platform.OS,
  providerEnabled: async (provider) => {
    const response = await fetch(`${env.supabaseUrl}/auth/v1/settings`, { headers: { apikey: env.supabaseAnonKey } });
    if (!response.ok) throw new Error("Giriş hizmetine bağlanılamadı. Yeniden dene.");
    const settings = await response.json();
    return settings.external?.[provider] === true;
  },
  appleAvailable: () => AppleAuthentication.isAvailableAsync(),
  randomValue: () => Crypto.randomUUID(),
  hashNonce: (value) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value),
  appleSignIn: async (nonce, state) => {
    const credential = await AppleAuthentication.signInAsync({
      nonce, state,
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    const fullName = [credential.fullName?.givenName, credential.fullName?.middleName, credential.fullName?.familyName].filter(Boolean).join(" ");
    return { identityToken: credential.identityToken, state: credential.state, fullName };
  },
  openAuthSession: (url, redirect) => WebBrowser.openAuthSessionAsync(url, redirect),
};
