"use client";

import React from "react";
import {
  RotateCcw,
  LayoutList,
  LayoutGrid,
  Flame,
  TrendingDown,
  Trophy,
  Globe,
} from "lucide-react";
import { COUNTRIES, GENRES } from "../data/spotifyData";
import { FilterState, MomentumFilter } from "../types/spotify";

interface FilterBarProps {
  filters: FilterState;
  onChange: (updated: Partial<FilterState>) => void;
  onReset: () => void;
  totalCount: number;
  mode: "artists" | "songs";
}

export default function FilterBar({
  filters,
  onChange,
  onReset,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.genre !== "All" ||
    filters.country !== "GLOBAL" ||
    filters.momentum !== "all";

  const momentumOptions: {
    id: MomentumFilter;
    label: string;
    icon?: React.ReactNode;
  }[] = [
    { id: "all", label: "All" },
    {
      id: "gainers",
      label: "Gainers (+)",
      icon: <Flame className="h-3.5 w-3.5 text-emerald-400" />,
    },
    {
      id: "losers",
      label: "Losers (-)",
      icon: <TrendingDown className="h-3.5 w-3.5 text-rose-400" />,
    },
    {
      id: "peak",
      label: "#1 Peak",
      icon: <Trophy className="h-3.5 w-3.5 text-amber-400" />,
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#10131C]/90 px-4 py-3">
      {/* Left: Clean Genre Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {GENRES.map((g) => {
          const active = filters.genre === g;
          return (
            <button
              key={g}
              onClick={() => onChange({ genre: g })}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                active
                  ? "bg-[#1ED760] text-black shadow-sm"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>

      {/* Right: Momentum, Country & View Mode */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Momentum Filter */}
        <div className="flex items-center gap-1 rounded-xl bg-[#07080C] p-1 border border-white/[0.06]">
          {momentumOptions.map((m) => {
            const active = filters.momentum === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onChange({ momentum: m.id })}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Country Market Dropdown */}
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#07080C] px-3 py-1.5">
          <Globe className="h-3.5 w-3.5 text-[#1ED760]" />
          <select
            value={filters.country}
            onChange={(e) => onChange({ country: e.target.value })}
            className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-[#10131C]">
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center rounded-xl border border-white/[0.08] bg-[#07080C] p-1">
          <button
            onClick={() => onChange({ viewMode: "table" })}
            className={`rounded-lg p-1.5 transition cursor-pointer ${
              filters.viewMode === "table"
                ? "bg-[#1ED760] text-black"
                : "text-slate-400 hover:text-white"
            }`}
            title="Table View"
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChange({ viewMode: "grid" })}
            className={`rounded-lg p-1.5 transition cursor-pointer ${
              filters.viewMode === "grid"
                ? "bg-[#1ED760] text-black"
                : "text-slate-400 hover:text-white"
            }`}
            title="Card Grid View"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
