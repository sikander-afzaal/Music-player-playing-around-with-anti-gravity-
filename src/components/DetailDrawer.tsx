"use client";

import React from "react";
import {
  X,
  Play,
  BadgeCheck,
  TrendingUp,
  TrendingDown,
  Trophy,
  Users,
  MapPin,
  Disc3,
  ExternalLink,
  Scale,
  Activity,
  Music,
} from "lucide-react";
import {
  ArtistStat,
  PlayableItem,
  SongStat,
} from "../types/spotify";
import {
  formatCompact,
  formatDelta,
  formatNumber,
} from "../lib/filterEngine";

interface DetailDrawerProps {
  selectedArtist: ArtistStat | null;
  selectedSong: SongStat | null;
  onClose: () => void;
  onPlayItem: (item: PlayableItem) => void;
  onInspectArtistById: (artistId: string) => void;
  compareIds: string[];
  onToggleCompare: (artistId: string) => void;
}

function TrajectoryChart({
  data,
  positive,
  unitLabel,
}: {
  data: number[];
  positive: boolean;
  unitLabel: string;
}) {
  if (!data || data.length < 2) return null;
  const width = 440;
  const height = 135;
  const padX = 10;
  const padY = 16;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const coords = data.map((val, idx) => {
    const x =
      padX + (idx / (data.length - 1)) * (width - padX * 2);
    const y =
      height - padY - ((val - min) / range) * (height - padY * 2);
    return { x, y, val };
  });

  const linePoints = coords
    .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const areaPoints = `${coords[0].x.toFixed(1)},${height} ${linePoints} ${coords[
    coords.length - 1
  ].x.toFixed(1)},${height}`;

  const color = positive ? "#1ED760" : "#F43F5E";

  return (
    <div className="rounded-xl border border-white/10 bg-[#0A0C12] p-3.5">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-300">
          30-Day Trajectory ({unitLabel})
        </span>
        <span className="font-mono-tabular text-[11px] text-slate-400">
          Low: {min.toFixed(2)}M • High: {max.toFixed(2)}M
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-32 overflow-visible"
      >
        <defs>
          <linearGradient id="drawerChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#drawerChartGrad)" />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={linePoints}
        />
        {coords.map((c, i) =>
          i === 0 || i === coords.length - 1 || i % 7 === 0 ? (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r="3"
              fill={color}
              stroke="#07080C"
              strokeWidth="1.5"
            />
          ) : null
        )}
      </svg>
    </div>
  );
}

