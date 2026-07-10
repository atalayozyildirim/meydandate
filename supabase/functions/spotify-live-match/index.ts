import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type SpotifyConnection = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
};

type SpotifyTrack = {
  id: string;
  name: string;
  artistNames: string[];
  albumImageUrl: string | null;
  progressMs: number | null;
  durationMs: number | null;
  isPlaying: boolean;
};

type PresenceRow = {
  user_id: string;
  spotify_track_id: string;
  track_name: string;
  artist_names: string[];
};

type UserRow = {
  id: string;
  name: string;
  isActive: boolean;
  isDiscoverable: boolean;
  profileKind: string;
  blockedUsers: string[];
  mutedUsers: string[];
};

const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status });

const getSupabaseSecretKey = () => {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");

  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>;
      return parsed.default ?? Object.values(parsed)[0] ?? "";
    } catch {
      return "";
    }
  }

  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
};

const getBearerToken = (request: Request) => {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
};

const cleanText = (value: unknown, maxLength: number) =>
  typeof value === "string"
    ? value.replace(/[<>\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength)
    : "";

const cleanNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null;

const normalizeTrack = (value: unknown): SpotifyTrack | null => {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const id = cleanText(raw.id, 100);
  const name = cleanText(raw.name, 120);
  const artistNames = Array.isArray(raw.artistNames)
    ? raw.artistNames
        .map((artist) => cleanText(artist, 80))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  if (!id || !name || raw.isPlaying === false) return null;

  return {
    id,
    name,
    artistNames,
    albumImageUrl: cleanText(raw.albumImageUrl, 1000) || null,
    progressMs: cleanNumber(raw.progressMs),
    durationMs: cleanNumber(raw.durationMs),
    isPlaying: true,
  };
};

const trackSignal = (track: SpotifyTrack) =>
  cleanText(
    track.artistNames.length > 0
      ? `${track.name} - ${track.artistNames.join(", ")}`
      : track.name,
    120,
  );

const sendExpoPush = async (messages: Array<Record<string, unknown>>) => {
  for (let index = 0; index < messages.length; index += 100) {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages.slice(index, index + 100)),
    });

    if (!response.ok) {
      throw new Error(`Expo push request failed (${response.status})`);
    }
  }
};

const persistPresence = async (
  admin: SupabaseClient,
  userId: string,
  track: SpotifyTrack | null,
) => {
  if (!track) {
    await admin.from("spotify_live_presence").delete().eq("user_id", userId);
    return;
  }

  const observedAt = new Date();
  const expiresAt = new Date(observedAt.getTime() + 130_000);
  const { error } = await admin.from("spotify_live_presence").upsert({
    user_id: userId,
    spotify_track_id: track.id,
    track_name: track.name,
    artist_names: track.artistNames,
    album_image_url: track.albumImageUrl,
    progress_ms: track.progressMs,
    duration_ms: track.durationMs,
    is_playing: true,
    observed_at: observedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw error;

  await admin
    .from("users")
    .update({ favoriteSong: trackSignal(track) })
    .eq("id", userId);
};

const refreshSpotifyToken = async (connection: SpotifyConnection) => {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")?.trim() ?? "";

  if (!clientId || !connection.refresh_token) {
    throw new Error("Spotify refresh credentials are missing");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }).toString(),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error || `Spotify token refresh failed (${response.status})`);
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? connection.refresh_token,
    expiresAt: new Date(Date.now() + (payload.expires_in ?? 3600) * 1000),
  };
};

