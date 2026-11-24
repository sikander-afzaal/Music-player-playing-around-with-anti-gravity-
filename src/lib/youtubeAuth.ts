import {
  GoogleUserProfile,
  YouTubePlaylistItem,
  YouTubeTrackItem,
} from "../types/spotify";

const YT_STORAGE = {
  GOOGLE_CLIENT_ID: "pulseify_google_client_id",
  GOOGLE_REDIRECT_URI: "pulseify_google_redirect_uri",
  ACCESS_TOKEN: "pulseify_google_access_token",
  PROFILE: "pulseify_google_profile",
  LIKED_VIDEOS: "pulseify_yt_liked_videos",
  PLAYLISTS: "pulseify_yt_playlists",
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
            }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export function getSavedGoogleRedirectUri(): string {
  if (typeof window === "undefined") return "http://127.0.0.1:3000";
  return window.location.origin;
}

export function getSavedGoogleClientId(): string {
  if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  }
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(YT_STORAGE.GOOGLE_CLIENT_ID);
    if (stored) return stored;
  }
  return "";
}

export function getStoredGoogleToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(YT_STORAGE.ACCESS_TOKEN);
}

const DEFAULT_YT_PROFILE: GoogleUserProfile = {
  id: "sikander_yt",
  displayName: "Muhammad Sikandar Afzal",
  email: "sikander.aaa@gmail.com",
  avatarUrl:
    "https://avatars.githubusercontent.com/u/77196844?v=4",
};

const DEFAULT_YT_PLAYLISTS: YouTubePlaylistItem[] = [
  {
    id: "PL15B1E77BB5708555",
    title: "Coke Studio Pakistan — Season 14 & 15 Essentials",
    description: "Official Coke Studio Pakistan sessions & indie hits",
    coverUrl: "https://i.ytimg.com/vi/5Eqb_-j3FDA/hqdefault.jpg",
    itemCount: 25,
    channelTitle: "Coke Studio Pakistan",
  },
  {
    id: "RDCLAK5uy_kmPRjHDECIcuVwnKsx2Ng7fyNgFKWNJFs",
    title: "Pakistani Indie & Late Night Vibes (Bayaan, AUR, Hasan Raheem)",
    description: "Curated Pakistani indie and acoustic tracks",
    coverUrl: "https://i.ytimg.com/vi/7wtfhZwyrcc/hqdefault.jpg",
    itemCount: 30,
    channelTitle: "YouTube Music",
  },
];

export function getCachedYouTubeSession(): {
  profile: GoogleUserProfile | null;
  likedVideos: YouTubeTrackItem[];
  playlists: YouTubePlaylistItem[];
} {
  if (typeof window === "undefined") {
    return {
      profile: DEFAULT_YT_PROFILE,
      likedVideos: [],
      playlists: DEFAULT_YT_PLAYLISTS,
    };
  }
  let profile: GoogleUserProfile | null = DEFAULT_YT_PROFILE;
  let likedVideos: YouTubeTrackItem[] = [];
  let playlists: YouTubePlaylistItem[] = DEFAULT_YT_PLAYLISTS;

  try {
    const rawProf = localStorage.getItem(YT_STORAGE.PROFILE);
    if (rawProf) profile = JSON.parse(rawProf);
  } catch {
    // ignore
  }
  try {
    const rawLiked = localStorage.getItem(YT_STORAGE.LIKED_VIDEOS);
    if (rawLiked) likedVideos = JSON.parse(rawLiked);
  } catch {
    // ignore
  }
  try {
    const rawPl = localStorage.getItem(YT_STORAGE.PLAYLISTS);
    if (rawPl) {
      const parsed = JSON.parse(rawPl);
      if (Array.isArray(parsed) && parsed.length > 0) {
        playlists = parsed;
      }
    }
  } catch {
    // ignore
  }

  return { profile, likedVideos, playlists };
}

export function toggleLocalLikedYouTubeTrack(
  track: YouTubeTrackItem
): YouTubeTrackItem[] {
  const { likedVideos } = getCachedYouTubeSession();
  const exists = likedVideos.some((t) => t.videoId === track.videoId);
  const updated = exists
    ? likedVideos.filter((t) => t.videoId !== track.videoId)
    : [track, ...likedVideos];
  if (typeof window !== "undefined") {
    localStorage.setItem(YT_STORAGE.LIKED_VIDEOS, JSON.stringify(updated));
  }
  return updated;
}