export default function DetailDrawer({
  selectedArtist,
  selectedSong,
  onClose,
  onPlayItem,
  onInspectArtistById,
  compareIds,
  onToggleCompare,
}: DetailDrawerProps) {
  if (!selectedArtist && !selectedSong) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-label="Close overlay"
      />

      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-white/15 bg-[#0D1018] shadow-2xl overflow-y-auto pb-28">
        {/* Sticky Top Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#0D1018]/90 px-5 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1ED760]">
            <Activity className="h-4 w-4" />
            <span>
              {selectedArtist
                ? "Artist Intelligence Profile"
                : "Track Analytics & Audio DNA"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ARTIST INSPECTOR */}
        {selectedArtist && (
          <div className="p-5 space-y-6">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#131824] p-5">
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${selectedArtist.bannerColor} opacity-80`}
              />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedArtist.avatar}
                    alt={selectedArtist.name}
                    className="h-20 w-20 rounded-2xl object-cover border-2 border-white/20 shadow-xl"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-black/60 px-2 py-0.5 font-mono-tabular text-xs font-extrabold text-[#1ED760] border border-[#1ED760]/40">
                        WORLD #{selectedArtist.rank}
                      </span>
                      <span className="rounded-md bg-amber-400/20 px-2 py-0.5 font-mono-tabular text-xs font-bold text-amber-300">
                        PEAK #{selectedArtist.peakRank}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <h2 className="text-2xl font-extrabold text-white">
                        {selectedArtist.name}
                      </h2>
                      {selectedArtist.verified && (
                        <BadgeCheck className="h-5 w-5 text-[#1ED760]" />
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {selectedArtist.genres.map((g) => (
                        <span
                          key={g}
                          className="rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-medium text-slate-200 border border-white/10"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="relative mt-5 flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => {
                    const top = selectedArtist.topTracks[0];
                    if (top) {
                      onPlayItem({
                        spotifyTrackId: top.spotifyTrackId,
                        title: top.title,
                        artistName: selectedArtist.name,
                        artistId: selectedArtist.id,
                        coverUrl: selectedArtist.avatar,
                        duration: top.duration,
                        dailyStreams: top.dailyStreams,
                      });
                    }
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1ED760] px-4 py-2.5 text-xs font-extrabold text-black shadow-lg shadow-[#1ED760]/25 hover:bg-[#22e668] transition cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Play Top Hit ({selectedArtist.topTracks[0]?.title})
                </button>

                <button
                  onClick={() => onToggleCompare(selectedArtist.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                    compareIds.includes(selectedArtist.id)
                      ? "border-[#1ED760] bg-[#1ED760]/20 text-[#1ED760]"
                      : "border-white/15 bg-black/50 text-white hover:bg-white/10"
                  }`}
                >
                  <Scale className="h-4 w-4" />
                  {compareIds.includes(selectedArtist.id)
                    ? "In Comparison"
                    : "Compare"}
                </button>

                <a
                  href={`https://open.spotify.com/artist/${selectedArtist.spotifyArtistId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition"
                  title="Open Artist on Spotify"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* 6-Card Core Stat Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-[#121622] p-3.5">
                <span className="text-[11px] text-slate-400">
                  Monthly Listeners
                </span>
                <div className="mt-1 font-mono-tabular text-base font-extrabold text-white">
                  {formatNumber(selectedArtist.monthlyListeners)}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#121622] p-3.5">
                <span className="text-[11px] text-slate-400">24h Change</span>
                <div
                  className={`mt-1 flex items-center gap-1 font-mono-tabular text-base font-extrabold ${
                    selectedArtist.dailyDelta >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {selectedArtist.dailyDelta >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {formatDelta(selectedArtist.dailyDelta)}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#121622] p-3.5">
                <span className="text-[11px] text-slate-400">
                  Peak Listeners
                </span>
                <div className="mt-1 font-mono-tabular text-base font-extrabold text-amber-300">
                  {formatNumber(selectedArtist.peakListeners)}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#121622] p-3.5">
                <span className="text-[11px] text-slate-400">
                  All-Time Peak Rank
                </span>
                <div className="mt-1 flex items-center gap-1 font-mono-tabular text-base font-extrabold text-white">
                  <Trophy className="h-4 w-4 text-amber-400" /> #
                  {selectedArtist.peakRank}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#121622] p-3.5">
                <span className="text-[11px] text-slate-400">
                  Spotify Followers
                </span>
                <div className="mt-1 flex items-center gap-1 font-mono-tabular text-base font-extrabold text-white">
                  <Users className="h-4 w-4 text-[#1ED760]" />
                  {formatCompact(selectedArtist.followers)}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#121622] p-3.5">
                <span className="text-[11px] text-slate-400">
                  Career Streams
                </span>
                <div className="mt-1 font-mono-tabular text-base font-extrabold text-sky-400">
                  {(selectedArtist.totalStreams / 1000).toFixed(1)}B
                </div>
              </div>
            </div>

            {/* 30-Day Listener Trajectory SVG */}
            <TrajectoryChart
              data={selectedArtist.history30d}
              positive={selectedArtist.dailyDelta >= 0}
              unitLabel="Monthly Listeners in Millions"
            />

            {/* Top Tracks by Artist (Playable!) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <Music className="h-4 w-4 text-[#1ED760]" /> Popular Tracks
                  (Click to Play)
                </h3>
                <span className="text-[11px] text-slate-400">
                  Daily / Total Streams
                </span>
              </div>

              <div className="space-y-2">
                {selectedArtist.topTracks.map((track, idx) => (
                  <div
                    key={track.id}
                    onClick={() =>
                      onPlayItem({
                        spotifyTrackId: track.spotifyTrackId,
                        title: track.title,
                        artistName: selectedArtist.name,
                        artistId: selectedArtist.id,
                        coverUrl: selectedArtist.avatar,
                        duration: track.duration,
                        dailyStreams: track.dailyStreams,
                      })
                    }
                    className="group flex items-center justify-between rounded-xl border border-white/10 bg-[#121622] p-3 hover:border-[#1ED760]/50 hover:bg-[#171C2B] transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1ED760]/15 text-[#1ED760] group-hover:bg-[#1ED760] group-hover:text-black transition"
                        title={`Play ${track.title}`}
                      >
                        <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                      </button>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-[#1ED760] truncate">
                          {idx + 1}. {track.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Released {track.releaseYear} • {track.duration}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <div className="font-mono-tabular text-xs font-extrabold text-white">
                        {formatNumber(track.dailyStreams)}{" "}
                        <span className="text-[10px] font-normal text-slate-400">
                          /day
                        </span>
                      </div>
                      <div className="font-mono-tabular text-[11px] text-slate-400">
                        {formatCompact(track.totalStreams)} total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Listener Cities */}
            <div className="space-y-2.5">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <MapPin className="h-4 w-4 text-[#1ED760]" /> Top Global
                Listener Hubs
              </h3>
              <div className="rounded-xl border border-white/10 bg-[#121622] p-3.5 space-y-2.5">
                {selectedArtist.topCities.map((city, i) => {
                  const maxCity =
                    selectedArtist.topCities[0]?.listeners || 1;
                  const pct = Math.round((city.listeners / maxCity) * 100);
                  return (
                    <div key={city.city} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">
                          #{i + 1} {city.city}{" "}
                          <span className="text-slate-400">
                            ({city.countryCode})
                          </span>
                        </span>
                        <span className="font-mono-tabular text-slate-300">
                          {formatNumber(city.listeners)} listeners
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[#1ED760]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SONG INSPECTOR */}
        {selectedSong && (
          <div className="p-5 space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#131824] p-5">
              <div className="flex items-center gap-4">
                <img
                  src={selectedSong.coverUrl}
                  alt={selectedSong.title}
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-white/20 shadow-xl"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#1ED760]/20 px-2 py-0.5 font-mono-tabular text-xs font-extrabold text-[#1ED760]">
                      CHART #{selectedSong.rank}
                    </span>
                    <span className="rounded-md bg-amber-400/20 px-2 py-0.5 font-mono-tabular text-xs font-bold text-amber-300">
                      PEAK #{selectedSong.peakRank}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-xl font-extrabold text-white truncate">
                    {selectedSong.title}
                  </h2>
                  <button
                    onClick={() => onInspectArtistById(selectedSong.artistId)}
                    className="text-sm font-semibold text-[#1ED760] hover:underline cursor-pointer"
                  >
                    {selectedSong.artistName} →
                  </button>
                  <p className="text-xs text-slate-400">
                    Album: {selectedSong.album} • {selectedSong.releaseYear}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2.5">
                <button
                  onClick={() =>
                    onPlayItem({
                      spotifyTrackId: selectedSong.spotifyTrackId,
                      title: selectedSong.title,
                      artistName: selectedSong.artistName,
                      artistId: selectedSong.artistId,
                      coverUrl: selectedSong.coverUrl,
                      duration: selectedSong.duration,
                      dailyStreams: selectedSong.dailyStreams,
                      bpm: selectedSong.audioFeatures.bpm,
                    })
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1ED760] px-4 py-2.5 text-xs font-extrabold text-black shadow-lg shadow-[#1ED760]/25 hover:bg-[#22e668] transition cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Play Song Now ({selectedSong.duration})
                </button>

                <a
                  href={`https://open.spotify.com/track/${selectedSong.spotifyTrackId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition"
                >
                  <span>Spotify</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Song Stat Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-[#121622] p-3.5">
                <span className="text-[11px] text-slate-400">
                  Daily Streams
                </span>
                <div className="mt-1 font-mono-tabular text-base font-extrabold text-white">
                  {formatNumber(selectedSong.dailyStreams)}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#121622] p-3.5">
                <span className="text-[11px] text-slate-400">24h Delta</span>
                <div
                  className={`mt-1 font-mono-tabular text-base font-extrabold ${
                    selectedSong.dailyDelta >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {formatDelta(selectedSong.dailyDelta)}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#121622] p-3.5">
                <span className="text-[11px] text-slate-400">
                  Total All-Time Streams
                </span>
                <div className="mt-1 font-mono-tabular text-base font-extrabold text-amber-300">
                  {formatNumber(selectedSong.totalStreams)}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#121622] p-3.5">
                <span className="text-[11px] text-slate-400">
                  Peak Daily Streams
                </span>
                <div className="mt-1 font-mono-tabular text-base font-extrabold text-sky-400">
                  {formatNumber(selectedSong.peakDailyStreams)}
                </div>
              </div>
            </div>

            {/* 30d Trajectory */}
            <TrajectoryChart
              data={selectedSong.history30d}
              positive={selectedSong.dailyDelta >= 0}
              unitLabel="Daily Streams in Millions"
            />

            {/* Audio DNA Bars */}
            <div className="space-y-3 rounded-xl border border-white/10 bg-[#121622] p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <Disc3 className="h-4 w-4 text-[#1ED760]" /> Spotify Audio
                  Features DNA
                </h3>
                <span className="rounded bg-[#1ED760]/15 px-2 py-0.5 font-mono-tabular text-xs font-bold text-[#1ED760]">
                  {selectedSong.audioFeatures.bpm} BPM
                </span>
              </div>

              {[
                {
                  label: "Danceability",
                  val: selectedSong.audioFeatures.danceability,
                  color: "bg-[#1ED760]",
                },
                {
                  label: "Energy & Intensity",
                  val: selectedSong.audioFeatures.energy,
                  color: "bg-emerald-400",
                },
                {
                  label: "Valence (Positivity / Mood)",
                  val: selectedSong.audioFeatures.valence,
                  color: "bg-sky-400",
                },
                {
                  label: "Acousticness",
                  val: selectedSong.audioFeatures.acousticness,
                  color: "bg-amber-400",
                },
              ].map((feat) => (
                <div key={feat.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{feat.label}</span>
                    <span className="font-mono-tabular font-bold text-white">
                      {feat.val}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${feat.color}`}
                      style={{ width: `${feat.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
