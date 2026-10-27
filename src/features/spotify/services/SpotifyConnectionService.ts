import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { env } from "@/infrastructure/config/env";
import { supabase } from "@/infrastructure/supabase/client";
import { SecureStorageService } from "@/infrastructure/storage/SecureStorageService";
import { sanitizePlainText } from "@/shared/utils/sanitize";

const spotifyAccessTokenKey = "ehlibyte-spotify-access-token";
const spotifyRefreshTokenKey = "ehlibyte-spotify-refresh-token";
const spotifyExpiresAtKey = "ehlibyte-spotify-expires-at";
const spotifyScope = "user-read-currently-playing";
const tokenRefreshLeewayMs = 60_000;
const reconnectRequiredCode = "SPOTIFY_RECONNECT_REQUIRED";
const verifierChars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

interface SpotifyTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface SpotifyCurrentlyPlayingResponse {
  is_playing?: boolean;
  progress_ms?: number;
  item?: {
    id?: string;
    type?: string;
    name?: string;
    duration_ms?: number;
    artists?: Array<{ name?: string }>;
    album?: {
      images?: Array<{ url?: string; width?: number; height?: number }>;
    };
  } | null;
}

export interface SpotifyCurrentTrackResult {
  connected: boolean;
  trackSignal?: string;
  trackId?: string;
  trackName?: string;
  artistNames?: string[];
  albumImageUrl?: string;
  progressMs?: number;
  durationMs?: number;
}

const createRandomString = (length: number) => {
  const bytes = Crypto.getRandomBytes(length);

  return Array.from(bytes)
    .map((byte) => verifierChars[byte % verifierChars.length])
    .join("");
};

const toBase64Url = (value: string) =>
  value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const createCodeChallenge = async (verifier: string) =>
  toBase64Url(
    await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 },
    ),
  );

const parseAuthCode = (redirectUrl: string, expectedState: string) => {
  const parsedUrl = new URL(redirectUrl);
  const error = parsedUrl.searchParams.get("error");

  if (error) {
    throw new Error(`Spotify bağlantısı iptal edildi: ${error}`);
  }

  if (parsedUrl.searchParams.get("state") !== expectedState) {
    throw new Error("Spotify bağlantısı güvenlik doğrulamasından geçemedi.");
  }

  const code = parsedUrl.searchParams.get("code");

  if (!code) {
    throw new Error("Spotify bağlantısından yetki kodu alınamadı.");
  }

  return code;
};

const getSpotifyTokenError = (
  payload: SpotifyTokenResponse,
  fallback: string,
) => payload.error_description || payload.error || fallback;

const isRevokedSpotifyTokenError = (payload: SpotifyTokenResponse) => {
  const errorText = `${payload.error ?? ""} ${payload.error_description ?? ""}`.toLowerCase();

  return (
    errorText.includes("invalid_grant") ||
    errorText.includes("revoked") ||
    errorText.includes("invalid refresh") ||
    errorText.includes("refresh token")
  );
};

export const isSpotifyReconnectRequiredError = (error: unknown) =>
  error instanceof Error && error.message === reconnectRequiredCode;

class SpotifyReconnectRequiredError extends Error {
  constructor() {
    super(reconnectRequiredCode);
    this.name = "SpotifyReconnectRequiredError";
  }
}

export class SpotifyConnectionService {
  constructor(private readonly storage = new SecureStorageService()) {}

  async clearStoredConnection() {
    await Promise.all([
      this.storage.deleteItem(spotifyAccessTokenKey),
      this.storage.deleteItem(spotifyRefreshTokenKey),
      this.storage.deleteItem(spotifyExpiresAtKey),
    ]);
  }

  private async deactivateServerConnection() {
    const { error } = await supabase.functions.invoke("spotify-live-match", {
      body: { action: "disconnect" },
    });

    if (error && __DEV__) {
      console.info("Spotify arka plan bağlantısı kapatılamadı", error.message);
    }
  }

