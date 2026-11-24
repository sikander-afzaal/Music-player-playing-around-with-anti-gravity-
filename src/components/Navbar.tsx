"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BarChart3,
  Music2,
  Globe2,
  Scale,
  UserCheck,
  Search,
  LogIn,
  Disc3,
  Play,
  X,
  Loader2,
  Tv,
  Radio,
  Download,
  Lock,
} from "lucide-react";
import {
  ArtistStat,
  DashboardTab,
  SongStat,
  SpotifyUserProfile,
  YouTubeTrackItem,
} from "../types/spotify";
import { TOP_ARTISTS, TOP_SONGS } from "../data/spotifyData";
import { searchLiveSpotifyCatalog } from "../lib/spotifyAuth";
import { formatCompact } from "../lib/filterEngine";

interface NavbarProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  user: SpotifyUserProfile | null;
  onOpenLogin: () => void;
  compareCount: number;
  onSelectArtist: (artist: ArtistStat) => void;
  onPlayArtist: (artist: ArtistStat) => void;
  onSelectSong: (song: SongStat) => void;
  onPlaySong: (song: SongStat) => void;
  onPlayYouTubeTrack?: (
    track: YouTubeTrackItem,
    queue?: YouTubeTrackItem[]
  ) => void;
  authenticatedEmail?: string | null;
  onLockApp?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Navbar({
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  user,
  onOpenLogin,
  onSelectArtist,
  onPlayArtist,
  onPlaySong,
  onPlayYouTubeTrack,
  authenticatedEmail,
  onLockApp,
}: NavbarProps) {
  const isYouTubeMode = activeTab === "youtube";
  const [lastSpotifyTab, setLastSpotifyTab] = useState<DashboardTab>("artists");
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone
    ) {
      setIsStandalone(true);
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallPwa = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
        setIsStandalone(true);
      }
      return;
    }
    window.alert(
      "To install Pulseify as a standalone App:\n\n• Desktop (Chrome / Edge / Brave): Click the 'Install Pulseify' icon on the right side of your browser address bar.\n• iPhone / Android: Tap Share → 'Add to Home Screen'."
    );
  };

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [liveResults, setLiveResults] = useState<{
    tracks: SongStat[];
    artists: ArtistStat[];
  }>({ tracks: [], artists: [] });
  const [ytSearchResults, setYtSearchResults] = useState<YouTubeTrackItem[]>(
    []
  );
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab !== "youtube") {
      setLastSpotifyTab(activeTab);
    }
  }, [activeTab]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced live search (queries YouTube when in YouTube mode, or Spotify when in Spotify mode)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setLiveResults({ tracks: [], artists: [] });
      setYtSearchResults([]);
      setIsSearchingLive(false);
      return;
    }

    setIsSearchingLive(true);
    const timer = window.setTimeout(async () => {
      if (isYouTubeMode) {
        try {
          const r = await fetch(
            `/api/youtube/search?q=${encodeURIComponent(q)}`
          );
          if (r.ok) {
            const d = await r.json();
            setYtSearchResults(Array.isArray(d.tracks) ? d.tracks.slice(0, 8) : []);
          }
        } catch {
          setYtSearchResults([]);
        } finally {
          setIsSearchingLive(false);
        }
      } else {
        const res = await searchLiveSpotifyCatalog(q);
        setLiveResults(res);
        setIsSearchingLive(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [searchQuery, isYouTubeMode]);

  const qLower = searchQuery.trim().toLowerCase();
  const localArtists = qLower
    ? TOP_ARTISTS.filter(
        (a) =>
          a.name.toLowerCase().includes(qLower) ||
          a.primaryGenre.toLowerCase().includes(qLower)
      ).slice(0, 4)
    : [];
  const localSongs = qLower
    ? TOP_SONGS.filter(
        (s) =>
          s.title.toLowerCase().includes(qLower) ||
          s.artistName.toLowerCase().includes(qLower)
      ).slice(0, 4)
    : [];

  const mergedArtists = [
    ...localArtists,
    ...liveResults.artists.filter(
      (la) =>
        !localArtists.some(
          (loc) => loc.name.toLowerCase() === la.name.toLowerCase()
        )
    ),
  ].slice(0, 5);

  const mergedSongs = [
    ...localSongs,
    ...liveResults.tracks.filter(
      (lt) =>
        !localSongs.some((loc) => loc.spotifyTrackId === lt.spotifyTrackId)
    ),
  ].slice(0, 6);

  const spotifyTabs: {
    id: DashboardTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "artists",
      label: "Artists",
      icon: <BarChart3 className="h-3.5 w-3.5" />,
    },
    {
      id: "songs",
      label: "Songs",
      icon: <Music2 className="h-3.5 w-3.5" />,
    },
    {
      id: "countries",
      label: "Countries",
      icon: <Globe2 className="h-3.5 w-3.5" />,
    },
    {
      id: "compare",
      label: "Compare",
      icon: <Scale className="h-3.5 w-3.5" />,
    },
    {
      id: "vault",
      label: "My Vault",
      icon: <UserCheck className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur-2xl transition-colors duration-500 ${
        isYouTubeMode
          ? "border-rose-500/20 bg-[#0A0609]/90 shadow-[0_8px_32px_rgba(244,63,94,0.08)]"
          : "border-white/[0.07] bg-[#07080C]/90"
      }`}
    >
      {/* Subtle Top Neon Hairline that morphs between Spotify Emerald & YouTube Crimson */}
      <div
        className={`h-[2px] w-full transition-all duration-500 ${
          isYouTubeMode
            ? "bg-gradient-to-r from-transparent via-rose-500 to-transparent"
            : "bg-gradient-to-r from-transparent via-[#1ED760] to-transparent"
        }`}
      />

      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* LEFT: Brand + Tactile Universe Switcher (Spotify ⇄ YouTube) */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div
            onClick={() =>
              onSelectTab(isYouTubeMode ? "youtube" : "artists")
            }
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-black shadow-lg transition-all duration-500 ${
                isYouTubeMode
                  ? "bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-rose-500/30"
                  : "bg-[#1ED760] text-black shadow-[#1ED760]/25"
              }`}
            >
              <Disc3
                className="h-5 w-5 animate-spin"
                style={{ animationDuration: "12s" }}
              />
            </div>
            <span className="text-base font-black tracking-tight text-white hidden sm:inline">
              PULSE
              <span
                className={`transition-colors duration-500 ${
                  isYouTubeMode ? "text-rose-500" : "text-[#1ED760]"
                }`}
              >
                IFY
              </span>
            </span>
          </div>

          {/* Fancy Animated Universe Switcher Pill */}
          <div className="relative flex items-center rounded-full border border-white/10 bg-[#11141F] p-1 shadow-inner">
            <button
              onClick={() => onSelectTab(lastSpotifyTab || "artists")}
              className={`relative z-10 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all duration-300 cursor-pointer ${
                !isYouTubeMode
                  ? "bg-[#1ED760] text-black shadow-[0_0_20px_rgba(30,215,96,0.4)] scale-[1.02]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Spotify</span>
            </button>
            <button
              onClick={() => onSelectTab("youtube")}
              className={`relative z-10 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all duration-300 cursor-pointer ${
                isYouTubeMode
                  ? "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-[0_0_22px_rgba(244,63,94,0.5)] scale-[1.02]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Tv className="h-3.5 w-3.5" />
              <span>YouTube</span>
            </button>
          </div>
        </div>

        {/* CENTER: Context-Aware Sub-Navigation (Clean Single-Row Pills) */}
        {!isYouTubeMode ? (
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-full border border-white/[0.07] bg-[#10131C]/90 p-1">
            {spotifyTabs.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-white/15 text-[#1ED760] shadow-sm"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-rose-500/25 bg-rose-500/10 px-4 py-1.5 text-xs font-bold text-rose-300">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span>YouTube Full-Length Audio &amp; Widescreen Cinema</span>
          </div>
        )}

        {/* RIGHT: Compact Universal Search + User Profile Pill */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div ref={searchBoxRef} className="relative w-48 sm:w-64">
            <Search
              className={`pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
                isYouTubeMode ? "text-rose-400" : "text-slate-400"
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setIsDropdownOpen(true);
              }}
              placeholder={
                isYouTubeMode
                  ? "Search YouTube songs..."
                  : "Search Spotify..."
              }
              className={`w-full rounded-full border bg-[#10131C] py-2 pl-9 pr-7 text-xs text-white placeholder-slate-400 focus:outline-none transition ${
                isYouTubeMode
                  ? "border-rose-500/25 focus:border-rose-500"
                  : "border-white/10 focus:border-[#1ED760]"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchChange("");
                  setIsDropdownOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}

            {/* Instant Search Results Popover */}
            {isDropdownOpen && searchQuery.trim().length > 0 && (
              <div className="absolute right-0 mt-2 w-[340px] sm:w-[400px] max-h-[75vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#10131C]/98 p-3 shadow-2xl backdrop-blur-2xl z-50 space-y-3">
                <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
                  <span>
                    {isYouTubeMode
                      ? "YouTube Music & Video Results"
                      : user && !user.isDemo
                      ? "Spotify Charts + Live Catalog"
                      : "Spotify Charts"}
                  </span>
                  {isSearchingLive && (
                    <Loader2
                      className={`h-3.5 w-3.5 animate-spin ${
                        isYouTubeMode ? "text-rose-500" : "text-[#1ED760]"
                      }`}
                    />
                  )}
                </div>

                {isYouTubeMode ? (
                  ytSearchResults.length > 0 ? (
                    <div className="space-y-1">
                      {ytSearchResults.map((yt) => (
                        <div
                          key={yt.videoId}
                          onClick={() => {
                            onPlayYouTubeTrack?.(yt, ytSearchResults);
                            setIsDropdownOpen(false);
                          }}
                          className="group flex items-center justify-between rounded-xl p-2 hover:bg-white/10 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={yt.coverUrl}
                              alt={yt.title}
                              className="h-10 w-10 rounded-lg object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white group-hover:text-rose-400 truncate">
                                {yt.title}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {yt.artistName} • {yt.duration}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayYouTubeTrack?.(yt, ytSearchResults);
                              setIsDropdownOpen(false);
                            }}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-md hover:scale-105 transition cursor-pointer"
                          >
                            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !isSearchingLive && (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No YouTube tracks found for &ldquo;{searchQuery}&rdquo;.
                      </div>
                    )
                  )
                ) : (
                  <>
                    {/* Matching Spotify Songs */}
                    {mergedSongs.length > 0 && (
                      <div>
                        <div className="px-2 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#1ED760]">
                          Songs
                        </div>
                        <div className="space-y-1">
                          {mergedSongs.map((song) => (
                            <div
                              key={song.id}
                              onClick={() => {
                                onPlaySong(song);
                                setIsDropdownOpen(false);
                              }}
                              className="group flex items-center justify-between rounded-xl p-2 hover:bg-white/10 transition cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={song.coverUrl}
                                  alt={song.title}
                                  className="h-10 w-10 rounded-lg object-cover shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white group-hover:text-[#1ED760] truncate">
                                    {song.title}
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate">
                                    {song.artistName} • {song.duration}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPlaySong(song);
                                  setIsDropdownOpen(false);
                                }}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1ED760] text-black shadow-md hover:scale-105 transition cursor-pointer"
                              >
                                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Spotify Artists */}
                    {mergedArtists.length > 0 && (
                      <div>
                        <div className="px-2 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
                          Artists
                        </div>
                        <div className="space-y-1">
                          {mergedArtists.map((artist) => (
                            <div
                              key={artist.id}
                              onClick={() => {
                                onSelectArtist(artist);
                                setIsDropdownOpen(false);
                              }}
                              className="group flex items-center justify-between rounded-xl p-2 hover:bg-white/10 transition cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={artist.avatar}
                                  alt={artist.name}
                                  className="h-10 w-10 rounded-full object-cover shrink-0 border border-white/15"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white group-hover:text-[#1ED760] truncate">
                                    {artist.name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate">
                                    {artist.monthlyListeners > 0
                                      ? `${formatCompact(
                                          artist.monthlyListeners
                                        )} listeners`
                                      : artist.primaryGenre}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPlayArtist(artist);
                                  setIsDropdownOpen(false);
                                }}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#1ED760] hover:bg-[#1ED760] hover:text-black transition cursor-pointer"
                              >
                                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {mergedSongs.length === 0 &&
                      mergedArtists.length === 0 &&
                      !isSearchingLive && (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No matches for &ldquo;{searchQuery}&rdquo;.
                        </div>
                      )}
                  </>
                )}
              </div>
            )}
          </div>

          {!isStandalone && (
            <button
              onClick={handleInstallPwa}
              title="Install Pulseify as a Desktop or Mobile App"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-[#1ED760]/40 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-[#1ED760]" />
              <span>Install App</span>
            </button>
          )}

          <button
            onClick={onOpenLogin}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              user
                ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                : "border-[#1ED760] bg-[#1ED760] text-black shadow-lg shadow-[#1ED760]/20 hover:bg-[#22e668]"
            }`}
          >
            {user ? (
              <>
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="h-5 w-5 rounded-full object-cover border border-[#1ED760]"
                />
                <span className="max-w-[95px] truncate hidden md:inline">
                  {user.displayName}
                </span>
                <span className="h-2 w-2 rounded-full bg-[#1ED760]" />
              </>
            ) : (
              <>
                <LogIn className="h-3.5 w-3.5" />
                <span>Connect</span>
              </>
            )}
          </button>

          {authenticatedEmail && onLockApp && (
            <button
              onClick={onLockApp}
              title={`Keycloak 2FA Active (${authenticatedEmail}) — Click to Lock App`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/5 text-slate-400 hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-300 transition cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
