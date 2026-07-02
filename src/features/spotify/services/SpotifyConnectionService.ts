import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { env } from "@/infrastructure/config/env";
import { SecureStorageService } from "@/infrastructure/storage/SecureStorageService";
import { sanitizePlainText } from "@/shared/utils/sanitize";

if (typeof WebBrowser.maybeCompleteAuthSession === "function") {
  WebBrowser.maybeCompleteAuthSession();
}

const spotifyAccessTokenKey = "ehlibyte-spotify-access-token";
const spotifyRefreshTokenKey = "ehlibyte-spotify-refresh-token";
const spotifyExpiresAtKey = "ehlibyte-spotify-expires-at";
const spotifyScope = "user-read-currently-playing";
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
  item?: {
    name?: string;
    artists?: Array<{ name?: string }>;
  } | null;
}

export interface SpotifyCurrentTrackResult {
  connected: boolean;
  trackSignal?: string;
}

const createCodeVerifier = () => {
  const bytes = Crypto.getRandomBytes(64);

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

const parseAuthCode = (redirectUrl: string) => {
  const parsedUrl = new URL(redirectUrl);
  const error = parsedUrl.searchParams.get("error");

  if (error) {
    throw new Error(`Spotify bağlantısı iptal edildi: ${error}`);
  }

  const code = parsedUrl.searchParams.get("code");

  if (!code) {
    throw new Error("Spotify bağlantısından yetki kodu alınamadı.");
  }

  return code;
};

export class SpotifyConnectionService {
  constructor(private readonly storage = new SecureStorageService()) {}

  async hasStoredConnection() {
    const refreshToken = await this.storage
      .getItem(spotifyRefreshTokenKey)
      .catch(() => null);
    const accessToken = await this.storage
      .getItem(spotifyAccessTokenKey)
      .catch(() => null);

    return Boolean(refreshToken || accessToken);
  }

  async connectAndGetCurrentTrack(): Promise<SpotifyCurrentTrackResult> {
    if (!env.spotifyClientId) {
      throw new Error("Spotify Client ID eksik. EXPO_PUBLIC_SPOTIFY_CLIENT_ID eklenmeli.");
    }

    const verifier = createCodeVerifier();
    const challenge = await createCodeChallenge(verifier);
    const authParams = new URLSearchParams({
      response_type: "code",
      client_id: env.spotifyClientId,
      scope: spotifyScope,
      redirect_uri: env.spotifyRedirectUri,
      code_challenge_method: "S256",
      code_challenge: challenge,
    });
    const authResult = await WebBrowser.openAuthSessionAsync(
      `https://accounts.spotify.com/authorize?${authParams.toString()}`,
      env.spotifyRedirectUri,
      { preferEphemeralSession: false },
    );

    if (authResult.type !== "success" || !("url" in authResult)) {
      throw new Error("Spotify bağlantısı tamamlanmadı.");
    }

    const code = parseAuthCode(authResult.url);
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
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
        tokenPayload.error_description ||
          tokenPayload.error ||
          "Spotify token alınamadı.",
      );
    }

    await Promise.all([
      this.storage.setItem(spotifyAccessTokenKey, tokenPayload.access_token),
      tokenPayload.refresh_token
        ? this.storage.setItem(spotifyRefreshTokenKey, tokenPayload.refresh_token)
        : Promise.resolve(),
      tokenPayload.expires_in
        ? this.storage.setItem(
            spotifyExpiresAtKey,
            String(Date.now() + tokenPayload.expires_in * 1000),
          )
        : Promise.resolve(),
    ]);

    return this.getCurrentTrack(tokenPayload.access_token);
  }

  async getCurrentTrack(accessToken?: string): Promise<SpotifyCurrentTrackResult> {
    const token =
      accessToken ||
      (await this.storage.getItem(spotifyAccessTokenKey).catch(() => null));

    if (!token) {
      return { connected: false };
    }

    const playbackResponse = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (playbackResponse.status === 204) {
      return { connected: true };
    }

    if (!playbackResponse.ok) {
      return { connected: true };
    }

    const playback =
      (await playbackResponse.json().catch(() => null)) as SpotifyCurrentlyPlayingResponse | null;
    const trackName = sanitizePlainText(playback?.item?.name ?? "", 80);
    const artists =
      playback?.item?.artists
        ?.map((artist) => sanitizePlainText(artist.name ?? "", 60))
        .filter(Boolean) ?? [];

    if (!playback?.is_playing || !trackName) {
      return { connected: true };
    }

    return {
      connected: true,
      trackSignal: sanitizePlainText(
        artists.length > 0 ? `${trackName} - ${artists.join(", ")}` : trackName,
        120,
      ),
    };
  }
}

export const spotifyConnectionService = new SpotifyConnectionService();
