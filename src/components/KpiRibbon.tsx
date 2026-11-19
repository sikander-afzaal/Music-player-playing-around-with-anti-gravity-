"use client";

import React from "react";
import { Crown, TrendingUp, Globe2, Play } from "lucide-react";
import { ArtistStat } from "../types/spotify";
import {
  computeArtistKpis,
  formatCompact,
  formatDelta,
  formatNumber,
} from "../lib/filterEngine";
import { COUNTRIES } from "../data/spotifyData";

interface KpiRibbonProps {
  artists: ArtistStat[];
  countryCode: string;
  onSelectArtist: (artist: ArtistStat) => void;
  onPlayArtist: (artist: ArtistStat) => void;
}

export default function KpiRibbon({
  artists,
  countryCode,
  onSelectArtist,
  onPlayArtist,
}: KpiRibbonProps) {
  const kpis = computeArtistKpis(artists);
  const market =
    COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* #1 Leader */}
      <div
        onClick={() => kpis.leader && onSelectArtist(kpis.leader)}
        className="group flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#10131C]/90 p-5 hover:border-[#1ED760]/40 transition cursor-pointer"
      >
        <div className="flex items-center gap-4 min-w-0">
          {kpis.leader && (
            <img
              src={kpis.leader.avatar}
              alt={kpis.leader.name}
              className="h-14 w-14 rounded-2xl object-cover border border-white/15 shrink-0"
            />
          )}
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1ED760]">
              <Crown className="h-3.5 w-3.5" /> #1 Monthly Listeners
            </span>
            <div className="mt-0.5 text-lg font-extrabold text-white truncate">
              {kpis.leader?.name ?? "—"}
            </div>
            <div className="font-mono-tabular text-xs text-slate-400">
              {kpis.leader ? formatNumber(kpis.leader.monthlyListeners) : "0"}{" "}
              listeners
            </div>
          </div>
        </div>
        {kpis.leader && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlayArtist(kpis.leader!);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1ED760] text-black shadow-lg shadow-[#1ED760]/20 hover:scale-105 transition cursor-pointer"
            title="Play Top Hit"
          >
            <Play className="h-4 w-4 fill-current ml-0.5" />
          </button>
        )}
      </div>

      {/* Fastest Daily Riser */}
      <div
        onClick={() => kpis.topGainer && onSelectArtist(kpis.topGainer)}
        className="group flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#10131C]/90 p-5 hover:border-emerald-500/40 transition cursor-pointer"
      >
        <div className="flex items-center gap-4 min-w-0">
          {kpis.topGainer && (
            <img
              src={kpis.topGainer.avatar}
              alt={kpis.topGainer.name}
              className="h-14 w-14 rounded-2xl object-cover border border-white/15 shrink-0"
            />
          )}
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" /> Top 24h Gainer
            </span>
            <div className="mt-0.5 text-lg font-extrabold text-white truncate">
              {kpis.topGainer?.name ?? "—"}
            </div>
            <div className="font-mono-tabular text-xs font-bold text-emerald-400">
              {kpis.topGainer
                ? `${formatDelta(kpis.topGainer.dailyDelta)} today`
                : "0"}
            </div>
          </div>
        </div>
      </div>

      {/* Market Overview */}
      <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#10131C]/90 p-5">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Globe2 className="h-3.5 w-3.5 text-[#1ED760]" /> Active Market
          </span>
          <div className="mt-0.5 text-lg font-extrabold text-white">
            {market.flag} {market.name}
          </div>
          <div className="font-mono-tabular text-xs text-slate-400">
            {artists.length} tracked • {formatCompact(kpis.totalListeners)} total reach
          </div>
        </div>
      </div>
    </div>
  );
}
