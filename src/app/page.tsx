"use client";

import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import KpiRibbon from "../components/KpiRibbon";
import FilterBar from "../components/FilterBar";
import ArtistTable from "../components/ArtistTable";
import SongTable from "../components/SongTable";
import CountryView from "../components/CountryView";
import CompareView from "../components/CompareView";
import PersonalVault from "../components/PersonalVault";
import YouTubeView from "../components/YouTubeView";
import DetailDrawer from "../components/DetailDrawer";
import PlayerBar from "../components/PlayerBar";
import LoginModal from "../components/LoginModal";
import AuthGate from "../components/AuthGate";
import {
  DEMO_VAULT,
  TOP_ARTISTS,
  TOP_SONGS,
} from "../data/spotifyData";
import {
  DEFAULT_FILTERS,
  filterAndSortArtists,
  filterAndSortSongs,
} from "../lib/filterEngine";
import {
  activateDemoSession,
  applyServerSpotifyTokens,
  clearSpotifySession,
  fetchLiveArtistTopTracks,
  fetchLiveSpotifyUserAndVault,
  getCachedSession,
  getSavedClientId,
  getValidAccessToken,
  handleSpotifyCallback,
  initiateSpotifyPkceLogin,
} from "../lib/spotifyAuth";
import {
  ArtistSortField,
  ArtistStat,
  DashboardTab,
  FilterState,
  PersonalVaultData,
  PlayableItem,
  SongSortField,
  SongStat,
  SpotifyUserProfile,
  YouTubeTrackItem,
} from "../types/spotify";

