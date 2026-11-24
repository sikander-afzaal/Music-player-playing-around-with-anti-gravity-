import {
  DEMO_USER_PROFILE,
  DEMO_VAULT,
  TOP_ARTISTS,
  TOP_SONGS,
} from "../data/spotifyData";
import {
  ArtistStat,
  ArtistTopTrack,
  PersonalVaultData,
  SongStat,
  SpotifyPlaylistItem,
  SpotifyUserProfile,
} from "../types/spotify";

const STORAGE_KEYS = {
  VERIFIER: "pulseify_pkce_verifier",
  CLIENT_ID: "pulseify_spotify_client_id",
  REDIRECT_URI: "pulseify_spotify_redirect_uri",
  TOKEN: "pulseify_spotify_access_token",
  REFRESH_TOKEN: "pulseify_spotify_refresh_token",
  EXPIRES_AT: "pulseify_spotify_expires_at",
  PROFILE: "pulseify_user_profile",
  VAULT: "pulseify_user_vault_v4",
  PLAYLIST_LAST_PLAYED: "pulseify_playlist_last_played",
};

export function getPlaylistLastPlayedMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYLIST_LAST_PLAYED);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function markPlaylistAsPlayed(playlistId: string): void {
  if (typeof window === "undefined" || !playlistId) return;
  const map = getPlaylistLastPlayedMap();
  map[playlistId] = Date.now();
  localStorage.setItem(STORAGE_KEYS.PLAYLIST_LAST_PLAYED, JSON.stringify(map));
}

function formatRelativePlayed(ms: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return "Played just now";
  if (diffSec < 3600) return `Played ${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `Played ${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `Played ${Math.floor(diffSec / 86400)}d ago`;
  return `Played ${new Date(ms).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })}`;
}

function formatRelativeAdded(ms: number): string {
  if (!ms || ms <= 0) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `${m} ${m === 1 ? "minute" : "minutes"} ago`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  }
  if (diffSec < 86400 * 7) {
    const d = Math.floor(diffSec / 86400);
    return `${d} ${d === 1 ? "day" : "days"} ago`;
  }
  if (diffSec < 86400 * 30) {
    const w = Math.floor(diffSec / (86400 * 7));
    return `${w} ${w === 1 ? "week" : "weeks"} ago`;
  }
  return new Date(ms).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const DEFAULT_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";

function generateRandomString(length: number): string {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest("SHA-256", data);
}

function base64encode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function getSavedClientId(): string {
  if (process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID) {
    return process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  }
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEYS.CLIENT_ID);
    if (stored) return stored;
  }
  return DEFAULT_CLIENT_ID;
}

export function applyServerSpotifyTokens(
  accessToken: string,
  refreshToken?: string | null,
  clientId?: string | null
): void {
  if (typeof window === "undefined") return;
  if (accessToken) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
    localStorage.setItem(
      STORAGE_KEYS.EXPIRES_AT,
      String(Date.now() + 3500 * 1000)
    );
  }
  if (refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }
  if (clientId) {
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId);
  }
}

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export async function getValidAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  const expiresAt = Number(localStorage.getItem(STORAGE_KEYS.EXPIRES_AT) || 0);

  if (token && (!expiresAt || Date.now() < expiresAt - 60_000)) {
    return token;
  }

  if (refreshToken) {
    try {
      const clientId = getSavedClientId();
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token);
          if (data.refresh_token) {
            localStorage.setItem(
              STORAGE_KEYS.REFRESH_TOKEN,
              data.refresh_token
            );
          }
          if (data.expires_in) {
            localStorage.setItem(
              STORAGE_KEYS.EXPIRES_AT,
              String(Date.now() + Number(data.expires_in) * 1000)
            );
          }
          return data.access_token as string;
        }
      }
    } catch {
      // Best effort fallback
    }
  }

  return token;
}

export function getCachedSession(): {
  profile: SpotifyUserProfile;
  vault: PersonalVaultData;
} | null {
  if (typeof window === "undefined") return null;
  const rawProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
  if (!rawProfile) return null;

  try {
    const profile = JSON.parse(rawProfile) as SpotifyUserProfile;
    const rawVault = localStorage.getItem(STORAGE_KEYS.VAULT);
    if (rawVault) {
      return {
        profile,
        vault: JSON.parse(rawVault) as PersonalVaultData,
      };
    }
    if (profile.isDemo) {
      return { profile, vault: DEMO_VAULT };
    }
    // For a real user without v2 vault cached yet, return empty structure until live fetch finishes
    return {
      profile,
      vault: {
        topArtistsByRange: { short_term: [], medium_term: [], long_term: [] },
        topTracksByRange: { short_term: [], medium_term: [], long_term: [] },
        recentlyPlayed: [],
        likedSongs: [],
        playlists: [],
        minutesListened30d: 0,
        topGenres: [],
        audioDna: {
          danceability: 74,
          energy: 72,
          valence: 65,
          acousticness: 25,
          bpm: 122,
        },
      },
    };
  } catch {
    return null;
  }
}

