"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Play,
  Heart,
  ListMusic,
  Flame,
  Sparkles,
  Loader2,
  ExternalLink,
  KeyRound,
  LogOut,
  Plus,
  ArrowLeft,
  Tv,
  CheckCircle2,
} from "lucide-react";
import {
  GoogleUserProfile,
  YouTubePlaylistItem,
  YouTubeTrackItem,
} from "../types/spotify";
import {
  disconnectGoogleSession,
  fetchYouTubePlaylistTracks,
  getCachedYouTubeSession,
  getSavedGoogleClientId,
  handleGoogleOAuthCallback,
  initiateGoogleOAuthLogin,
  initiateGooglePopupLogin,
  saveImportedYouTubePlaylist,
  toggleLocalLikedYouTubeTrack,
} from "../lib/youtubeAuth";

interface YouTubeViewProps {
  onPlayYouTubeTrack: (
    track: YouTubeTrackItem,
    queue?: YouTubeTrackItem[]
  ) => void;
  activeVideoId?: string;
}

const CATEGORIES = [
  { id: "pakistani", label: "🇵🇰 Pakistani Indie & Coke Studio", query: "Pakistani Indie Coke Studio AUR Bayaan Hasan Raheem" },
  { id: "trending", label: "🔥 Global Trending Music", query: "Top Global Music Hits 2025 Official Audio" },
  { id: "bollywood", label: "✨ Desi & Indie Vibes", query: "Anuv Jain Arijit Singh Atif Aslam Chill Hindi Songs" },
  { id: "chill", label: "🎧 Late Night Chill", query: "Late Night Chill R&B Indie Songs" },
  { id: "live", label: "🎸 Unplugged & Live", query: "Coke Studio Live Unplugged Acoustic Session" },
  { id: "liked", label: "❤️ Liked YT Songs", query: "__LIKED__" },
  { id: "playlists", label: "💿 YT Playlists", query: "__PLAYLISTS__" },
];

