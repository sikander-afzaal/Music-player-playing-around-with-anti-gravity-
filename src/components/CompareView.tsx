"use client";

import React from "react";
import {
  Scale,
  Plus,
  X,
  Trophy,
  Play,
  Crown,
} from "lucide-react";
import { TOP_ARTISTS } from "../data/spotifyData";
import { ArtistStat } from "../types/spotify";
import {
  formatCompact,
  formatDelta,
  formatNumber,
} from "../lib/filterEngine";

interface CompareViewProps {
  compareIds: string[];
  onToggleCompare: (artistId: string) => void;
  onSelectArtist: (artist: ArtistStat) => void;
  onPlayArtist: (artist: ArtistStat) => void;
}

const COMPARE_COLORS = ["#1ED760", "#38BDF8", "#F59E0B"];

export default function CompareView({
  compareIds,
  onToggleCompare,
  onSelectArtist,
  onPlayArtist,
}: CompareViewProps) {
  const selectedArtists = compareIds
    .map((id) => TOP_ARTISTS.find((a) => a.id === id))
    .filter((a): a is ArtistStat => Boolean(a));

  const maxListeners = Math.max(
    ...selectedArtists.map((a) => a.monthlyListeners),
    1
  );
  const maxPeak = Math.max(
    ...selectedArtists.map((a) => a.peakListeners),
    1
  );
  const maxFollowers = Math.max(
    ...selectedArtists.map((a) => a.followers),
    1
  );
  const maxStreams = Math.max(
    ...selectedArtists.map((a) => a.totalStreams),
    1
  );

  // Overlaid SVG chart calculations
  const allPoints = selectedArtists.flatMap((a) => a.history30d);
  const minVal = allPoints.length ? Math.min(...allPoints) : 0;
  const maxVal = allPoints.length ? Math.max(...allPoints) : 100;
  const range = maxVal - minVal || 1;
  const width = 760;
  const height = 220;
  const pad = 18;

  return (
    <div className="space-y-6">
      {/* Artist Selector Header */}
      <div className="rounded-2xl border border-white/10 bg-[#10131C] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
              <Scale className="h-5 w-5 text-[#1ED760]" />
              Head-to-Head Artist Intelligence Arena
            </h2>
            <p className="text-xs text-slate-400">
              Compare up to 3 artists side-by-side across Monthly Listeners,
              Daily Velocity, Peak Records, and 30-Day Trajectories
            </p>
          </div>

          {/* Add Artist Dropdown */}
          {selectedArtists.length < 3 && (
            <div className="flex items-center gap-2 rounded-xl border border-[#1ED760]/40 bg-[#07080C] px-3 py-2">
              <Plus className="h-4 w-4 text-[#1ED760]" />
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) onToggleCompare(e.target.value);
                }}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-[#10131C]">
                  + Add Artist to Compare ({selectedArtists.length}/3)...
                </option>
                {TOP_ARTISTS.filter((a) => !compareIds.includes(a.id)).map(
                  (a) => (
                    <option key={a.id} value={a.id} className="bg-[#10131C]">
                      #{a.rank} {a.name} ({formatCompact(a.monthlyListeners)})
                    </option>
                  )
                )}
              </select>
            </div>
          )}
        </div>

        {/* Quick Preset Matchups */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3.5 text-xs">
          <span className="text-slate-400 font-medium">Quick Rivalry Presets:</span>
          {[
            {
              label: "Bruno Mars vs The Weeknd vs Rihanna",
              ids: ["bruno-mars", "the-weeknd", "rihanna"],
            },
            {
              label: "Kendrick Lamar vs Drake vs Travis Scott",
              ids: ["kendrick-lamar", "drake", "travis-scott"],
            },
            {
              label: "Taylor Swift vs Ariana Grande vs Billie Eilish",
              ids: ["taylor-swift", "ariana-grande", "billie-eilish"],
            },
            {
              label: "Bad Bunny vs KAROL G vs Shakira",
              ids: ["bad-bunny", "karol-g", "shakira"],
            },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                // Replace current compare list with preset
                compareIds.forEach((id) => onToggleCompare(id));
                preset.ids.forEach((id) => onToggleCompare(id));
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-[#1ED760]/40 hover:text-white transition cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-Side Contender Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {selectedArtists.map((artist, idx) => {
          const color = COMPARE_COLORS[idx % COMPARE_COLORS.length];
          const isLeader = artist.monthlyListeners === maxListeners;

          return (
            <div
              key={artist.id}
              className="relative rounded-2xl border border-white/10 bg-[#10131C] p-5 space-y-4 overflow-hidden"
              style={{ borderTop: `3px solid ${color}` }}
            >
              <div className="flex items-start justify-between">
                <div
                  onClick={() => onSelectArtist(artist)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <img
                    src={artist.avatar}
                    alt={artist.name}
                    className="h-14 w-14 rounded-2xl object-cover border border-white/15"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-mono-tabular text-xs font-bold text-slate-400">
                        WORLD #{artist.rank}
                      </span>
                      {isLeader && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          <Crown className="h-2.5 w-2.5" /> LEADER
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-extrabold text-white group-hover:text-[#1ED760] transition">
                      {artist.name}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {artist.genres.join(" • ")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onPlayArtist(artist)}
                    className="rounded-lg bg-[#1ED760] p-2 text-black hover:bg-[#22e668] transition cursor-pointer"
                    title={`Play ${artist.name}`}
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </button>
                  {selectedArtists.length > 1 && (
                    <button
                      onClick={() => onToggleCompare(artist.id)}
                      className="rounded-lg bg-white/5 p-2 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition cursor-pointer"
                      title="Remove from compare"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Metric Comparison Bars */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Monthly Listeners</span>
                    <span className="font-mono-tabular font-extrabold text-white">
                      {formatNumber(artist.monthlyListeners)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round(
                          (artist.monthlyListeners / maxListeners) * 100
                        )}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">All-Time Peak Listeners</span>
                    <span className="font-mono-tabular font-bold text-amber-300">
                      {formatNumber(artist.peakListeners)} (#{artist.peakRank})
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{
                        width: `${Math.round(
                          (artist.peakListeners / maxPeak) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Career Total Streams</span>
                    <span className="font-mono-tabular font-bold text-sky-400">
                      {(artist.totalStreams / 1000).toFixed(1)}B
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-400"
                      style={{
                        width: `${Math.round(
                          (artist.totalStreams / maxStreams) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Spotify Followers</span>
                    <span className="font-mono-tabular font-bold text-slate-200">
                      {formatCompact(artist.followers)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-400"
                      style={{
                        width: `${Math.round(
                          (artist.followers / maxFollowers) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 p-2.5 text-xs">
                  <span className="text-slate-400">24h Daily Velocity</span>
                  <span
                    className={`font-mono-tabular font-extrabold ${
                      artist.dailyDelta >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {formatDelta(artist.dailyDelta)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overlaid 30-Day Listener Trajectory Comparison Chart */}
      {selectedArtists.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#10131C] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Overlaid 30-Day Monthly Listener Trajectory (Millions)
              </h3>
              <p className="text-xs text-slate-400">
                Direct visual comparison of listener momentum over the last 30
                days
              </p>
            </div>
            <div className="flex items-center gap-4">
              {selectedArtists.map((artist, idx) => (
                <div key={artist.id} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        COMPARE_COLORS[idx % COMPARE_COLORS.length],
                    }}
                  />
                  <span className="font-bold text-white">{artist.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#080A0F] p-4">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-56 overflow-visible"
            >
              {/* Grid lines */}
              {[0.2, 0.5, 0.8].map((ratio, idx) => (
                <line
                  key={idx}
                  x1={pad}
                  x2={width - pad}
                  y1={pad + ratio * (height - pad * 2)}
                  y2={pad + ratio * (height - pad * 2)}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 4"
                />
              ))}

              {selectedArtists.map((artist, idx) => {
                const color = COMPARE_COLORS[idx % COMPARE_COLORS.length];
                const pts = artist.history30d
                  .map((val, i) => {
                    const x =
                      pad +
                      (i / (artist.history30d.length - 1)) *
                        (width - pad * 2);
                    const y =
                      height -
                      pad -
                      ((val - minVal) / range) * (height - pad * 2);
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ");

                return (
                  <g key={artist.id}>
                    <polyline
                      fill="none"
                      stroke={color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={pts}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