export function getRedirectUri(): string {
  if (typeof window === "undefined") {
    return "https://pulseify-studio.vercel.app";
  }
  const host = window.location.hostname;
  if (host === "127.0.0.1" || host === "localhost") {
    return window.location.origin.replace("://localhost", "://127.0.0.1");
  }
  if (host.endsWith(".vercel.app")) {
    return "https://pulseify-studio.vercel.app";
  }
  return window.location.origin;
}

export async function initiateSpotifyPkceLogin(
  clientIdInput?: string,
  customRedirectUri?: string
): Promise<void> {
  const clientId = (clientIdInput || getSavedClientId()).trim() || DEFAULT_CLIENT_ID;
  const redirectUri = (customRedirectUri || getRedirectUri()).trim();
  localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId);
  localStorage.setItem(STORAGE_KEYS.REDIRECT_URI, redirectUri);

  const codeVerifier = generateRandomString(64);
  localStorage.setItem(STORAGE_KEYS.VERIFIER, codeVerifier);

  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  // Full scopes including Liked Songs (user-library-read) and Playlists (playlist-read-private)
  const scope = [
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-read-recently-played",
    "user-library-read",
    "playlist-read-private",
    "playlist-read-collaborative",
  ].join(" ");

  const statePayload = btoa(
    JSON.stringify({ v: codeVerifier, c: clientId, r: redirectUri })
  );

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", statePayload);

  window.location.href = authUrl.toString();
}