const fetchSpotifyTrack = async (accessToken: string) => {
  const response = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (response.status === 204) return null;
  if (response.status === 401) throw new Error("SPOTIFY_TOKEN_EXPIRED");
  if (response.status === 429) throw new Error("SPOTIFY_RATE_LIMITED");
  if (!response.ok) throw new Error(`Spotify playback failed (${response.status})`);

  const playback = (await response.json()) as {
    is_playing?: boolean;
    progress_ms?: number;
    item?: {
      id?: string;
      type?: string;
      name?: string;
      duration_ms?: number;
      artists?: Array<{ name?: string }>;
      album?: { images?: Array<{ url?: string }> };
    } | null;
  };

  if (!playback.is_playing || playback.item?.type !== "track") return null;

  return normalizeTrack({
    id: playback.item.id,
    name: playback.item.name,
    artistNames: playback.item.artists?.map((artist) => artist.name),
    albumImageUrl: playback.item.album?.images?.find((image) => image.url)?.url,
    progressMs: playback.progress_ms,
    durationMs: playback.item.duration_ms,
    isPlaying: true,
  });
};

const pollConnection = async (
  admin: SupabaseClient,
  connection: SpotifyConnection,
) => {
  let accessToken = connection.access_token;
  let refreshToken = connection.refresh_token;
  let expiresAt = new Date(connection.expires_at);

  try {
    if (expiresAt.getTime() <= Date.now() + 60_000) {
      const refreshed = await refreshSpotifyToken(connection);
      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken;
      expiresAt = refreshed.expiresAt;
    }

    let track: SpotifyTrack | null;

    try {
      track = await fetchSpotifyTrack(accessToken);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "SPOTIFY_TOKEN_EXPIRED") {
        throw error;
      }

      const refreshed = await refreshSpotifyToken({
        ...connection,
        refresh_token: refreshToken,
      });
      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken;
      expiresAt = refreshed.expiresAt;
      track = await fetchSpotifyTrack(accessToken);
    }

    await Promise.all([
      admin
        .from("spotify_connections")
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt.toISOString(),
          last_polled_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", connection.user_id),
      persistPresence(admin, connection.user_id, track),
    ]);
  } catch (error) {
    const message = cleanText(
      error instanceof Error ? error.message : "Spotify poll failed",
      500,
    );
    const disable = /refresh credentials|invalid_grant/i.test(message);
    await Promise.all([
      admin
        .from("spotify_connections")
        .update({
          is_active: !disable,
          last_polled_at: new Date().toISOString(),
          last_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", connection.user_id),
      disable
        ? persistPresence(admin, connection.user_id, null)
        : Promise.resolve(),
    ]);
  }
};

const canMatch = (first: UserRow, second: UserRow) =>
  first.isActive &&
  second.isActive &&
  first.isDiscoverable &&
  second.isDiscoverable &&
  first.profileKind === "member" &&
  second.profileKind === "member" &&
  !first.blockedUsers.includes(second.id) &&
  !first.mutedUsers.includes(second.id) &&
  !second.blockedUsers.includes(first.id) &&
  !second.mutedUsers.includes(first.id);

const detectAndNotifyMatches = async (admin: SupabaseClient) => {
  const now = new Date();
  const { data: presenceData, error: presenceError } = await admin
    .from("spotify_live_presence")
    .select("user_id,spotify_track_id,track_name,artist_names")
    .eq("is_playing", true)
    .gt("expires_at", now.toISOString());

  if (presenceError) throw presenceError;

  const presences = (presenceData ?? []) as PresenceRow[];
  const userIds = [...new Set(presences.map((presence) => presence.user_id))];

  if (userIds.length < 2) return 0;

  const [{ data: usersData, error: usersError }, { data: tokenData }] =
    await Promise.all([
      admin
        .from("users")
        .select("id,name,isActive,isDiscoverable,profileKind,blockedUsers,mutedUsers")
        .in("id", userIds),
      admin
        .from("push_tokens")
        .select("user_id,token")
        .in("user_id", userIds)
        .eq("is_active", true),
    ]);

  if (usersError) throw usersError;

  const users = new Map(
    ((usersData ?? []) as UserRow[]).map((user) => [
      user.id,
      {
        ...user,
        blockedUsers: user.blockedUsers ?? [],
        mutedUsers: user.mutedUsers ?? [],
      },
    ]),
  );
  const tokensByUser = new Map<string, string[]>();

  for (const row of tokenData ?? []) {
    const list = tokensByUser.get(row.user_id) ?? [];
    list.push(row.token);
    tokensByUser.set(row.user_id, list);
  }

  const byTrack = new Map<string, PresenceRow[]>();

  for (const presence of presences) {
    const list = byTrack.get(presence.spotify_track_id) ?? [];
    list.push(presence);
    byTrack.set(presence.spotify_track_id, list);
  }

  const bucket = Math.floor(now.getTime() / (6 * 60 * 60 * 1000));
  let delivered = 0;

  for (const [trackId, listeners] of byTrack) {
    if (listeners.length < 2) continue;

    for (let firstIndex = 0; firstIndex < listeners.length - 1; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < listeners.length; secondIndex += 1) {
        const firstPresence = listeners[firstIndex];
        const secondPresence = listeners[secondIndex];
        const first = users.get(firstPresence.user_id);
        const second = users.get(secondPresence.user_id);

        if (!first || !second || !canMatch(first, second)) continue;

        const [user1Id, user2Id] = [first.id, second.id].sort();
        const dedupeKey = `${trackId}:${user1Id}:${user2Id}:${bucket}`;
        const { error: eventError } = await admin
          .from("spotify_live_match_events")
          .insert({
            dedupe_key: dedupeKey,
            spotify_track_id: trackId,
            track_name: firstPresence.track_name,
            user1_id: user1Id,
            user2_id: user2Id,
          });

        if (eventError?.code === "23505") continue;
        if (eventError) throw eventError;

        const activities = [
          {
            source_key: `spotify:${dedupeKey}:${first.id}`,
            recipient_id: first.id,
            actor_id: second.id,
            activity_type: "spotify_match",
            title: "Aynı şarkıyı dinliyorsunuz",
            body: `${second.name} ile ${firstPresence.track_name} dinliyorsunuz. Mesaj at, eşleş!`,
          },
          {
            source_key: `spotify:${dedupeKey}:${second.id}`,
            recipient_id: second.id,
            actor_id: first.id,
            activity_type: "spotify_match",
            title: "Aynı şarkıyı dinliyorsunuz",
            body: `${first.name} ile ${firstPresence.track_name} dinliyorsunuz. Mesaj at, eşleş!`,
          },
        ];
        const { data: createdActivities, error: activityError } = await admin
          .from("user_activities")
          .insert(activities)
          .select("id,recipient_id");

        if (activityError) throw activityError;

        const activityIds = new Map(
          (createdActivities ?? []).map((activity) => [
            activity.recipient_id,
            activity.id,
          ]),
        );
        const messages = [
          ...((tokensByUser.get(first.id) ?? []).map((token) => ({
            to: token,
            sound: "default",
            channelId: "matches",
            title: "Aynı şarkıyı dinliyorsunuz",
            body: `${second.name} ile ${firstPresence.track_name} dinliyorsunuz. Mesaj at, eşleş!`,
            data: {
              type: "spotify_match",
              userId: second.id,
              trackId,
              trackName: firstPresence.track_name,
              activityId: activityIds.get(first.id),
            },
          }))),
          ...((tokensByUser.get(second.id) ?? []).map((token) => ({
            to: token,
            sound: "default",
            channelId: "matches",
            title: "Aynı şarkıyı dinliyorsunuz",
            body: `${first.name} ile ${firstPresence.track_name} dinliyorsunuz. Mesaj at, eşleş!`,
            data: {
              type: "spotify_match",
              userId: first.id,
              trackId,
              trackName: firstPresence.track_name,
              activityId: activityIds.get(second.id),
            },
          }))),
        ];

        if (messages.length > 0) {
          await sendExpoPush(messages);
          delivered += messages.length;
        }
      }
    }
  }

  return delivered;
};

