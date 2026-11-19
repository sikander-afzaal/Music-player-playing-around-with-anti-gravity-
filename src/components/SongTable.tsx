"use client";

import React from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Play,
} from "lucide-react";
import {
  SongSortField,
  SongStat,
  ViewMode,
} from "../types/spotify";
import {
  formatDelta,
  formatNumber,
} from "../lib/filterEngine";

interface SongTableProps {
  songs: SongStat[];
  viewMode: ViewMode;
  sortField: SongSortField;
  sortOrder: "asc" | "desc";
  onSort: (field: SongSortField) => void;
  onSelectSong: (song: SongStat) => void;
  onPlaySong: (song: SongStat) => void;
  activeTrackId?: string;
  onResetFilters: () => void;
}

export default function SongTable({
  songs,
  viewMode,
  sortField,
  sortOrder,
  onSort,
  onSelectSong,
  onPlaySong,
  activeTrackId,
  onResetFilters,
}: SongTableProps) {
  const renderSortIcon = (field: SongSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-600" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#1ED760]" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#1ED760]" />
    );
  };

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#10131C] py-16 text-center">
        <p className="text-base font-bold text-white">
          No songs match your filter
        </p>
        <button
          onClick={onResetFilters}
          className="mt-4 rounded-xl bg-[#1ED760] px-4 py-2 text-xs font-bold text-black hover:bg-[#22e668] transition cursor-pointer"
        >
          Reset Filters
        </button>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {songs.map((song) => {
          const isPositive = song.dailyDelta >= 0;
          return (
            <div
              key={song.id}
              onClick={() => onSelectSong(song)}
              className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#10131C] p-5 hover:border-[#1ED760]/40 transition cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={song.coverUrl}
                    alt={song.title}
                    className="h-14 w-14 rounded-xl object-cover border border-white/15 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="font-mono-tabular text-xs font-bold text-[#1ED760]">
                      #{song.rank}
                    </span>
                    <h3 className="font-bold text-base text-white group-hover:text-[#1ED760] transition truncate">
                      {song.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">
                      {song.artistName}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlaySong(song);
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1ED760] text-black shadow-md hover:scale-105 transition cursor-pointer"
                  title={`Play ${song.title}`}
                >
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                </button>
              </div>

              <div className="mt-5 flex items-baseline justify-between border-t border-white/[0.06] pt-3.5">
                <div>
                  <div className="text-[11px] text-slate-400">Daily Streams</div>
                  <div className="font-mono-tabular text-sm font-bold text-white">
                    {formatNumber(song.dailyStreams)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">Daily +/-</div>
                  <div
                    className={`font-mono-tabular text-sm font-bold ${
                      isPositive ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatDelta(song.dailyDelta)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10131C]/90">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#0B0D14] text-xs font-semibold text-slate-400">
              <th className="py-4 pl-6 pr-3 w-16">
                <button
                  onClick={() => onSort("rank")}
                  className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                >
                  <span>#</span>
                  {renderSortIcon("rank")}
                </button>
              </th>
              <th className="py-4 px-4">
                <button
                  onClick={() => onSort("title")}
                  className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer"
                >
                  <span>Song</span>
                  {renderSortIcon("title")}
                </button>
              </th>
              <th className="py-4 px-4 text-right">
                <button
                  onClick={() => onSort("dailyStreams")}
                  className="inline-flex items-center justify-end gap-1.5 hover:text-white cursor-pointer ml-auto"
                >
                  <span>Daily Streams</span>
                  {renderSortIcon("dailyStreams")}
                </button>
              </th>
              <th className="py-4 px-4 text-right">
                <button
                  onClick={() => onSort("dailyDelta")}
                  className="inline-flex items-center justify-end gap-1.5 hover:text-white cursor-pointer ml-auto"
                >
                  <span>Daily +/-</span>
                  {renderSortIcon("dailyDelta")}
                </button>
              </th>
              <th className="py-4 px-4 text-center hidden sm:table-cell">
                <button
                  onClick={() => onSort("peakRank")}
                  className="inline-flex items-center justify-center gap-1 hover:text-white cursor-pointer mx-auto"
                >
                  <span>Peak</span>
                  {renderSortIcon("peakRank")}
                </button>
              </th>
              <th className="py-4 px-4 text-right hidden md:table-cell">
                <button
                  onClick={() => onSort("totalStreams")}
                  className="inline-flex items-center justify-end gap-1.5 hover:text-white cursor-pointer ml-auto"
                >
                  <span>Total Streams</span>
                  {renderSortIcon("totalStreams")}
                </button>
              </th>
              <th className="py-4 pl-4 pr-6 text-right w-20">Play</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] text-sm">
            {songs.map((song) => {
              const isPositive = song.dailyDelta >= 0;
              const isPlaying = song.spotifyTrackId === activeTrackId;

              return (
                <tr
                  key={song.id}
                  onClick={() => onSelectSong(song)}
                  className={`group transition cursor-pointer ${
                    isPlaying
                      ? "bg-[#1ED760]/10"
                      : "hover:bg-white/[0.03]"
                  }`}
                >
                  <td className="py-4 pl-6 pr-3 font-mono-tabular text-sm font-bold text-slate-400">
                    {song.rank}
                  </td>

                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="h-11 w-11 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                      <div>
                        <div className="font-bold text-base text-white group-hover:text-[#1ED760] transition">
                          {song.title}
                        </div>
                        <span className="text-xs text-slate-400">
                          {song.artistName}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4 text-right font-mono-tabular text-base font-bold text-white">
                    {formatNumber(song.dailyStreams)}
                  </td>

                  <td className="py-4 px-4 text-right font-mono-tabular text-sm font-semibold">
                    <span
                      className={
                        isPositive ? "text-emerald-400" : "text-rose-400"
                      }
                    >
                      {formatDelta(song.dailyDelta)}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-center font-mono-tabular text-sm text-slate-300 hidden sm:table-cell">
                    {song.peakRank}
                  </td>

                  <td className="py-4 px-4 text-right font-mono-tabular text-sm text-slate-400 hidden md:table-cell">
                    {formatNumber(song.totalStreams)}
                  </td>

                  <td
                    className="py-4 pl-4 pr-6 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onPlaySong(song)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white group-hover:bg-[#1ED760] group-hover:text-black transition cursor-pointer"
                      title={`Play ${song.title}`}
                    >
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