export async function handleSpotifyCallback(): Promise<{
  profile: SpotifyUserProfile;
  vault: PersonalVaultData;
  isFreshLogin?: boolean;
} | null> {
  if (typeof window === "undefined") return null;

  if (window.location.hostname === "localhost") {
    const targetUrl = window.location.href.replace(
      "://localhost",
      "://127.0.0.1"
    );
    window.location.replace(targetUrl);
    return null;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const rawState = urlParams.get("state");

  if (!code) {
    const cached = getCachedSession();
    const validToken = await getValidAccessToken();
    if (validToken) {
      try {
        return await fetchLiveSpotifyUserAndVault(validToken);
      } catch {
        if (cached) return cached;
      }
    }
    return cached;
  }

  let stateVerifier = "";
  let stateClientId = "";
  let stateRedirect = "";
  if (rawState) {
    try {
      const parsed = JSON.parse(atob(rawState));
      stateVerifier = parsed.v || "";
      stateClientId = parsed.c || "";
      stateRedirect = parsed.r || "";
    } catch {
      stateVerifier = rawState;
    }
  }

  const codeVerifier =
    localStorage.getItem(STORAGE_KEYS.VERIFIER) || stateVerifier;
  const clientId = getSavedClientId() || stateClientId;
  const redirectUri = stateRedirect || getRedirectUri();
  if (clientId) {
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId);
  }

  window.history.replaceState({}, document.title, window.location.pathname);

  if (!codeVerifier || !clientId) {
    return getCachedSession();
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    return getCachedSession();
  }

  const tokenData = await tokenRes.json();
  const accessToken: string = tokenData.access_token;
  localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
  if (tokenData.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
  }
  if (tokenData.expires_in) {
    localStorage.setItem(
      STORAGE_KEYS.EXPIRES_AT,
      String(Date.now() + Number(tokenData.expires_in) * 1000)
    );
  }

  try {
    fetch("/api/auth/save-env", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dump: {
          pulseify_spotify_client_id: clientId,
          pulseify_spotify_access_token: accessToken,
          pulseify_spotify_refresh_token: tokenData.refresh_token || "",
        },
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }

  const liveData = await fetchLiveSpotifyUserAndVault(accessToken);
  return { ...liveData, isFreshLogin: true };
}

function formatDurationMs(ms: number): string {
  if (!ms || ms <= 0) return "3:30";
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function mapSpotifyTrackToSongStat(
  item: Record<string, unknown>,
  index: number,
  addedAt?: string,
  addedAtMs?: number
): SongStat {
  const fallback = TOP_SONGS[index % TOP_SONGS.length];
  const album = item.album as
    | {
        name?: string;
        release_date?: string;
        images?: { url: string }[];
      }
    | undefined;
  const artists = item.artists as
    | { id?: string; name: string }[]
    | undefined;
  const popularity = typeof item.popularity === "number" ? item.popularity : 75;
  const estimatedDaily = Math.max(
    45_000,
    Math.round(popularity * 54_000 + (10 - (index % 10)) * 18_000)
  );
  const estimatedTotal = Math.round(estimatedDaily * 210);
  const releaseYear = album?.release_date
    ? Number(album.release_date.slice(0, 4)) || 2024
    : 2024;
  const trackId = String(item.id || fallback.spotifyTrackId);

  return {
    ...fallback,
    id: `spotify-track-${trackId}-${index}`,
    spotifyTrackId: trackId,
    rank: index + 1,
    title: String(item.name || "Untitled Track"),
    artistId: String(artists?.[0]?.id || fallback.artistId),
    artistName:
      artists?.map((a) => a.name).join(", ") || "Unknown Artist",
    album: album?.name || "Single",
    coverUrl:
      album?.images?.[0]?.url ||
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
    dailyStreams: estimatedDaily,
    dailyDelta: Math.round((popularity - 68) * 2800),
    totalStreams: estimatedTotal,
    peakRank: Math.max(1, Math.min(50, Math.round((100 - popularity) / 2) + 1)),
    peakDailyStreams: Math.round(estimatedDaily * 1.45),
    releaseYear,
    era:
      releaseYear >= 2020
        ? "2020s"
        : releaseYear >= 2010
        ? "2010s"
        : releaseYear >= 2000
        ? "2000s"
        : "classics",
    duration: formatDurationMs(Number(item.duration_ms || 210000)),
    addedAt,
    addedAtMs,
  };
}

export function mapSpotifyArtistToArtistStat(
  item: Record<string, unknown>,
  index: number
): ArtistStat {
  const existing = TOP_ARTISTS.find(
    (a) =>
      a.spotifyArtistId === item.id ||
      a.name.toLowerCase() === String(item.name || "").toLowerCase()
  );
  const images = item.images as { url: string }[] | undefined;
  const followers = item.followers as { total?: number } | undefined;
  const genres = item.genres as string[] | undefined;

  if (existing) {
    return {
      ...existing,
      rank: index + 1,
      avatar: images?.[0]?.url || existing.avatar,
      followers: followers?.total ?? existing.followers,
    };
  }

  const template = TOP_ARTISTS[index % TOP_ARTISTS.length];
  const popularity = typeof item.popularity === "number" ? item.popularity : 0;
  const followerCount =
    typeof followers?.total === "number" ? followers.total : 0;
  const estimatedListeners =
    followerCount > 0 || popularity > 0
      ? Math.max(
          85_000,
          Math.round(followerCount * 1.35 + popularity * 180_000)
        )
      : 0;
  const artistId = String(item.id || `artist-${index}`);
  const formattedGenres =
    genres && genres.length > 0
      ? genres
          .slice(0, 3)
          .map((g) => g.replace(/\b\w/g, (c) => c.toUpperCase()))
      : [];

  return {
    id: `spotify-artist-${artistId}`,
    spotifyArtistId: artistId,
    rank: index + 1,
    name: String(item.name || "Artist"),
    avatar:
      images?.[0]?.url ||
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
    bannerColor: template.bannerColor,
    verified: true,
    monthlyListeners: estimatedListeners,
    dailyDelta: popularity > 0 ? Math.round((popularity - 55) * 1200) : 0,
    peakListeners:
      estimatedListeners > 0 ? Math.round(estimatedListeners * 1.15) : 0,
    peakRank: index + 1,
    followers: followerCount,
    totalStreams: 0,
    leadStreams: 0,
    genres: formattedGenres,
    primaryGenre: formattedGenres[0] || "Top Artist",
    countryOrigin: "GLOBAL",
    debutEra: "2020s",
    history30d: [1, 1.05, 1.08, 1.1, 1.12, 1.15, 1.18],
    topCities: [],
    // IMPORTANT: Never copy hardcoded topTracks (Blinding Lights / Die With A Smile) onto personal artists!
    topTracks: [],
  };
}

const GENRE_COLORS = [
  "#1ED760",
  "#10B981",
  "#38BDF8",
  "#F59E0B",
  "#A855F7",
  "#F43F5E",
];

export async function fetchLiveSpotifyUserAndVault(
  accessToken: string
): Promise<{
  profile: SpotifyUserProfile;
  vault: PersonalVaultData;
}> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const [
    meRes,
    artistsShortRes,
    artistsMedRes,
    artistsLongRes,
    tracksShortRes,
    tracksMedRes,
    tracksLongRes,
    recentRes,
    likedRes,
    playlistsRes,
  ] = await Promise.all([
    fetch("https://api.spotify.com/v1/me", { headers }),
    fetch(
      "https://api.spotify.com/v1/me/top/artists?limit=15&time_range=short_term",
      { headers }
    ),
    fetch(
      "https://api.spotify.com/v1/me/top/artists?limit=15&time_range=medium_term",
      { headers }
    ),
    fetch(
      "https://api.spotify.com/v1/me/top/artists?limit=15&time_range=long_term",
      { headers }
    ),
    fetch(
      "https://api.spotify.com/v1/me/top/tracks?limit=15&time_range=short_term",
      { headers }
    ),
    fetch(
      "https://api.spotify.com/v1/me/top/tracks?limit=15&time_range=medium_term",
      { headers }
    ),
    fetch(
      "https://api.spotify.com/v1/me/top/tracks?limit=15&time_range=long_term",
      { headers }
    ),
    fetch("https://api.spotify.com/v1/me/player/recently-played?limit=50", {
      headers,
    }),
    fetch("https://api.spotify.com/v1/me/tracks?limit=50", { headers }),
    fetch("https://api.spotify.com/v1/me/playlists?limit=50", { headers }),
  ]);

  if (!meRes.ok) {
    throw new Error("Spotify session expired or unauthorized.");
  }

  const me = await meRes.json();
  const profile: SpotifyUserProfile = {
    id: me.id || "spotify_user",
    displayName: me.display_name || "Spotify Listener",
    email: me.email || "connected@spotify.com",
    avatarUrl:
      me.images?.[0]?.url ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    country: me.country || "PK",
    product: me.product === "premium" ? "premium" : "free",
    followers: me.followers?.total ?? 0,
    isDemo: false,
  };

  const parseArtists = async (res: Response): Promise<ArtistStat[]> => {
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.items)) return [];
    return data.items.map((item: Record<string, unknown>, i: number) =>
      mapSpotifyArtistToArtistStat(item, i)
    );
  };

  const parseTracks = async (res: Response): Promise<SongStat[]> => {
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.items)) return [];
    return data.items.map((item: Record<string, unknown>, i: number) =>
      mapSpotifyTrackToSongStat(item, i)
    );
  };

  let [aShort, aMed, aLong, tShort, tMed, tLong] = await Promise.all([
    parseArtists(artistsShortRes),
    parseArtists(artistsMedRes),
    parseArtists(artistsLongRes),
    parseTracks(tracksShortRes),
    parseTracks(tracksMedRes),
    parseTracks(tracksLongRes),
  ]);

  // Parse Recently Played + track which playlists were most recently played via context.uri
  let recentlyPlayed: { song: SongStat; playedAt: string }[] = [];
  const contextPlayTimes: Record<string, number> = {
    ...getPlaylistLastPlayedMap(),
  };

  if (recentRes.ok) {
    const recentJson = await recentRes.json();
    if (Array.isArray(recentJson.items)) {
      recentlyPlayed = recentJson.items.map(
        (
          entry: {
            track: Record<string, unknown>;
            played_at?: string;
            context?: { type?: string; uri?: string } | null;
          },
          i: number
        ) => {
          const playedMs = entry.played_at
            ? new Date(entry.played_at).getTime()
            : 0;
          const ctxUri = entry.context?.uri || "";
          if (ctxUri.includes("playlist:") && playedMs > 0) {
            const plId = ctxUri.split("playlist:")[1];
            if (plId && (!contextPlayTimes[plId] || playedMs > contextPlayTimes[plId])) {
              contextPlayTimes[plId] = playedMs;
            }
          }
          return {
            song: mapSpotifyTrackToSongStat(entry.track, i),
            playedAt: entry.played_at
              ? new Date(entry.played_at).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Recently",
          };
        }
      );
    }
  }

  // Parse Liked Songs (/v1/me/tracks) — already sorted by Spotify with most recently added on top
  let likedSongs: SongStat[] = [];
  let likedSongsTotal = 0;
  let needsLibraryScope = false;

  if (likedRes.ok) {
    const likedJson = await likedRes.json();
    likedSongsTotal = Number(likedJson.total || 0);
    if (Array.isArray(likedJson.items)) {
      likedSongs = likedJson.items
        .filter((it: { track?: Record<string, unknown> }) => Boolean(it?.track))
        .map(
          (
            it: { track: Record<string, unknown>; added_at?: string },
            i: number
          ) => {
            const addedMs = it.added_at ? new Date(it.added_at).getTime() : 0;
            return mapSpotifyTrackToSongStat(
              it.track,
              i,
              it.added_at
                ? new Date(it.added_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : undefined,
              addedMs
            );
          }
        );
    }
  } else if (likedRes.status === 403 || likedRes.status === 401) {
    needsLibraryScope = true;
  }

  // Parse User Playlists (/v1/me/playlists, or fallback to /v1/users/{id}/playlists)
  let playlists: SpotifyPlaylistItem[] = [];
  let plResToUse = playlistsRes;
  if (!plResToUse.ok && me.id) {
    plResToUse = await fetch(
      `https://api.spotify.com/v1/users/${encodeURIComponent(
        me.id
      )}/playlists?limit=50`,
      { headers }
    );
  }
  if (plResToUse.ok) {
    const plJson = await plResToUse.json();
    if (Array.isArray(plJson.items)) {
      playlists = plJson.items
        .filter(Boolean)
        .map((pl: Record<string, unknown>, idx: number) => {
          const id = String(pl.id);
          const images = pl.images as { url: string }[] | undefined;
          const tracksObj = (pl.tracks || pl.items) as
            | { total?: number }
            | undefined;
          const ownerObj = pl.owner as { display_name?: string } | undefined;
          const playedMs = contextPlayTimes[id] || 0;
          return {
            id,
            name: String(pl.name || "Untitled Playlist"),
            description: String(pl.description || "").replace(/<[^>]*>/g, ""),
            coverUrl:
              images?.[0]?.url ||
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
            trackCount: Number(tracksObj?.total ?? 0),
            ownerName: String(ownerObj?.display_name || profile.displayName),
            isPublic: Boolean(pl.public ?? true),
            lastPlayedAtMs: playedMs || (1000 - idx),
            lastPlayedLabel: playedMs ? formatRelativePlayed(playedMs) : undefined,
          };
        });

      // Sort playlists by lastPlayedAtMs descending (most recently played on top)
      playlists.sort(
        (a, b) => (b.lastPlayedAtMs ?? 0) - (a.lastPlayedAtMs ?? 0)
      );
    }
  }

  // Fallback cross-fill between ranges if one range is empty on Spotify (never use fake DEMO_VAULT!)
  const anyArtists =
    aShort.length > 0
      ? aShort
      : aMed.length > 0
      ? aMed
      : aLong;
  if (aShort.length === 0) aShort = anyArtists;
  if (aMed.length === 0) aMed = anyArtists;
  if (aLong.length === 0) aLong = anyArtists;

  const recentTracksDedup = Array.from(
    new Map(
      recentlyPlayed.map((r) => [r.song.spotifyTrackId, r.song])
    ).values()
  );
  const anyTracks =
    tShort.length > 0
      ? tShort
      : tMed.length > 0
      ? tMed
      : tLong.length > 0
      ? tLong
      : likedSongs.length > 0
      ? likedSongs.slice(0, 12)
      : recentTracksDedup;

  if (tShort.length === 0) tShort = anyTracks;
  if (tMed.length === 0) tMed = anyTracks;
  if (tLong.length === 0) tLong = anyTracks;

  // Attach the user's own known songs (from topTracks, likedSongs, recentlyPlayed) to each personal artist
  // so clicking Play on AUR, Murtaza Qizilbash, Bayaan, etc. immediately knows their real tracks!
  const allKnownUserSongs: SongStat[] = [];
  const seenTrackIds = new Set<string>();
  for (const s of [
    ...tShort,
    ...tMed,
    ...tLong,
    ...likedSongs,
    ...recentTracksDedup,
  ]) {
    if (s && s.spotifyTrackId && !seenTrackIds.has(s.spotifyTrackId)) {
      seenTrackIds.add(s.spotifyTrackId);
      allKnownUserSongs.push(s);
    }
  }

  const attachRealTracksToArtists = (list: ArtistStat[]): ArtistStat[] =>
    list.map((artist) => {
      if (artist.topTracks && artist.topTracks.length > 0) return artist;
      const aNameLower = artist.name.toLowerCase();
      const matching = allKnownUserSongs
        .filter(
          (s) =>
            s.artistId === artist.spotifyArtistId ||
            s.artistName.toLowerCase().includes(aNameLower)
        )
        .slice(0, 6)
        .map((s) => ({
          id: s.spotifyTrackId,
          spotifyTrackId: s.spotifyTrackId,
          title: s.title,
          dailyStreams: s.dailyStreams,
          totalStreams: s.totalStreams,
          dailyDelta: s.dailyDelta,
          releaseYear: s.releaseYear,
          duration: s.duration,
        }));
      return {
        ...artist,
        topTracks: matching,
      };
    });

  aShort = attachRealTracksToArtists(aShort);
  aMed = attachRealTracksToArtists(aMed);
  aLong = attachRealTracksToArtists(aLong);

  // If Spotify didn't return top artists yet, derive them from the user's own tracks!
  if (aShort.length === 0 && anyTracks.length > 0) {
    const seen = new Set<string>();
    const derived: ArtistStat[] = [];
    anyTracks.forEach((tr, idx) => {
      const primary = tr.artistName.split(",")[0].trim();
      if (!seen.has(primary)) {
        seen.add(primary);
        derived.push({
          ...TOP_ARTISTS[idx % TOP_ARTISTS.length],
          id: tr.artistId || `derived-artist-${idx}`,
          spotifyArtistId: tr.artistId,
          rank: derived.length + 1,
          name: primary,
          avatar: tr.coverUrl,
        });
      }
    });
    aShort = derived;
    aMed = derived;
    aLong = derived;
  }

  // Compute real Top Genres from user's actual Top Artists
  const genreCounts = new Map<string, number>();
  [...aShort, ...aMed].forEach((artist) => {
    artist.genres.forEach((g) => {
      if (g && g !== "Music") {
        genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
      }
    });
  });

  const sortedGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const totalGenreHits =
    sortedGenres.reduce((acc, [, count]) => acc + count, 0) || 1;

  const topGenres =
    sortedGenres.length > 0
      ? sortedGenres.map(([genre, count], idx) => ({
          genre,
          percentage: Math.round((count / totalGenreHits) * 100),
          color: GENRE_COLORS[idx % GENRE_COLORS.length],
        }))
      : [
          { genre: "Desi Pop & Indie", percentage: 42, color: "#1ED760" },
          { genre: "Global Pop", percentage: 31, color: "#10B981" },
          { genre: "Hip-Hop & R&B", percentage: 27, color: "#38BDF8" },
        ];

  const vault: PersonalVaultData = {
    topArtistsByRange: {
      short_term: aShort,
      medium_term: aMed,
      long_term: aLong,
    },
    topTracksByRange: {
      short_term: tShort,
      medium_term: tMed,
      long_term: tLong,
    },
    recentlyPlayed,
    likedSongs,
    likedSongsTotal,
    playlists,
    needsLibraryScope,
    minutesListened30d:
      recentlyPlayed.length * 145 +
      likedSongsTotal * 4 +
      aShort.length * 210,
    topGenres,
    audioDna: {
      danceability: 74,
      energy: 71,
      valence: 66,
      acousticness: 32,
      bpm: 118,
    },
  };

  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  localStorage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(vault));
  return { profile, vault };
}

