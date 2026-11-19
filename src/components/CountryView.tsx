"use client";

import React from "react";
import {
  Globe2,
  Play,
  Users,
  BarChart3,
  ArrowRight,
  Flame,
} from "lucide-react";
import { COUNTRIES, TOP_ARTISTS, TOP_SONGS } from "../data/spotifyData";
import { ArtistStat, SongStat } from "../types/spotify";
import {
  DEFAULT_FILTERS,
  filterAndSortArtists,
  filterAndSortSongs,
  formatDelta,
  formatNumber,
} from "../lib/filterEngine";

interface CountryViewProps {
  selectedCountry: string;
  onSelectCountry: (code: string) => void;
  onSelectArtist: (artist: ArtistStat) => void;
  onPlayArtist: (artist: ArtistStat) => void;
  onSelectSong: (song: SongStat) => void;
  onPlaySong: (song: SongStat) => void;
  onJumpToArtistsWithCountry: (code: string) => void;
}

export default function CountryView({
  selectedCountry,
  onSelectCountry,
  onSelectArtist,
  onPlayArtist,
  onSelectSong,
  onPlaySong,
  onJumpToArtistsWithCountry,
}: CountryViewProps) {
  const activeMarket =
    COUNTRIES.find((c) => c.code === selectedCountry) || COUNTRIES[0];

  const regionalArtists = filterAndSortArtists(TOP_ARTISTS, {
    ...DEFAULT_FILTERS,
    country: activeMarket.code,
  }).slice(0, 8);

  const regionalSongs = filterAndSortSongs(TOP_SONGS, {
    ...DEFAULT_FILTERS,
    country: activeMarket.code,
  }).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Country Market Selector Cards */}
      <div className="rounded-2xl border border-white/10 bg-[#10131C] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
              <Globe2 className="h-5 w-5 text-[#1ED760]" />
              Regional Spotify Markets &amp; Territory Charts
            </h2>
            <p className="text-xs text-slate-400">
              Select a country below to inspect its regional listener share, top
              artists, and most streamed daily songs
            </p>
          </div>
          <button
            onClick={() => onJumpToArtistsWithCountry(activeMarket.code)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1ED760] px-3.5 py-2 text-xs font-extrabold text-black hover:bg-[#22e668] transition cursor-pointer"
          >
            <span>Open Full {activeMarket.name} Leaderboard</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {COUNTRIES.map((market) => {
            const active = market.code === activeMarket.code;
            return (
              <button
                key={market.code}
                onClick={() => onSelectCountry(market.code)}
                className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition cursor-pointer ${
                  active
                    ? "border-[#1ED760] bg-[#1ED760]/15 shadow-lg shadow-[#1ED760]/10"
                    : "border-white/10 bg-[#07080C] hover:border-white/25 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{market.flag}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono-tabular text-[10px] font-bold ${
                      active
                        ? "bg-[#1ED760] text-black"
                        : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {market.code}
                  </span>
                </div>
                <div className="mt-2.5">
                  <div className="font-bold text-xs text-white truncate">
                    {market.name}
                  </div>
                  <div className="mt-0.5 font-mono-tabular text-[11px] text-slate-400">
                    {market.activeListenersM}M users • {market.topGenre}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Market Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Artists in Selected Market */}
        <div className="rounded-2xl border border-white/10 bg-[#10131C] p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">{activeMarket.flag}</span>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Top Artists in {activeMarket.name}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Ranked by estimated monthly regional listeners
                </p>
              </div>
            </div>
            <Users className="h-4 w-4 text-[#1ED760]" />
          </div>

          <div className="space-y-2">
            {regionalArtists.map((artist, idx) => (
              <div
                key={artist.id}
                onClick={() => onSelectArtist(artist)}
                className="group flex items-center justify-between rounded-xl border border-white/5 bg-[#0A0C12] p-2.5 hover:border-[#1ED760]/40 hover:bg-[#141926] transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center font-mono-tabular text-xs font-extrabold text-[#1ED760]">
                    #{idx + 1}
                  </span>
                  <img
                    src={artist.avatar}
                    alt={artist.name}
                    className="h-10 w-10 rounded-xl object-cover border border-white/15"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white group-hover:text-[#1ED760] truncate">
                      {artist.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {artist.primaryGenre}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono-tabular text-xs font-extrabold text-white">
                      {formatNumber(artist.monthlyListeners)}
                    </div>
                    <div
                      className={`font-mono-tabular text-[11px] font-semibold ${
                        artist.dailyDelta >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {formatDelta(artist.dailyDelta)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayArtist(artist);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1ED760]/15 text-[#1ED760] hover:bg-[#1ED760] hover:text-black transition cursor-pointer"
                    title={`Play ${artist.name}`}
                  >
                    <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Songs in Selected Market */}
        <div className="rounded-2xl border border-white/10 bg-[#10131C] p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">{activeMarket.flag}</span>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Daily Top Tracks in {activeMarket.name}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Daily regional streams ({activeMarket.dailyStreamVolumeM}M
                  total market volume)
                </p>
              </div>
            </div>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>

          <div className="space-y-2">
            {regionalSongs.map((song, idx) => (
              <div
                key={song.id}
                onClick={() => onSelectSong(song)}
                className="group flex items-center justify-between rounded-xl border border-white/5 bg-[#0A0C12] p-2.5 hover:border-[#1ED760]/40 hover:bg-[#141926] transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center font-mono-tabular text-xs font-extrabold text-amber-300">
                    #{idx + 1}
                  </span>
                  <img
                    src={song.coverUrl}
                    alt={song.title}
                    className="h-10 w-10 rounded-xl object-cover border border-white/15"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white group-hover:text-[#1ED760] truncate">
                      {song.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {song.artistName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono-tabular text-xs font-extrabold text-white">
                      {formatNumber(song.dailyStreams)}
                    </div>
                    <div
                      className={`font-mono-tabular text-[11px] font-semibold ${
                        song.dailyDelta >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {formatDelta(song.dailyDelta)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlaySong(song);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1ED760] text-black hover:bg-[#22e668] transition cursor-pointer"
                    title={`Play ${song.title}`}
                  >
                    <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