const saveClientSync = async (
  admin: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
) => {
  const accessToken = cleanText(body.accessToken, 4096);
  const suppliedRefreshToken = cleanText(body.refreshToken, 4096) || null;
  const expiresAt = new Date(cleanText(body.expiresAt, 80));
  const replacesRefreshToken = Object.prototype.hasOwnProperty.call(
    body,
    "refreshToken",
  );

  if (!accessToken || !Number.isFinite(expiresAt.getTime())) {
    throw new Error("Invalid Spotify session");
  }

  const { data: existing } = await admin
    .from("spotify_connections")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  const nextRefreshToken = replacesRefreshToken
    ? suppliedRefreshToken
    : existing?.refresh_token ?? null;
  const { error } = await admin.from("spotify_connections").upsert({
    user_id: userId,
    access_token: accessToken,
    refresh_token: nextRefreshToken,
    expires_at: expiresAt.toISOString(),
    is_active: true,
    last_polled_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
  await pollConnection(admin, {
    user_id: userId,
    access_token: accessToken,
    refresh_token: nextRefreshToken,
    expires_at: expiresAt.toISOString(),
  });
};

const disconnectClientSync = async (
  admin: SupabaseClient,
  userId: string,
) => {
  const now = new Date().toISOString();

  await Promise.all([
    admin
      .from("spotify_connections")
      .update({
        is_active: false,
        last_polled_at: now,
        last_error: null,
        updated_at: now,
      })
      .eq("user_id", userId),
    persistPresence(admin, userId, null),
  ]);
};

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const secretKey = getSupabaseSecretKey();
    const bearerToken = getBearerToken(request);

    if (!supabaseUrl || !secretKey) {
      return json(500, { error: "Supabase admin credentials are not configured" });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action;
    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false },
    });

    try {
      if (action === "poll") {
        const pollSecret = request.headers.get("x-spotify-poll-secret") ?? "";
        const expectedPollSecret = Deno.env.get("SPOTIFY_POLL_SECRET") ?? "";
        const isAdminRequest = Boolean(bearerToken) && bearerToken === secretKey;
        const isScheduledRequest =
          expectedPollSecret.length >= 32 && pollSecret === expectedPollSecret;

        if (!isAdminRequest && !isScheduledRequest) {
          return json(401, { error: "Invalid poll credentials" });
        }

        const { data, error } = await admin
          .from("spotify_connections")
          .select("user_id,access_token,refresh_token,expires_at")
          .eq("is_active", true)
          .order("last_polled_at", { ascending: true, nullsFirst: true })
          .limit(100);

        if (error) throw error;

        const connections = (data ?? []) as SpotifyConnection[];

        for (let index = 0; index < connections.length; index += 5) {
          await Promise.all(
            connections
              .slice(index, index + 5)
              .map((connection) => pollConnection(admin, connection)),
          );
        }

        const delivered = await detectAndNotifyMatches(admin);
        return json(200, {
          ok: true,
          polled: connections.length,
          delivered,
        });
      }

      if (!["sync", "disconnect"].includes(String(action)) || !bearerToken) {
        return json(400, { error: "Valid action is required" });
      }

      const { data: authData, error: authError } =
        await admin.auth.getUser(bearerToken);
      const userId = authData.user?.id;

      if (authError || !userId) {
        return json(401, { error: "Invalid session" });
      }

      if (action === "disconnect") {
        await disconnectClientSync(admin, userId);
        return json(200, { ok: true, delivered: 0 });
      }

      await saveClientSync(admin, userId, body);
      const delivered = await detectAndNotifyMatches(admin);
      return json(200, { ok: true, delivered });
    } catch (error) {
      console.error("spotify-live-match failed", error);
      return json(500, {
        error: cleanText(
          error instanceof Error ? error.message : "Spotify live match failed",
          300,
        ),
      });
    }
  },
};