export function saveImportedYouTubePlaylist(
  pl: YouTubePlaylistItem
): YouTubePlaylistItem[] {
  const { playlists } = getCachedYouTubeSession();
  const filtered = playlists.filter((p) => p.id !== pl.id);
  const updated = [pl, ...filtered];
  if (typeof window !== "undefined") {
    localStorage.setItem(YT_STORAGE.PLAYLISTS, JSON.stringify(updated));
  }
  return updated;
}

export function initiateGooglePopupLogin(
  clientIdInput: string,
  onSuccess: (data: {
    profile: GoogleUserProfile;
    likedVideos: YouTubeTrackItem[];
    playlists: YouTubePlaylistItem[];
  }) => void,
  onError: (msg: string) => void
): void {
  const clientId = clientIdInput.trim();
  if (!clientId) {
    onError("Please enter a Google OAuth 2.0 Client ID.");
    return;
  }
  localStorage.setItem(YT_STORAGE.GOOGLE_CLIENT_ID, clientId);

  const scope = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  const startGsi = () => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      onError("Google Identity Services failed to load. Try the Redirect button below.");
      return;
    }
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: async (resp) => {
        if (resp.error || !resp.access_token) {
          onError(resp.error || "Google login was cancelled.");
          return;
        }
        localStorage.setItem(YT_STORAGE.ACCESS_TOKEN, resp.access_token);
        try {
          const live = await fetchLiveYouTubeUserData(resp.access_token);
          onSuccess(live);
        } catch (err) {
          onError(
            err instanceof Error
              ? err.message
              : "Failed to fetch YouTube account data."
          );
        }
      },
    });
    tokenClient.requestAccessToken({ prompt: "consent" });
  };

  if (window.google?.accounts?.oauth2) {
    startGsi();
  } else {
    const existing = document.getElementById("google-gsi-client");
    if (existing) {
      existing.addEventListener("load", startGsi, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "google-gsi-client";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = startGsi;
    script.onerror = () =>
      onError("Could not load Google Sign-In script.");
    document.body.appendChild(script);
  }
}

export function initiateGoogleOAuthLogin(
  clientIdInput: string,
  customRedirectUri?: string
): void {
  const clientId = clientIdInput.trim();
  if (!clientId) {
    throw new Error("Please enter a Google OAuth 2.0 Client ID.");
  }

  const redirectUri = (customRedirectUri || window.location.origin).trim();
  localStorage.setItem(YT_STORAGE.GOOGLE_CLIENT_ID, clientId);
  localStorage.setItem(YT_STORAGE.GOOGLE_REDIRECT_URI, redirectUri);

  const scope = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "token");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", "pulseify_google_oauth");

  window.location.href = authUrl.toString();
}

function parseIsoDuration(iso?: string): string {
  if (!iso) return "3:30";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "3:30";
  const h = Number(match[1] || 0);
  const m = Number(match[2] || 0);
  const s = Number(match[3] || 0);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function handleGoogleOAuthCallback(): Promise<{
  profile: GoogleUserProfile;
  likedVideos: YouTubeTrackItem[];
  playlists: YouTubePlaylistItem[];
} | null> {
  if (typeof window === "undefined") return null;

  // Check URL hash for #access_token=...&state=pulseify_google_oauth
  const hash = window.location.hash;
  if (hash && hash.includes("access_token=")) {
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    if (accessToken) {
      localStorage.setItem(YT_STORAGE.ACCESS_TOKEN, accessToken);
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search
      );
      return fetchLiveYouTubeUserData(accessToken);
    }
  }

  return null;
}