export default function YouTubeView({
  onPlayYouTubeTrack,
  activeVideoId,
}: YouTubeViewProps) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [searchInput, setSearchInput] = useState("");
  const [tracks, setTracks] = useState<YouTubeTrackItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Google Auth + Local Saved Library
  const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(null);
  const [likedVideos, setLikedVideos] = useState<YouTubeTrackItem[]>([]);
  const [playlists, setPlaylists] = useState<YouTubePlaylistItem[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleOneClickGoogleLogin = () => {
    setAuthError(null);
    const clientId = getSavedGoogleClientId();
    if (!clientId) {
      const cached = getCachedYouTubeSession();
      setGoogleUser(cached.profile);
      setPlaylists(cached.playlists);
      return;
    }
    try {
      initiateGooglePopupLogin(
        clientId,
        (live) => {
          setGoogleUser(live.profile);
          setLikedVideos(live.likedVideos);
          setPlaylists(live.playlists);
        },
        () => {
          // Fallback to redirect flow if popup library isn't ready
          initiateGoogleOAuthLogin(clientId);
        }
      );
    } catch {
      const cached = getCachedYouTubeSession();
      setGoogleUser(cached.profile);
    }
  };

  // Playlist URL Importer & Selected Playlist drill-down
  const [importUrl, setImportUrl] = useState("");
  const [importingPl, setImportingPl] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<YouTubePlaylistItem | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<YouTubeTrackItem[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);

  // Load cached Google session + handle #access_token callback on mount
  useEffect(() => {
    const syncFromStorage = () => {
      const cached = getCachedYouTubeSession();
      setGoogleUser(cached.profile);
      setLikedVideos(cached.likedVideos);
      setPlaylists(cached.playlists);
    };
    syncFromStorage();

    window.addEventListener("pulseify-storage-synced", syncFromStorage);

    handleGoogleOAuthCallback()
      .then((res) => {
        if (res) {
          setGoogleUser(res.profile);
          setLikedVideos(res.likedVideos);
          setPlaylists(res.playlists);
        }
      })
      .catch(() => {
        // Ignore expired hash
      });

    return () =>
      window.removeEventListener("pulseify-storage-synced", syncFromStorage);
  }, []);

  // Run search when category changes
  useEffect(() => {
    const cat = CATEGORIES.find((c) => c.id === activeCategory);
    if (!cat || cat.query === "__LIKED__" || cat.query === "__PLAYLISTS__") {
      return;
    }
    runYouTubeSearch(cat.query);
  }, [activeCategory]);

  const runYouTubeSearch = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(trimmed)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tracks)) {
          setTracks(data.tracks);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSelectedPlaylist(null);
    if (activeCategory === "liked" || activeCategory === "playlists") {
      setActiveCategory("trending");
    }
    runYouTubeSearch(searchInput);
  };

  const handleToggleLike = (track: YouTubeTrackItem) => {
    const updated = toggleLocalLikedYouTubeTrack(track);
    setLikedVideos(updated);
  };

  const handleImportPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = importUrl.trim();
    if (!raw) return;

    // Extract list=PL... or raw playlist ID
    const match = raw.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    const plId = match ? match[1] : raw;
    setImportingPl(true);
    try {
      const { tracks: fetchedTracks, playlistTitle } =
        await fetchYouTubePlaylistTracks(plId);
      if (fetchedTracks.length > 0) {
        const newPl: YouTubePlaylistItem = {
          id: plId,
          title: playlistTitle || `Imported Playlist (${plId.slice(0, 6)})`,
          description: "Imported YouTube Music Playlist",
          coverUrl: fetchedTracks[0].coverUrl,
          itemCount: fetchedTracks.length,
          channelTitle: googleUser?.displayName || "YouTube Music",
        };
        const updated = saveImportedYouTubePlaylist(newPl);
        setPlaylists(updated);
        setImportUrl("");
        setSelectedPlaylist(newPl);
        setPlaylistTracks(fetchedTracks);
      }
    } finally {
      setImportingPl(false);
    }
  };

  const handleOpenPlaylist = async (pl: YouTubePlaylistItem) => {
    setSelectedPlaylist(pl);
    setLoadingPlaylist(true);
    const { tracks: fetched } = await fetchYouTubePlaylistTracks(pl.id);
    setPlaylistTracks(fetched);
    setLoadingPlaylist(false);
  };

  const displayedTracks =
    activeCategory === "liked" ? likedVideos : tracks;

  return (
    <div className="space-y-6">
      {/* YouTube Music Backend Hero & Google Login Bar */}
      <div className="relative overflow-hidden rounded-3xl border border-rose-500/25 bg-gradient-to-br from-rose-600/15 via-[#10131C] to-[#0B0D14] p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25">
              <Tv className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-400">
                  YOUTUBE MUSIC &amp; VIDEO ENGINE
                </span>
                <span className="rounded-full bg-[#1ED760]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#1ED760]">
                  FULL-LENGTH PLAYBACK + SYNCED LYRICS
                </span>
              </div>
              <h2 className="mt-1 text-2xl font-black text-white">
                Stream Any YouTube Video as a Song
              </h2>
              <p className="text-xs text-slate-300">
                Search any song, live session, remix, or Coke Studio track — plays
                full-length audio &amp; video in the bottom dock and fullscreen
                lyrics studio.
              </p>
            </div>
          </div>

          {/* Google Account Pill */}
          <div className="flex items-center gap-2.5">
            {googleUser ? (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2">
                <img
                  src={googleUser.avatarUrl}
                  alt={googleUser.displayName}
                  className="h-7 w-7 rounded-full object-cover border border-rose-400"
                />
                <div className="text-xs">
                  <div className="font-bold text-white">
                    {googleUser.displayName}
                  </div>
                  <div className="text-[10px] text-rose-300">
                    Google / YouTube Connected
                  </div>
                </div>
                <button
                  onClick={() => {
                    disconnectGoogleSession();
                    setGoogleUser(null);
                  }}
                  className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                  title="Disconnect Google Account"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleOneClickGoogleLogin}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-extrabold text-black shadow-lg hover:bg-slate-200 transition cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-rose-600" />
                <span>Login with Google / YouTube</span>
              </button>
            )}
          </div>
        </div>
        {authError && (
          <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {authError}
          </p>
        )}

        {/* Search Input + Category Pills */}
        <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2.5">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search any song, artist, live performance, or remix on YouTube..."
                className="w-full rounded-2xl border border-white/10 bg-[#07080C] py-3 pl-11 pr-4 text-xs text-white placeholder-slate-400 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-2xl bg-rose-500 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-400 transition cursor-pointer"
            >
              Search YouTube
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSelectedPlaylist(null);
                  }}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                    active
                      ? "bg-rose-500 text-white shadow-md shadow-rose-500/25"
                      : "bg-black/40 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {cat.label}
                  {cat.id === "liked" && likedVideos.length > 0
                    ? ` (${likedVideos.length})`
                    : ""}
                  {cat.id === "playlists" && playlists.length > 0
                    ? ` (${playlists.length})`
                    : ""}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* PLAYLISTS VIEW */}
      {activeCategory === "playlists" ? (
        <div className="rounded-3xl border border-white/[0.08] bg-[#10131C]/90 p-6 space-y-5">
          {selectedPlaylist ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Playlists
                </button>
                <img
                  src={selectedPlaylist.coverUrl}
                  alt={selectedPlaylist.title}
                  className="h-14 w-14 rounded-2xl object-cover"
                />
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    {selectedPlaylist.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {playlistTracks.length || selectedPlaylist.itemCount} songs •{" "}
                    {selectedPlaylist.channelTitle}
                  </p>
                </div>
              </div>

              {loadingPlaylist ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="h-7 w-7 animate-spin text-rose-500" />
                  <span className="text-xs">Loading YouTube playlist tracks...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {playlistTracks.map((track, idx) => {
                    const isPlaying = track.videoId === activeVideoId;
                    return (
                      <div
                        key={`${track.videoId}-${idx}`}
                        onClick={() =>
                          onPlayYouTubeTrack(track, playlistTracks)
                        }
                        className={`group flex items-center justify-between rounded-2xl border p-3 transition cursor-pointer ${
                          isPlaying
                            ? "border-rose-500/50 bg-rose-500/10"
                            : "border-white/[0.05] bg-[#0A0C12] hover:border-rose-500/40 hover:bg-[#141926]"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="w-6 font-mono-tabular text-xs font-bold text-slate-500">
                            {idx + 1}
                          </span>
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="h-12 w-12 rounded-xl object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-white group-hover:text-rose-400 truncate">
                              {track.title}
                            </div>
                            <div className="text-xs text-slate-400 truncate">
                              {track.artistName} • {track.duration}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayYouTubeTrack(track, playlistTracks);
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white hover:scale-105 transition cursor-pointer"
                        >
                          <Play className="h-4 w-4 fill-current ml-0.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Import Any YouTube Playlist by URL or ID */}
              <form
                onSubmit={handleImportPlaylist}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#07080C] p-3.5"
              >
                <ListMusic className="h-5 w-5 text-rose-400 shrink-0 ml-1" />
                <input
                  type="text"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="Paste any YouTube Playlist URL (e.g. https://www.youtube.com/playlist?list=PL...) to import it as a playable album..."
                  className="flex-1 min-w-[240px] bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={importingPl}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-extrabold text-white hover:bg-rose-400 transition cursor-pointer disabled:opacity-50"
                >
                  {importingPl ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  <span>Import Playlist</span>
                </button>
              </form>

              {playlists.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-sm text-slate-400">
                    Connect your Google Account or paste any YouTube Playlist URL
                    above to import your playlists.
                  </p>
                  <button
                    onClick={handleOneClickGoogleLogin}
                    className="rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-black cursor-pointer"
                  >
                    Connect Google Account
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {playlists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => handleOpenPlaylist(pl)}
                      className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0A0C12] p-4 hover:border-rose-500/40 hover:bg-[#131824] transition cursor-pointer"
                    >
                      <div>
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 mb-3">
                          <img
                            src={pl.coverUrl}
                            alt={pl.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg">
                            <Play className="h-4 w-4 fill-current ml-0.5" />
                          </div>
                        </div>
                        <h4 className="font-bold text-sm text-white group-hover:text-rose-400 truncate">
                          {pl.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {pl.itemCount} songs • {pl.channelTitle}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* SONGS / VIDEOS GRID (Convert every YouTube Video into a Spotify-Style Song Row!) */
        <div className="rounded-3xl border border-white/[0.08] bg-[#10131C]/90 p-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
            <div>
              <h3 className="flex items-center gap-2 text-base font-extrabold text-white">
                <Flame className="h-4 w-4 text-rose-500" />
                {activeCategory === "liked"
                  ? `Your Liked YouTube Songs (${likedVideos.length})`
                  : searchInput
                  ? `YouTube Results for "${searchInput}"`
                  : CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </h3>
              <p className="text-xs text-slate-400">
                Click any row to stream full-length audio + video in the bottom
                dock &amp; fullscreen lyrics studio
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
              <span className="text-xs">
                Fetching tracks from YouTube Music Engine...
              </span>
            </div>
          ) : displayedTracks.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              {activeCategory === "liked"
                ? "Click the heart icon on any YouTube track or connect your Google account to see your Liked YouTube songs."
                : "No matching YouTube tracks found. Try another search query."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {displayedTracks.map((track, idx) => {
                const isPlaying = track.videoId === activeVideoId;
                const isLiked = likedVideos.some(
                  (t) => t.videoId === track.videoId
                );

                return (
                  <div
                    key={`${track.videoId}-${idx}`}
                    onClick={() => onPlayYouTubeTrack(track, displayedTracks)}
                    className={`group flex items-center justify-between rounded-2xl border p-3 transition cursor-pointer ${
                      isPlaying
                        ? "border-[#1ED760]/60 bg-[#1ED760]/10"
                        : "border-white/[0.05] bg-[#0A0C12] hover:border-rose-500/40 hover:bg-[#141926]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-6 font-mono-tabular text-xs font-bold text-slate-500">
                        {idx + 1}
                      </span>
                      <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-xl border border-white/10">
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.2 font-mono-tabular text-[9px] font-bold text-white">
                          {track.duration}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white group-hover:text-[#1ED760] truncate">
                          {track.title}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {track.artistName} • {track.viewsText}
                          {track.publishedText
                            ? ` • ${track.publishedText}`
                            : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLike(track);
                        }}
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition cursor-pointer ${
                          isLiked
                            ? "text-rose-500 bg-rose-500/15"
                            : "text-slate-500 hover:bg-white/10 hover:text-white"
                        }`}
                        title="Save to Liked YouTube Songs"
                      >
                        <Heart
                          className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`}
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayYouTubeTrack(track, displayedTracks);
                        }}
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition cursor-pointer ${
                          isPlaying
                            ? "bg-[#1ED760] text-black"
                            : "bg-white/10 text-white group-hover:bg-[#1ED760] group-hover:text-black"
                        }`}
                        title={`Play ${track.title}`}
                      >
                        <Play className="h-4 w-4 fill-current ml-0.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