export default function SpotifyTrackerDashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("artists");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Selected entity for Slide-Over Detail Drawer
  const [selectedArtist, setSelectedArtist] = useState<ArtistStat | null>(null);
  const [selectedSong, setSelectedSong] = useState<SongStat | null>(null);

  // Head-to-head comparison artist IDs
  const [compareIds, setCompareIds] = useState<string[]>([
    "bruno-mars",
    "the-weeknd",
    "kendrick-lamar",
  ]);

  // Persistent Bottom Player Bar state
  const [currentTrack, setCurrentTrack] = useState<PlayableItem | null>({
    spotifyTrackId: TOP_SONGS[0].spotifyTrackId,
    title: TOP_SONGS[0].title,
    artistName: TOP_SONGS[0].artistName,
    artistId: TOP_SONGS[0].artistId,
    coverUrl: TOP_SONGS[0].coverUrl,
    duration: TOP_SONGS[0].duration,
    dailyStreams: TOP_SONGS[0].dailyStreams,
    bpm: TOP_SONGS[0].audioFeatures.bpm,
  });
  const [ytQueue, setYtQueue] = useState<YouTubeTrackItem[]>([]);

  // Spotify Auth / Demo session state
  const [user, setUser] = useState<SpotifyUserProfile | null>(null);
  const [vault, setVault] = useState<PersonalVaultData>(DEMO_VAULT);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Keycloak + TOTP 2FA Gate state
  const [kcChecked, setKcChecked] = useState(false);
  const [kcEmail, setKcEmail] = useState<string | null>(null);
  const [kcIssuer, setKcIssuer] = useState<string | null>(null);

  // Restore cached session immediately on mount, then refresh/handle OAuth callback in background
  useEffect(() => {
    setMounted(true);

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.authenticated && data?.email) {
          setKcEmail(data.email);
        }
        if (data?.keycloakIssuer) {
          setKcIssuer(data.keycloakIssuer);
        }
      })
      .catch(() => {})
      .finally(() => {
        setKcChecked(true);
      });

    const cached = getCachedSession();
    if (cached) {
      setUser(cached.profile);
      setVault(cached.vault);
    }

    handleSpotifyCallback()
      .then((res) => {
        if (res) {
          setUser(res.profile);
          setVault(res.vault);
          if (res.isFreshLogin) {
            setActiveTab("vault");
          }
        }
      })
      .catch(() => {
        // Retain cached session if network call fails
      });
  }, []);

  // Automatically hydrate Spotify & YouTube credentials from server .env and local bridge once authenticated
  useEffect(() => {
    if (!kcEmail || typeof window === "undefined") return;

    fetch("/api/auth/default-credentials")
      .then((r) => (r.ok ? r.json() : null))
      .then(async (creds) => {
        if (!creds) return;
        if (creds.googleClientId) {
          localStorage.setItem(
            "pulseify_google_client_id",
            creds.googleClientId
          );
          window.dispatchEvent(new Event("pulseify-storage-synced"));
        }
        if (creds.spotifyClientId) {
          localStorage.setItem(
            "pulseify_spotify_client_id",
            creds.spotifyClientId
          );
        }
        const existingCached = getCachedSession();
        if (
          creds.spotifyAccessToken &&
          (!existingCached || existingCached.profile.isDemo)
        ) {
          applyServerSpotifyTokens(
            creds.spotifyAccessToken,
            creds.spotifyRefreshToken,
            creds.spotifyClientId
          );
          try {
            const live = await fetchLiveSpotifyUserAndVault(
              creds.spotifyAccessToken
            );
            setUser(live.profile);
            setVault(live.vault);
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});

    const onBridgeMessage = async (event: MessageEvent) => {
      if (event.data?.type !== "PULSEIFY_STORAGE_BRIDGE") return;
      const dump = event.data?.dump as Record<string, string> | undefined;
      if (!dump || Object.keys(dump).length === 0) return;

      let updatedAny = false;
      for (const [k, v] of Object.entries(dump)) {
        if (v && !localStorage.getItem(k)) {
          localStorage.setItem(k, v);
          updatedAny = true;
        }
      }
      if (updatedAny) {
        window.dispatchEvent(new Event("pulseify-storage-synced"));
        const synced = getCachedSession();
        if (synced) {
          setUser(synced.profile);
          setVault(synced.vault);
        }
        const validToken = await getValidAccessToken();
        if (validToken) {
          try {
            const live = await fetchLiveSpotifyUserAndVault(validToken);
            setUser(live.profile);
            setVault(live.vault);
          } catch {
            // ignore
          }
        }
      }
    };

    window.addEventListener("message", onBridgeMessage);
    return () => window.removeEventListener("message", onBridgeMessage);
  }, [kcEmail]);

  const filteredArtists = useMemo(
    () => filterAndSortArtists(TOP_ARTISTS, filters),
    [filters]
  );

  const filteredSongs = useMemo(
    () => filterAndSortSongs(TOP_SONGS, filters),
    [filters]
  );

  const updateFilters = (updated: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleSortArtists = (field: ArtistSortField) => {
    setFilters((prev) => {
      if (prev.artistSortField === field) {
        return {
          ...prev,
          artistSortOrder: prev.artistSortOrder === "asc" ? "desc" : "asc",
        };
      }
      const defaultOrder =
        field === "rank" || field === "peakRank" || field === "name"
          ? "asc"
          : "desc";
      return {
        ...prev,
        artistSortField: field,
        artistSortOrder: defaultOrder,
      };
    });
  };

  const handleSortSongs = (field: SongSortField) => {
    setFilters((prev) => {
      if (prev.songSortField === field) {
        return {
          ...prev,
          songSortOrder: prev.songSortOrder === "asc" ? "desc" : "asc",
        };
      }
      const defaultOrder =
        field === "rank" || field === "peakRank" || field === "title"
          ? "asc"
          : "desc";
      return {
        ...prev,
        songSortField: field,
        songSortOrder: defaultOrder,
      };
    });
  };

  // When an artist is selected, also fetch their live top tracks from Spotify
  const handleSelectArtist = async (artist: ArtistStat) => {
    setSelectedSong(null);
    setSelectedArtist(artist);

    const liveTracks = await fetchLiveArtistTopTracks(
      artist.spotifyArtistId,
      artist.name
    );
    if (liveTracks && liveTracks.length > 0) {
      setSelectedArtist((prev) =>
        prev && prev.id === artist.id
          ? { ...prev, topTracks: liveTracks }
          : prev
      );
    }
  };

  const handleSelectSong = (song: SongStat) => {
    setSelectedArtist(null);
    setSelectedSong(song);
  };

  // Play ANY artist (uses attached real tracks or fetches live top tracks via /api/artist & Spotify search)
  const handlePlayArtist = async (artist: ArtistStat) => {
    // 1. If artist already has real attached tracks, start playing immediately for instant response
    if (artist.topTracks && artist.topTracks.length > 0) {
      const top = artist.topTracks[0];
      setCurrentTrack({
        spotifyTrackId: top.spotifyTrackId,
        source: "spotify",
        title: top.title,
        artistName: artist.name,
        artistId: artist.id,
        coverUrl: artist.avatar,
        duration: top.duration,
        dailyStreams: top.dailyStreams,
      });
      return;
    }

    // 2. Otherwise fetch live top tracks by artist ID & name
    const liveTracks = await fetchLiveArtistTopTracks(
      artist.spotifyArtistId,
      artist.name
    );
    const top = liveTracks && liveTracks[0];
    if (!top) return;
    setCurrentTrack({
      spotifyTrackId: top.spotifyTrackId,
      source: "spotify",
      title: top.title,
      artistName: artist.name,
      artistId: artist.id,
      coverUrl: artist.avatar,
      duration: top.duration,
      dailyStreams: top.dailyStreams,
    });
  };

  const handlePlaySong = (song: SongStat) => {
    setCurrentTrack({
      spotifyTrackId: song.spotifyTrackId,
      source: "spotify",
      title: song.title,
      artistName: song.artistName,
      artistId: song.artistId,
      coverUrl: song.coverUrl,
      duration: song.duration,
      dailyStreams: song.dailyStreams,
      bpm: song.audioFeatures.bpm,
    });
  };

  const handlePlayYouTubeTrack = (
    track: YouTubeTrackItem,
    queue?: YouTubeTrackItem[]
  ) => {
    if (queue && queue.length > 0) {
      setYtQueue(queue);
    }
    setCurrentTrack({
      spotifyTrackId: track.videoId,
      youtubeVideoId: track.videoId,
      source: "youtube",
      title: track.title,
      artistName: track.artistName,
      coverUrl: track.coverUrl,
      duration: track.duration,
      viewsText: track.viewsText,
    });
  };

  const handleToggleCompare = (artistId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(artistId)) {
        return prev.filter((id) => id !== artistId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), artistId];
      }
      return [...prev, artistId];
    });
  };

  const handleNextTrack = () => {
    if (currentTrack?.source === "youtube" && ytQueue.length > 0) {
      const idx = ytQueue.findIndex(
        (t) => t.videoId === currentTrack.youtubeVideoId
      );
      const nextYt = ytQueue[(idx + 1) % ytQueue.length];
      if (nextYt) handlePlayYouTubeTrack(nextYt);
      return;
    }
    const pool =
      activeTab === "vault"
        ? vault.topTracksByRange.short_term
        : TOP_SONGS;
    const idx = pool.findIndex(
      (s) => s.spotifyTrackId === currentTrack?.spotifyTrackId
    );
    const nextSong = pool[(idx + 1) % pool.length];
    if (nextSong) handlePlaySong(nextSong);
  };

  const handlePrevTrack = () => {
    if (currentTrack?.source === "youtube" && ytQueue.length > 0) {
      const idx = ytQueue.findIndex(
        (t) => t.videoId === currentTrack.youtubeVideoId
      );
      const prevYt = ytQueue[(idx - 1 + ytQueue.length) % ytQueue.length];
      if (prevYt) handlePlayYouTubeTrack(prevYt);
      return;
    }
    const pool =
      activeTab === "vault"
        ? vault.topTracksByRange.short_term
        : TOP_SONGS;
    const idx = pool.findIndex(
      (s) => s.spotifyTrackId === currentTrack?.spotifyTrackId
    );
    const prevSong = pool[(idx - 1 + pool.length) % pool.length];
    if (prevSong) handlePlaySong(prevSong);
  };

  const handleInspectArtistById = (artistId: string) => {
    const found =
      TOP_ARTISTS.find((a) => a.id === artistId || a.spotifyArtistId === artistId) ||
      vault.topArtistsByRange.short_term.find(
        (a) => a.id === artistId || a.spotifyArtistId === artistId
      );
    if (found) {
      handleSelectArtist(found);
    }
  };

  const handleRefreshLiveVault = async () => {
    const token = await getValidAccessToken();
    if (!token) return;
    const res = await fetchLiveSpotifyUserAndVault(token);
    setUser(res.profile);
    setVault(res.vault);
  };

  const handleLockApp = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setKcEmail(null);
  };

  if (!mounted || !kcChecked) {
    return <div className="min-h-screen bg-[#07080C]" suppressHydrationWarning />;
  }

  if (!kcEmail) {
    return (
      <AuthGate
        onAuthenticated={(email) => setKcEmail(email)}
        keycloakIssuer={kcIssuer}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-32">
      {/* Hidden Localhost Storage Bridge to auto-import existing 127.0.0.1:3000 credentials */}
      {typeof window !== "undefined" &&
        window.location.hostname !== "127.0.0.1" &&
        window.location.hostname !== "localhost" && (
          <>
            <iframe
              src="http://127.0.0.1:3000/sync-bridge"
              className="hidden"
              title="pulseify-local-bridge-127"
            />
            <iframe
              src="http://localhost:3000/sync-bridge"
              className="hidden"
              title="pulseify-local-bridge-localhost"
            />
          </>
        )}

      {/* Sticky Navigation Bar with Live Universal Spotify Search */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        searchQuery={filters.search}
        onSearchChange={(q) => updateFilters({ search: q })}
        user={user}
        onOpenLogin={() => {
          if (user) {
            setIsLoginOpen(true);
          } else {
            initiateSpotifyPkceLogin(getSavedClientId());
          }
        }}
        compareCount={compareIds.length}
        onSelectArtist={handleSelectArtist}
        onPlayArtist={handlePlayArtist}
        onSelectSong={handleSelectSong}
        onPlaySong={handlePlaySong}
        onPlayYouTubeTrack={handlePlayYouTubeTrack}
        authenticatedEmail={kcEmail}
        onLockApp={handleLockApp}
      />

      {/* Main Workspace Container */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 space-y-5">
        {/* Clean 3-Card KPI Summary */}
        {(activeTab === "artists" || activeTab === "songs") && (
          <KpiRibbon
            artists={filteredArtists}
            countryCode={filters.country}
            onSelectArtist={handleSelectArtist}
            onPlayArtist={handlePlayArtist}
          />
        )}

        {/* TAB 1: ARTISTS LEADERBOARD */}
        {activeTab === "artists" && (
          <>
            <FilterBar
              filters={filters}
              onChange={updateFilters}
              onReset={resetFilters}
              totalCount={filteredArtists.length}
              mode="artists"
            />
            <ArtistTable
              artists={filteredArtists}
              viewMode={filters.viewMode}
              sortField={filters.artistSortField}
              sortOrder={filters.artistSortOrder}
              onSort={handleSortArtists}
              onSelectArtist={handleSelectArtist}
              onPlayArtist={handlePlayArtist}
              compareIds={compareIds}
              onToggleCompare={handleToggleCompare}
              activeTrackId={currentTrack?.spotifyTrackId}
              onResetFilters={resetFilters}
            />
          </>
        )}

        {/* TAB 2: TOP SONGS & VIRAL CHARTS */}
        {activeTab === "songs" && (
          <>
            <FilterBar
              filters={filters}
              onChange={updateFilters}
              onReset={resetFilters}
              totalCount={filteredSongs.length}
              mode="songs"
            />
            <SongTable
              songs={filteredSongs}
              viewMode={filters.viewMode}
              sortField={filters.songSortField}
              sortOrder={filters.songSortOrder}
              onSort={handleSortSongs}
              onSelectSong={handleSelectSong}
              onPlaySong={handlePlaySong}
              activeTrackId={currentTrack?.spotifyTrackId}
              onResetFilters={resetFilters}
            />
          </>
        )}

        {/* TAB 3: COUNTRIES & REGIONAL MARKETS */}
        {activeTab === "countries" && (
          <CountryView
            selectedCountry={
              filters.country === "GLOBAL" ? "US" : filters.country
            }
            onSelectCountry={(code) => updateFilters({ country: code })}
            onSelectArtist={handleSelectArtist}
            onPlayArtist={handlePlayArtist}
            onSelectSong={handleSelectSong}
            onPlaySong={handlePlaySong}
            onJumpToArtistsWithCountry={(code) => {
              updateFilters({ country: code });
              setActiveTab("artists");
            }}
          />
        )}

        {/* TAB 4: COMPARE HEAD-TO-HEAD */}
        {activeTab === "compare" && (
          <CompareView
            compareIds={compareIds}
            onToggleCompare={handleToggleCompare}
            onSelectArtist={handleSelectArtist}
            onPlayArtist={handlePlayArtist}
          />
        )}

        {/* TAB 5: MY SPOTIFY VAULT */}
        {activeTab === "vault" && (
          <PersonalVault
            user={user}
            vault={vault}
            onOpenLogin={() => setIsLoginOpen(true)}
            onActivateDemo={() => {
              const session = activateDemoSession();
              setUser(session.profile);
              setVault(session.vault);
            }}
            onRefreshLiveVault={handleRefreshLiveVault}
            onSelectArtist={handleSelectArtist}
            onPlayArtist={handlePlayArtist}
            onSelectSong={handleSelectSong}
            onPlaySong={handlePlaySong}
          />
        )}

        {/* TAB 6: YOUTUBE MUSIC & VIDEO BACKEND */}
        {activeTab === "youtube" && (
          <YouTubeView
            onPlayYouTubeTrack={handlePlayYouTubeTrack}
            activeVideoId={currentTrack?.youtubeVideoId}
          />
        )}
      </main>

      {/* Slide-Over Detail Inspector Drawer */}
      <DetailDrawer
        selectedArtist={selectedArtist}
        selectedSong={selectedSong}
        onClose={() => {
          setSelectedArtist(null);
          setSelectedSong(null);
        }}
        onPlayItem={(item) => setCurrentTrack(item)}
        onInspectArtistById={handleInspectArtistById}
        compareIds={compareIds}
        onToggleCompare={handleToggleCompare}
      />

      {/* Persistent Sticky Bottom Spotify Player + Full-Screen Lyrics & Vinyl Studio */}
      <PlayerBar
        currentTrack={currentTrack}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        onInspectArtist={handleInspectArtistById}
      />

      {/* Spotify OAuth 2.0 PKCE & 1-Click Demo Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        user={user}
        onActivateDemo={() => {
          const session = activateDemoSession();
          setUser(session.profile);
          setVault(session.vault);
        }}
        onLogout={() => {
          clearSpotifySession();
          setUser(null);
        }}
      />
    </div>
  );
}