  async hasStoredConnection() {
    const refreshToken = await this.storage
      .getItem(spotifyRefreshTokenKey)
      .catch(() => null);
    const accessToken = await this.storage
      .getItem(spotifyAccessTokenKey)
      .catch(() => null);

    return Boolean(refreshToken || accessToken);
  }

  private async persistTokens(
    payload: SpotifyTokenResponse,
    options: { replaceRefreshToken?: boolean } = {},
  ) {
    if (!payload.access_token) {
      throw new Error("Spotify erişim anahtarı alınamadı.");
    }

    const expiresAt = Date.now() + (payload.expires_in ?? 3600) * 1000;
    const writes: Array<Promise<void>> = [
      this.storage.setItem(spotifyAccessTokenKey, payload.access_token),
      this.storage.setItem(spotifyExpiresAtKey, String(expiresAt)),
    ];

    if (payload.refresh_token) {
      writes.push(this.storage.setItem(spotifyRefreshTokenKey, payload.refresh_token));
    } else if (options.replaceRefreshToken) {
      writes.push(this.storage.deleteItem(spotifyRefreshTokenKey));
    }

    await Promise.all(writes);

    return { accessToken: payload.access_token, expiresAt };
  }

  private async refreshAccessToken() {
    if (!env.spotifyClientId) {
      throw new Error("Spotify Client ID eksik. EXPO_PUBLIC_SPOTIFY_CLIENT_ID eklenmeli.");
    }

    const refreshToken = await this.storage
      .getItem(spotifyRefreshTokenKey)
      .catch(() => null);

    if (!refreshToken) {
      await this.clearStoredConnection();
      await this.deactivateServerConnection().catch(() => undefined);
      throw new SpotifyReconnectRequiredError();
    }

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.spotifyClientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });
    const payload = (await response.json().catch(() => ({}))) as SpotifyTokenResponse;

    if (!response.ok || !payload.access_token) {
      if (isRevokedSpotifyTokenError(payload)) {
        await this.clearStoredConnection();
        await this.deactivateServerConnection().catch(() => undefined);
        throw new SpotifyReconnectRequiredError();
      }

      throw new Error(
        getSpotifyTokenError(
          payload,
          "Spotify oturumu yenilenemedi. Hesabını yeniden bağla.",
        ),
      );
    }

    return this.persistTokens(payload);
  }

  private async getValidAccessToken(forceRefresh = false) {
    const [accessToken, expiresAtValue] = await Promise.all([
      this.storage.getItem(spotifyAccessTokenKey).catch(() => null),
      this.storage.getItem(spotifyExpiresAtKey).catch(() => null),
    ]);
    const expiresAt = Number(expiresAtValue ?? 0);
    const shouldRefresh =
      forceRefresh ||
      !accessToken ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now() + tokenRefreshLeewayMs;

    if (shouldRefresh) {
      return this.refreshAccessToken();
    }

    return { accessToken, expiresAt };
  }

  private async syncServer(
    accessToken: string,
    expiresAt: number,
  ) {
    const refreshToken = await this.storage
      .getItem(spotifyRefreshTokenKey)
      .catch(() => null);
    const { error } = await supabase.functions.invoke("spotify-live-match", {
      body: {
        action: "sync",
        accessToken,
        refreshToken,
        expiresAt: new Date(expiresAt).toISOString(),
      },
    });

    if (error && __DEV__) {
      console.info("Spotify arka plan eşleştirmesi güncellenemedi", error.message);
    }
  }

  async connectAndGetCurrentTrack(): Promise<SpotifyCurrentTrackResult> {
    if (!env.spotifyClientId) {
      throw new Error("Spotify Client ID eksik. EXPO_PUBLIC_SPOTIFY_CLIENT_ID eklenmeli.");
    }

    const hadStoredConnection = await this.hasStoredConnection();
    const verifier = createRandomString(64);
    const state = createRandomString(32);
    const challenge = await createCodeChallenge(verifier);
    const authParams = new URLSearchParams({
      response_type: "code",
      client_id: env.spotifyClientId,
      scope: spotifyScope,
      redirect_uri: env.spotifyRedirectUri,
      code_challenge_method: "S256",
      code_challenge: challenge,
      state,
    });

    if (hadStoredConnection) {
      authParams.set("show_dialog", "true");
    }

    const authResult = await WebBrowser.openAuthSessionAsync(
      `https://accounts.spotify.com/authorize?${authParams.toString()}`,
      env.spotifyRedirectUri,
      { preferEphemeralSession: false },
    );

    if (authResult.type !== "success" || !("url" in authResult)) {
      throw new Error("Spotify bağlantısı tamamlanmadı.");
    }

    const code = parseAuthCode(authResult.url, state);
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.spotifyClientId,
        grant_type: "authorization_code",
        code,
        redirect_uri: env.spotifyRedirectUri,
        code_verifier: verifier,
      }).toString(),
    });
    const tokenPayload = (await tokenResponse.json().catch(() => ({}))) as SpotifyTokenResponse;

    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new Error(
        getSpotifyTokenError(tokenPayload, "Spotify token alınamadı."),
      );
    }

    const tokens = await this.persistTokens(tokenPayload, {
      replaceRefreshToken: true,
    });
    const result = await this.getCurrentTrackWithToken(tokens.accessToken);
    await this.syncServer(tokens.accessToken, tokens.expiresAt);
    return result;
  }

  private async getCurrentTrackWithToken(
    accessToken: string,
  ): Promise<SpotifyCurrentTrackResult> {
    const response = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (response.status === 401) {
      throw new Error("SPOTIFY_TOKEN_EXPIRED");
    }

    if (response.status === 204) {
      return { connected: true };
    }

    if (response.status === 429) {
      throw new Error("Spotify çok sık yenilendi. Biraz bekleyip tekrar dene.");
    }

    if (!response.ok) {
      throw new Error("Spotify'da çalan şarkı şu an okunamadı.");
    }

    const playback =
      (await response.json().catch(() => null)) as SpotifyCurrentlyPlayingResponse | null;
    const trackName = sanitizePlainText(playback?.item?.name ?? "", 80);
    const artistNames =
      playback?.item?.artists
        ?.map((artist) => sanitizePlainText(artist.name ?? "", 60))
        .filter(Boolean) ?? [];
    const trackId = sanitizePlainText(playback?.item?.id ?? "", 80);

    if (
      !playback?.is_playing ||
      playback.item?.type !== "track" ||
      !trackId ||
      !trackName
    ) {
      return { connected: true };
    }

    return {
      connected: true,
      trackId,
      trackName,
      artistNames,
      trackSignal: sanitizePlainText(
        artistNames.length > 0
          ? `${trackName} - ${artistNames.join(", ")}`
          : trackName,
        120,
      ),
      albumImageUrl: playback.item.album?.images?.find((image) => image.url)?.url,
      progressMs: playback.progress_ms,
      durationMs: playback.item.duration_ms,
    };
  }

  async getCurrentTrack(): Promise<SpotifyCurrentTrackResult> {
    let tokens = await this.getValidAccessToken();

    try {
      return await this.getCurrentTrackWithToken(tokens.accessToken);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "SPOTIFY_TOKEN_EXPIRED") {
        throw error;
      }

      tokens = await this.getValidAccessToken(true);
      return this.getCurrentTrackWithToken(tokens.accessToken);
    }
  }

  async refreshCurrentTrack(): Promise<SpotifyCurrentTrackResult> {
    let tokens = await this.getValidAccessToken();
    let result: SpotifyCurrentTrackResult;

    try {
      result = await this.getCurrentTrackWithToken(tokens.accessToken);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "SPOTIFY_TOKEN_EXPIRED") {
        throw error;
      }

      tokens = await this.getValidAccessToken(true);
      result = await this.getCurrentTrackWithToken(tokens.accessToken);
    }

    await this.syncServer(tokens.accessToken, tokens.expiresAt);
    return result;
  }
}

export const spotifyConnectionService = new SpotifyConnectionService();
