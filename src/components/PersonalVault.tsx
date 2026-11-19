"use client";

import React, { useState } from "react";
import {
  UserCheck,
  Play,
  Clock,
  Sparkles,
  Disc3,
  Headphones,
  LogIn,
  Heart,
  ListMusic,
  RefreshCw,
  ArrowLeft,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  ArtistStat,
  PersonalVaultData,
  SongStat,
  SpotifyPlaylistItem,
  SpotifyUserProfile,
} from "../types/spotify";
import { formatCompact } from "../lib/filterEngine";
import {
  fetchPlaylistTracksLive,
  initiateSpotifyPkceLogin,
  markPlaylistAsPlayed,
} from "../lib/spotifyAuth";

interface PersonalVaultProps {
  user: SpotifyUserProfile | null;
  vault: PersonalVaultData;
  onOpenLogin: () => void;
  onActivateDemo: () => void;
  onRefreshLiveVault: () => Promise<void>;
  onSelectArtist: (artist: ArtistStat) => void;
  onPlayArtist: (artist: ArtistStat) => void;
  onSelectSong: (song: SongStat) => void;
  onPlaySong: (song: SongStat) => void;
}

type VaultSection = "top" | "liked" | "playlists" | "recent";

export default function PersonalVault({
  user,
  vault,
  onOpenLogin,
  onActivateDemo,
  onRefreshLiveVault,
  onSelectArtist,
  onPlayArtist,
  onSelectSong,
  onPlaySong,
}: PersonalVaultProps) {
  const [section, setSection] = useState<VaultSection>("top");
  const [timeRange, setTimeRange] = useState<
    "short_term" | "medium_term" | "long_term"
  >("short_term");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected Playlist drill-down state
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<SpotifyPlaylistItem | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<SongStat[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);

  const topArtists = vault.topArtistsByRange[timeRange] || [];
  const topTracks = vault.topTracksByRange[timeRange] || [];
  const likedSongs = vault.likedSongs || [];
  const playlists = vault.playlists || [];

  const handleSyncClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshLiveVault();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenPlaylist = async (pl: SpotifyPlaylistItem) => {
    setSelectedPlaylist(pl);
    setLoadingPlaylist(true);
    markPlaylistAsPlayed(pl.id);
    const { tracks, totalCount } = await fetchPlaylistTracksLive(pl.id);
    setPlaylistTracks(tracks);
    if (totalCount > 0 && pl.trackCount === 0) {
      setSelectedPlaylist({ ...pl, trackCount: totalCount });
    }
    setLoadingPlaylist(false);
  };

  return (
    <div className="space-y-6">
      {/* Personal Profile Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1ED760]/15 via-[#10131C] to-[#0B0D14] p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="h-16 w-16 rounded-2xl object-cover border-2 border-[#1ED760] shadow-lg shadow-[#1ED760]/20"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1ED760]/20 border border-[#1ED760]/40 text-[#1ED760]">
                <Headphones className="h-8 w-8" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#1ED760]/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#1ED760]">
                  {user
                    ? user.isDemo
                      ? "DEMO PROFILE"
                      : "LIVE SPOTIFY ACCOUNT"
                    : "NOT CONNECTED"}
                </span>
                {user && !user.isDemo && (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
                    Market: {user.country} • {user.followers} Followers
                  </span>
                )}
              </div>
              <h2 className="mt-1 text-2xl font-black text-white">
                {user ? user.displayName : "Connect Your Spotify Vault"}
              </h2>
              <p className="text-xs text-slate-300">
                {user
                  ? `${playlists.length} Playlists • ${
                      vault.likedSongsTotal || likedSongs.length
                    } Liked Songs • ${
                      vault.recentlyPlayed.length
                    } Recent Streams`
                  : "Sign in with Spotify OAuth to load your personal Top Artists, Top Tracks, Playlists & Liked Songs."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {user && !user.isDemo && (
              <button
                onClick={handleSyncClick}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#1ED760]/40 bg-[#1ED760]/15 px-4 py-2.5 text-xs font-extrabold text-[#1ED760] hover:bg-[#1ED760]/25 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span>{isRefreshing ? "Syncing..." : "Sync Live Data"}</span>
              </button>
            )}
            {!user && (
              <button
                onClick={onActivateDemo}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1ED760] px-4 py-2.5 text-xs font-extrabold text-black shadow-lg shadow-[#1ED760]/20 hover:bg-[#22e668] transition cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                Try Demo Account
              </button>
            )}
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition cursor-pointer"
            >
              <LogIn className="h-4 w-4 text-[#1ED760]" />
              {user ? "Account Settings" : "Spotify Login"}
            </button>
          </div>
        </div>

        {/* Permission Upgrade Banner if token was created before Liked Songs / Playlists scopes */}
        {user && !user.isDemo && vault.needsLibraryScope && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
            <div className="flex items-center gap-2.5 text-xs text-amber-200">
              <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                To load your <strong>Liked Songs</strong> and{" "}
                <strong>Private Playlists</strong>, grant Spotify Library
                permission once:
              </span>
            </div>
            <button
              onClick={() => initiateSpotifyPkceLogin()}
              className="rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-black hover:bg-amber-300 transition cursor-pointer"
            >
              Unlock Liked Songs &amp; Playlists (1-Click)
            </button>
          </div>
        )}

        {/* Vault Section Sub-Navigation */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              {
                id: "top",
                label: "Top Artists & Tracks",
                icon: <UserCheck className="h-3.5 w-3.5" />,
              },
              {
                id: "playlists",
                label: `My Playlists (${playlists.length})`,
                icon: <ListMusic className="h-3.5 w-3.5" />,
              },
              {
                id: "liked",
                label: `Liked Songs (${
                  vault.likedSongsTotal || likedSongs.length
                })`,
                icon: <Heart className="h-3.5 w-3.5" />,
              },
              {
                id: "recent",
                label: "Recently Played",
                icon: <Clock className="h-3.5 w-3.5" />,
              },
            ].map((tab) => {
              const active = section === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSection(tab.id as VaultSection);
                    setSelectedPlaylist(null);
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    active
                      ? "bg-[#1ED760] text-black shadow-md shadow-[#1ED760]/20"
                      : "bg-black/40 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {section === "top" && (
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#07080C] p-1">
              {[
                { id: "short_term", label: "Last 4 Weeks" },
                { id: "medium_term", label: "Last 6 Months" },
                { id: "long_term", label: "All-Time" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    setTimeRange(
                      item.id as "short_term" | "medium_term" | "long_term"
                    )
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    timeRange === item.id
                      ? "bg-white/15 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: TOP ARTISTS & TOP TRACKS */}
      {section === "top" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Personal Top Artists */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#10131C]/90 p-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Your Top Artists
                </h3>
                <p className="text-xs text-slate-400">
                  {timeRange === "short_term"
                    ? "Most streamed over the last 4 weeks"
                    : timeRange === "medium_term"
                    ? "Most streamed over the last 6 months"
                    : "Your all-time most streamed artists"}
                </p>
              </div>
              <UserCheck className="h-4 w-4 text-[#1ED760]" />
            </div>

            {topArtists.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm text-slate-400">
                  No top artists loaded yet for this window.
                </p>
                <button
                  onClick={handleSyncClick}
                  className="rounded-xl bg-[#1ED760] px-4 py-2 text-xs font-bold text-black cursor-pointer"
                >
                  Sync Live Spotify Data
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topArtists.map((artist, idx) => (
                  <div
                    key={`${artist.id}-${idx}`}
                    onClick={() => onSelectArtist(artist)}
                    className="group flex items-center justify-between rounded-2xl border border-white/[0.05] bg-[#0A0C12] p-3 hover:border-[#1ED760]/40 hover:bg-[#141926] transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-6 font-mono-tabular text-xs font-extrabold text-[#1ED760]">
                        #{idx + 1}
                      </span>
                      <img
                        src={artist.avatar}
                        alt={artist.name}
                        className="h-12 w-12 rounded-full object-cover border border-white/15 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white group-hover:text-[#1ED760] truncate">
                          {artist.name}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {artist.topTracks && artist.topTracks.length > 0
                            ? `♪ ${artist.topTracks
                                .slice(0, 2)
                                .map((t) => t.title)
                                .join(", ")}`
                            : artist.genres && artist.genres.length > 0
                            ? artist.genres.slice(0, 2).join(" • ")
                            : `Your #${idx + 1} Most Streamed Artist`}
                          {artist.followers > 0
                            ? ` • ${formatCompact(artist.followers)} followers`
                            : ""}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayArtist(artist);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1ED760]/15 text-[#1ED760] group-hover:bg-[#1ED760] group-hover:text-black transition cursor-pointer"
                      title={`Play ${artist.name}`}
                    >
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Personal Top Tracks */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#10131C]/90 p-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Your Top Tracks
                </h3>
                <p className="text-xs text-slate-400">
                  Click any song to play it or open fullscreen lyrics &amp; video
                </p>
              </div>
              <Disc3 className="h-4 w-4 text-[#1ED760]" />
            </div>

            {topTracks.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm text-slate-400">
                  No top tracks loaded yet for this window.
                </p>
                <button
                  onClick={handleSyncClick}
                  className="rounded-xl bg-[#1ED760] px-4 py-2 text-xs font-bold text-black cursor-pointer"
                >
                  Sync Live Spotify Data
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topTracks.map((song, idx) => (
                  <div
                    key={`${song.id}-${idx}`}
                    onClick={() => onPlaySong(song)}
                    className="group flex items-center justify-between rounded-2xl border border-white/[0.05] bg-[#0A0C12] p-3 hover:border-[#1ED760]/40 hover:bg-[#141926] transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-6 font-mono-tabular text-xs font-extrabold text-amber-300">
                        #{idx + 1}
                      </span>
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="h-12 w-12 rounded-xl object-cover border border-white/15 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white group-hover:text-[#1ED760] truncate">
                          {song.title}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {song.artistName} • {song.album}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono-tabular text-xs text-slate-500 hidden sm:inline">
                        {song.duration}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlaySong(song);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1ED760] text-black hover:scale-105 transition cursor-pointer"
                        title={`Play ${song.title}`}
                      >
                        <Play className="h-4 w-4 fill-current ml-0.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: MY PLAYLISTS (with Interactive Playlist Track Explorer) */}
      {section === "playlists" && (
        <div className="rounded-3xl border border-white/[0.08] bg-[#10131C]/90 p-6">
          {selectedPlaylist ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedPlaylist(null)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Playlists
                  </button>
                  <img
                    src={selectedPlaylist.coverUrl}
                    alt={selectedPlaylist.name}
                    className="h-14 w-14 rounded-2xl object-cover border border-white/15"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold text-white">
                        {selectedPlaylist.name}
                      </h3>
                      <span className="rounded-full bg-[#1ED760]/15 border border-[#1ED760]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#1ED760]">
                        Recently Added First
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      By {selectedPlaylist.ownerName} • Showing all{" "}
                      <strong className="text-white">
                        {playlistTracks.length || selectedPlaylist.trackCount}
                      </strong>{" "}
                      tracks (Sorted by Date Added ↓)
                    </p>
                  </div>
                </div>
              </div>

              {loadingPlaylist ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                  <Loader2 className="h-7 w-7 animate-spin text-[#1ED760]" />
                  <span className="text-xs">
                    Loading songs in &ldquo;{selectedPlaylist.name}&rdquo;...
                  </span>
                </div>
              ) : playlistTracks.length === 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
                    <span>
                      This playlist is private or requires updated Spotify
                      Playlist permission. Click below to unlock individual
                      track rows, or stream directly from the embedded playlist
                      below:
                    </span>
                    <button
                      onClick={() => initiateSpotifyPkceLogin()}
                      className="rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-black hover:bg-amber-300 transition cursor-pointer"
                    >
                      Unlock Private Playlist Tracks (1-Click)
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                    <iframe
                      src={`https://open.spotify.com/embed/playlist/${selectedPlaylist.id}?utm_source=generator&theme=0`}
                      width="100%"
                      height="480"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      title={selectedPlaylist.name}
                      className="block"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {playlistTracks.map((song, idx) => (
                    <div
                      key={`${song.id}-${idx}`}
                      onClick={() => onPlaySong(song)}
                      className="group flex items-center justify-between rounded-2xl border border-white/[0.05] bg-[#0A0C12] p-3 hover:border-[#1ED760]/40 hover:bg-[#141926] transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 font-mono-tabular text-xs font-bold text-slate-500">
                          {idx + 1}
                        </span>
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          className="h-11 w-11 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-white group-hover:text-[#1ED760] truncate">
                            {song.title}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {song.artistName}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        {song.addedAt && (
                          <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-slate-400">
                            {song.addedAt}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlaySong(song);
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white group-hover:bg-[#1ED760] group-hover:text-black transition cursor-pointer"
                        >
                          <Play className="h-4 w-4 fill-current ml-0.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Your Spotify Playlists ({playlists.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sorted by Last Played • Click any playlist to view songs
                    sorted by Recently Added on top
                  </p>
                </div>
                <span className="rounded-full border border-[#1ED760]/30 bg-[#1ED760]/10 px-3 py-1 text-[11px] font-bold text-[#1ED760]">
                  Sorted by Last Played
                </span>
              </div>

              {playlists.length === 0 ? (
                <div className="py-14 text-center space-y-3">
                  <p className="text-sm text-slate-400">
                    No playlists loaded yet. Click below to authorize playlist
                    access or sync your account:
                  </p>
                  <button
                    onClick={() => initiateSpotifyPkceLogin()}
                    className="rounded-xl bg-[#1ED760] px-4 py-2.5 text-xs font-extrabold text-black cursor-pointer"
                  >
                    Sync My Playlists from Spotify
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {playlists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => handleOpenPlaylist(pl)}
                      className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0A0C12] p-4 hover:border-[#1ED760]/40 hover:bg-[#131824] transition cursor-pointer"
                    >
                      <div>
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/10 mb-3">
                          <img
                            src={pl.coverUrl}
                            alt={pl.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute bottom-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-[#1ED760] text-black shadow-lg opacity-0 group-hover:opacity-100 transition">
                            <Play className="h-4 w-4 fill-current ml-0.5" />
                          </div>
                        </div>
                        <h4 className="font-bold text-sm text-white group-hover:text-[#1ED760] truncate">
                          {pl.name}
                        </h4>
                        <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-400">
                          <span className="truncate">
                            {pl.trackCount > 0 ? `${pl.trackCount} tracks • ` : ""}
                            {pl.ownerName}
                          </span>
                          {pl.lastPlayedLabel && (
                            <span className="shrink-0 rounded-md bg-[#1ED760]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#1ED760]">
                              {pl.lastPlayedLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: LIKED SONGS */}
      {section === "liked" && (
        <div className="rounded-3xl border border-white/[0.08] bg-[#10131C]/90 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4 mb-4">
            <div>
              <h3 className="flex items-center gap-2 text-base font-extrabold text-white">
                <Heart className="h-4 w-4 text-[#1ED760] fill-[#1ED760]" />
                Your Liked Songs ({vault.likedSongsTotal || likedSongs.length})
              </h3>
              <p className="text-xs text-slate-400">
                Saved tracks from your personal Spotify library
              </p>
            </div>
          </div>

          {likedSongs.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <p className="text-sm text-slate-300">
                {vault.needsLibraryScope
                  ? "Spotify requires the 'user-library-read' permission to view your Liked Songs."
                  : "No Liked Songs loaded yet."}
              </p>
              <button
                onClick={() => initiateSpotifyPkceLogin()}
                className="rounded-xl bg-[#1ED760] px-5 py-2.5 text-xs font-extrabold text-black shadow-lg shadow-[#1ED760]/25 hover:bg-[#22e668] transition cursor-pointer"
              >
                Unlock My Liked Songs (1-Click Re-Auth)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {likedSongs.map((song, idx) => (
                <div
                  key={`${song.id}-${idx}`}
                  onClick={() => onPlaySong(song)}
                  className="group flex items-center justify-between rounded-2xl border border-white/[0.05] bg-[#0A0C12] p-3 hover:border-[#1ED760]/40 hover:bg-[#141926] transition cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-6 font-mono-tabular text-xs font-bold text-slate-500">
                      {idx + 1}
                    </span>
                    <img
                      src={song.coverUrl}
                      alt={song.title}
                      className="h-11 w-11 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white group-hover:text-[#1ED760] truncate">
                        {song.title}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {song.artistName}
                        {song.addedAt ? ` • Saved ${song.addedAt}` : ""}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlaySong(song);
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1ED760] text-black hover:scale-105 transition cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: RECENTLY PLAYED */}
      {section === "recent" && (
        <div className="rounded-3xl border border-white/[0.08] bg-[#10131C]/90 p-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
            <div>
              <h3 className="text-base font-extrabold text-white">
                Recently Played Stream History
              </h3>
              <p className="text-xs text-slate-400">
                Your latest tracks streamed across all Spotify devices
              </p>
            </div>
            <Clock className="h-4 w-4 text-[#1ED760]" />
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {vault.recentlyPlayed.map((entry, idx) => (
              <div
                key={`${entry.song.id}-${idx}`}
                onClick={() => onPlaySong(entry.song)}
                className="group flex items-center justify-between rounded-2xl border border-white/[0.05] bg-[#0A0C12] p-3 hover:border-[#1ED760]/40 hover:bg-[#141926] transition cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={entry.song.coverUrl}
                    alt={entry.song.title}
                    className="h-11 w-11 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white group-hover:text-[#1ED760] truncate">
                      {entry.song.title}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {entry.song.artistName}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="text-[11px] text-slate-400">
                    {entry.playedAt}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlaySong(entry.song);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white group-hover:bg-[#1ED760] group-hover:text-black transition cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