/**
 * Fetch ALL tracks inside any user Spotify playlist when clicked, sorted by Recently Added on top
 */
export async function fetchPlaylistTracksLive(
  playlistId: string
): Promise<{ tracks: SongStat[]; totalCount: number }> {
  if (!playlistId) return { tracks: [], totalCount: 0 };
  const token = await getValidAccessToken();

  type RawPlaylistEntry = {
    track?: Record<string, unknown> | null;
    item?: Record<string, unknown> | null;
    added_at?: string;
    id?: string;
    name?: string;
  };

  const extractTrackObj = (
    entry: RawPlaylistEntry
  ): Record<string, unknown> | null => {
    if (!entry) return null;
    const candidate =
      entry.track ||
      entry.item ||
      (entry.id && entry.name
        ? (entry as unknown as Record<string, unknown>)
        : null);
    if (!candidate || !candidate.name) return null;
    return candidate;
  };

  if (token) {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch the root playlist object first: it gives us the first 100 items AND the exact paging URL (tracks.next / items.next)
      const plRes = await fetch(
        `https://api.spotify.com/v1/playlists/${encodeURIComponent(
          playlistId
        )}`,
        { headers }
      );

      let allRawItems: RawPlaylistEntry[] = [];
      let totalCount = 0;
      let pagingBaseUrl = "";
      let pageLimit = 100;

      if (plRes.ok) {
        const plData = await plRes.json();
        const pagingObj = (plData?.tracks || plData?.items) as
          | {
              items?: RawPlaylistEntry[];
              total?: number;
              limit?: number;
              next?: string | null;
              href?: string;
            }
          | undefined;

        if (pagingObj && Array.isArray(pagingObj.items)) {
          allRawItems = [...pagingObj.items];
          totalCount = Number(pagingObj.total || allRawItems.length);
          pageLimit = Number(pagingObj.limit || 100);
          const refUrl = pagingObj.next || pagingObj.href || "";
          if (refUrl) {
            pagingBaseUrl = refUrl.split("?")[0];
          }
        }
      }

      // If /v1/playlists/{id} didn't give items, try /items and /tracks directly
      if (allRawItems.length === 0) {
        for (const suffix of ["items", "tracks"]) {
          const testUrl = `https://api.spotify.com/v1/playlists/${encodeURIComponent(
            playlistId
          )}/${suffix}`;
          const res = await fetch(`${testUrl}?limit=100`, { headers });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.items) && data.items.length > 0) {
              allRawItems = [...data.items];
              totalCount = Number(data.total || allRawItems.length);
              pageLimit = Number(data.limit || 100);
              pagingBaseUrl = testUrl;
              break;
            }
          }
        }
      }

      // Fetch ALL remaining pages in parallel so every single song in the playlist (e.g. all 482 tracks) is loaded!
      if (totalCount > allRawItems.length) {
        const candidateBases = pagingBaseUrl
          ? [pagingBaseUrl]
          : [
              `https://api.spotify.com/v1/playlists/${encodeURIComponent(
                playlistId
              )}/items`,
              `https://api.spotify.com/v1/playlists/${encodeURIComponent(
                playlistId
              )}/tracks`,
            ];

        const offsets: number[] = [];
        for (
          let offset = allRawItems.length;
          offset < totalCount;
          offset += pageLimit
        ) {
          offsets.push(offset);
        }

        const fetchPage = async (offset: number): Promise<RawPlaylistEntry[]> => {
          for (const base of candidateBases) {
            try {
              const r = await fetch(
                `${base}?offset=${offset}&limit=${pageLimit}`,
                { headers }
              );
              if (r.ok) {
                const d = await r.json();
                if (Array.isArray(d.items)) {
                  return d.items;
                }
              }
            } catch {
              // try next candidate base
            }
          }
          return [];
        };

        const remainingPages = await Promise.all(offsets.map(fetchPage));
        for (const pageItems of remainingPages) {
          allRawItems.push(...pageItems);
        }
      }

      const mapped = allRawItems
        .map((it, idx) => {
          const trackObj = extractTrackObj(it);
          if (!trackObj) return null;
          const parsedTime = it.added_at ? new Date(it.added_at).getTime() : 0;
          // Use parsed timestamp; if missing, use index order (later index = newer in Spotify playlists)
          const addedMs =
            Number.isFinite(parsedTime) && parsedTime > 0
              ? parsedTime
              : idx + 1;
          return mapSpotifyTrackToSongStat(
            trackObj,
            idx,
            parsedTime > 0 ? formatRelativeAdded(parsedTime) : undefined,
            addedMs
          );
        })
        .filter((s): s is SongStat => Boolean(s));

      if (mapped.length > 0) {
        // Sort by addedAtMs descending (and break ties by higher original playlist index) so newest added songs are on top!
        const withOrigIndex = mapped.map((song, originalIndex) => ({
          song,
          originalIndex,
        }));

        withOrigIndex.sort((a, b) => {
          const diff = (b.song.addedAtMs ?? 0) - (a.song.addedAtMs ?? 0);
          if (diff !== 0) return diff;
          return b.originalIndex - a.originalIndex;
        });

        const sorted = withOrigIndex.map(({ song }, i) => ({
          ...song,
          rank: i + 1,
        }));

        return { tracks: sorted, totalCount: totalCount || sorted.length };
      }
    } catch {
      // Fall through to Layer 3
    }
  }

  // Layer 3: Server-side Spotify Embed parser fallback (/api/playlist)
  try {
    const fallbackRes = await fetch(
      `/api/playlist?id=${encodeURIComponent(playlistId)}`
    );
    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json();
      if (Array.isArray(fbData.tracks) && fbData.tracks.length > 0) {
        const mapped: SongStat[] = fbData.tracks.map(
          (
            t: {
              spotifyTrackId: string;
              title: string;
              artistName: string;
              coverUrl: string;
              duration: string;
            },
            idx: number
          ) => ({
            ...TOP_SONGS[idx % TOP_SONGS.length],
            id: `embed-pl-${playlistId}-${t.spotifyTrackId}-${idx}`,
            spotifyTrackId: t.spotifyTrackId,
            rank: idx + 1,
            title: t.title,
            artistName: t.artistName,
            album: "Playlist Track",
            coverUrl: t.coverUrl,
            duration: t.duration,
          })
        );
        return {
          tracks: mapped,
          totalCount: Number(fbData.totalCount || mapped.length),
        };
      }
    }
  } catch {
    // Ignore
  }

  return { tracks: [], totalCount: 0 };
}