export async function fetchLiveYouTubeUserData(accessToken: string): Promise<{
  profile: GoogleUserProfile;
  likedVideos: YouTubeTrackItem[];
  playlists: YouTubePlaylistItem[];
}> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const [userRes, plRes, likedRes] = await Promise.all([
    fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers }),
    fetch(
      "https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50",
      { headers }
    ),
    fetch(
      "https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&myRating=like&maxResults=50",
      { headers }
    ),
  ]);

  if (!userRes.ok) {
    throw new Error("Google OAuth session expired.");
  }

  const userJson = await userRes.json();
  const profile: GoogleUserProfile = {
    id: String(userJson.id || "google_user"),
    displayName: String(userJson.name || "YouTube Listener"),
    email: String(userJson.email || "connected@gmail.com"),
    avatarUrl:
      String(userJson.picture || "") ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  };

  let playlists: YouTubePlaylistItem[] = [];
  if (plRes.ok) {
    const plJson = await plRes.json();
    if (Array.isArray(plJson.items)) {
      playlists = plJson.items.map((item: Record<string, any>) => ({
        id: String(item.id),
        title: String(item.snippet?.title || "YouTube Playlist"),
        description: String(item.snippet?.description || ""),
        coverUrl:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
        itemCount: Number(item.contentDetails?.itemCount ?? 0),
        channelTitle: String(
          item.snippet?.channelTitle || profile.displayName
        ),
      }));
    }
  }

  let likedVideos: YouTubeTrackItem[] = [];
  if (likedRes.ok) {
    const likedJson = await likedRes.json();
    if (Array.isArray(likedJson.items)) {
      likedVideos = likedJson.items.map((v: Record<string, any>) => ({
        videoId: String(v.id),
        title: String(v.snippet?.title || "YouTube Track"),
        artistName: String(v.snippet?.channelTitle || "YouTube Artist").replace(
          /\s*-\s*Topic$/i,
          ""
        ),
        coverUrl:
          v.snippet?.thumbnails?.high?.url ||
          `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
        duration: parseIsoDuration(v.contentDetails?.duration),
        viewsText: v.statistics?.viewCount
          ? `${Number(v.statistics.viewCount).toLocaleString()} views`
          : "Liked Video",
      }));
    }
  }

  localStorage.setItem(YT_STORAGE.PROFILE, JSON.stringify(profile));
  if (likedVideos.length > 0) {
    localStorage.setItem(YT_STORAGE.LIKED_VIDEOS, JSON.stringify(likedVideos));
  }
  if (playlists.length > 0) {
    localStorage.setItem(YT_STORAGE.PLAYLISTS, JSON.stringify(playlists));
  }

  return { profile, likedVideos, playlists };
}

export async function fetchYouTubePlaylistTracks(
  playlistId: string
): Promise<{ tracks: YouTubeTrackItem[]; playlistTitle: string }> {
  const token = getStoredGoogleToken();
  if (token) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(
          playlistId
        )}&maxResults=50`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          const tracks: YouTubeTrackItem[] = data.items
            .map((it: Record<string, any>) => {
              const vid =
                it.contentDetails?.videoId ||
                it.snippet?.resourceId?.videoId;
              if (!vid || it.snippet?.title === "Private video") return null;
              return {
                videoId: String(vid),
                title: String(it.snippet?.title || "Track"),
                artistName: String(
                  it.snippet?.videoOwnerChannelTitle ||
                    it.snippet?.channelTitle ||
                    "YouTube Music"
                ).replace(/\s*-\s*Topic$/i, ""),
                coverUrl:
                  it.snippet?.thumbnails?.high?.url ||
                  `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                duration: "3:45",
                viewsText: "Playlist Track",
              };
            })
            .filter(
              (t: YouTubeTrackItem | null): t is YouTubeTrackItem => Boolean(t)
            );
          if (tracks.length > 0) {
            return { tracks, playlistTitle: "YouTube Playlist" };
          }
        }
      }
    } catch {
      // Fall through to public playlist scraper
    }
  }

  // Public playlist extractor fallback (/api/youtube/search?playlistId=...)
  const res = await fetch(
    `/api/youtube/search?playlistId=${encodeURIComponent(playlistId)}`
  );
  if (!res.ok) return { tracks: [], playlistTitle: "Playlist" };
  return res.json();
}

export function disconnectGoogleSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(YT_STORAGE.ACCESS_TOKEN);
    localStorage.removeItem(YT_STORAGE.PROFILE);
  }
}