export async function searchLiveSpotifyCatalog(query: string): Promise<{
  tracks: SongStat[];
  artists: ArtistStat[];
}> {
  const trimmed = query.trim();
  if (!trimmed) return { tracks: [], artists: [] };

  const token = await getValidAccessToken();
  if (!token) {
    return { tracks: [], artists: [] };
  }

  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        trimmed
      )}&type=track,artist&limit=8`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) return { tracks: [], artists: [] };

    const data = await res.json();
    const tracks: SongStat[] = Array.isArray(data.tracks?.items)
      ? data.tracks.items.map((item: Record<string, unknown>, i: number) =>
          mapSpotifyTrackToSongStat(item, i)
        )
      : [];
    const artists: ArtistStat[] = Array.isArray(data.artists?.items)
      ? data.artists.items.map((item: Record<string, unknown>, i: number) =>
          mapSpotifyArtistToArtistStat(item, i)
        )
      : [];

    return { tracks, artists };
  } catch {
    return { tracks: [], artists: [] };
  }
}

export async function fetchLiveArtistTopTracks(
  spotifyArtistId: string,
  artistName?: string
): Promise<ArtistTopTrack[] | null> {
  if (!spotifyArtistId && !artistName) return null;
  const token = await getValidAccessToken();

  // 1. Try official /v1/artists/{id}/top-tracks
  if (token && spotifyArtistId) {
    try {
      const res = await fetch(
        `https://api.spotify.com/v1/artists/${encodeURIComponent(
          spotifyArtistId
        )}/top-tracks?market=US`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tracks) && data.tracks.length > 0) {
          return data.tracks
            .slice(0, 8)
            .map((t: Record<string, unknown>, i: number) => {
              const pop =
                typeof t.popularity === "number" ? t.popularity : 80;
              const daily = Math.max(
                45_000,
                Math.round(pop * 48_000 - i * 25_000)
              );
              const album = t.album as { release_date?: string } | undefined;
              return {
                id: String(t.id),
                spotifyTrackId: String(t.id),
                title: String(t.name || "Track"),
                dailyStreams: daily,
                totalStreams: daily * 190,
                dailyDelta: Math.round((pop - 65) * 2100),
                releaseYear: album?.release_date
                  ? Number(album.release_date.slice(0, 4)) || 2024
                  : 2024,
                duration: formatDurationMs(Number(t.duration_ms || 205000)),
              };
            });
        }
      }
    } catch {
      // Fall through to Layer 2
    }
  }

  // 2. Try Server-Side Spotify Artist Embed Extractor (/api/artist?id=...)
  if (spotifyArtistId) {
    try {
      const embedRes = await fetch(
        `/api/artist?id=${encodeURIComponent(spotifyArtistId)}`
      );
      if (embedRes.ok) {
        const embedData = await embedRes.json();
        if (
          Array.isArray(embedData.tracks) &&
          embedData.tracks.length > 0
        ) {
          return embedData.tracks as ArtistTopTrack[];
        }
      }
    } catch {
      // Fall through to Layer 3
    }
  }

  // 3. Fallback: Search Spotify Catalog for tracks by this artist (/v1/search?type=track)
  if (token && artistName) {
    try {
      const q = `artist:"${artistName}"`;
      const searchRes = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          q
        )}&type=track&limit=10`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const items: Record<string, unknown>[] =
          searchData?.tracks?.items || [];
        const nameLower = artistName.toLowerCase();
        const matching = items.filter((item) => {
          const artists = item.artists as
            | { id?: string; name?: string }[]
            | undefined;
          return artists?.some(
            (a) =>
              a.id === spotifyArtistId ||
              (a.name && a.name.toLowerCase() === nameLower)
          );
        });
        const finalItems = matching.length > 0 ? matching : items;
        if (finalItems.length > 0) {
          return finalItems.slice(0, 8).map((t, i) => {
            const album = t.album as { release_date?: string } | undefined;
            const daily = Math.max(45_000, 380_000 - i * 32_000);
            return {
              id: String(t.id),
              spotifyTrackId: String(t.id),
              title: String(t.name || "Track"),
              dailyStreams: daily,
              totalStreams: daily * 180,
              dailyDelta: 3200 - i * 300,
              releaseYear: album?.release_date
                ? Number(album.release_date.slice(0, 4)) || 2024
                : 2024,
              duration: formatDurationMs(Number(t.duration_ms || 205000)),
            };
          });
        }
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

export function activateDemoSession(): {
  profile: SpotifyUserProfile;
  vault: PersonalVaultData;
} {
  if (typeof window !== "undefined") {
    localStorage.setItem(
      STORAGE_KEYS.PROFILE,
      JSON.stringify(DEMO_USER_PROFILE)
    );
    localStorage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(DEMO_VAULT));
  }
  return {
    profile: DEMO_USER_PROFILE,
    vault: DEMO_VAULT,
  };
}

export function clearSpotifySession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.VAULT);
    localStorage.removeItem("pulseify_user_vault");
  }
}
