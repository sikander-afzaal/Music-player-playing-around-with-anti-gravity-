import { COUNTRIES } from "../data/spotifyData";
import { ArtistStat, FilterState, SongStat } from "../types/spotify";

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  genre: "All",
  country: "GLOBAL",
  momentum: "all",
  tier: "all",
  era: "all",
  viewMode: "table",
  artistSortField: "rank",
  artistSortOrder: "asc",
  songSortField: "rank",
  songSortOrder: "asc",
};

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return String(Math.round(n));
}

export function formatDelta(n: number): string {
  const rounded = Math.round(n);
  if (rounded > 0) {
    return `+${rounded.toLocaleString("en-US")}`;
  }
  return rounded.toLocaleString("en-US");
}

export function applyCountryToArtist(
  artist: ArtistStat,
  countryCode: string
): ArtistStat {
  if (!countryCode || countryCode === "GLOBAL") {
    return artist;
  }
  const market = COUNTRIES.find((c) => c.code === countryCode);
  const share = market ? market.shareFactor : 0.1;
  const affinity = artist.countryMultipliers?.[countryCode] ?? 0.92;
  const factor = share * affinity;

  return {
    ...artist,
    monthlyListeners: Math.round(artist.monthlyListeners * factor),
    dailyDelta: Math.round(artist.dailyDelta * factor),
    peakListeners: Math.round(artist.peakListeners * factor),
  };
}

export function applyCountryToSong(
  song: SongStat,
  countryCode: string
): SongStat {
  if (!countryCode || countryCode === "GLOBAL") {
    return song;
  }
  const market = COUNTRIES.find((c) => c.code === countryCode);
  const share = market ? market.shareFactor : 0.1;
  const affinity = song.countryMultipliers?.[countryCode] ?? 0.92;
  const factor = share * affinity;

  return {
    ...song,
    dailyStreams: Math.round(song.dailyStreams * factor),
    dailyDelta: Math.round(song.dailyDelta * factor),
  };
}

export function filterAndSortArtists(
  artists: ArtistStat[],
  filters: FilterState
): ArtistStat[] {
  const query = filters.search.trim().toLowerCase();

  // 1. Apply regional scaling if a specific country is chosen
  let list = artists.map((a) => applyCountryToArtist(a, filters.country));

  // If country is not GLOBAL, re-rank based on regional monthly listeners
  if (filters.country && filters.country !== "GLOBAL") {
    const byListeners = [...list].sort(
      (a, b) => b.monthlyListeners - a.monthlyListeners
    );
    const rankMap = new Map<string, number>();
    byListeners.forEach((item, idx) => rankMap.set(item.id, idx + 1));
    list = list.map((a) => ({
      ...a,
      rank: rankMap.get(a.id) ?? a.rank,
    }));
  }

  // 2. Filter
  const filtered = list.filter((artist) => {
    if (query) {
      const nameMatch = artist.name.toLowerCase().includes(query);
      const genreMatch = artist.genres.some((g) =>
        g.toLowerCase().includes(query)
      );
      const trackMatch = artist.topTracks.some((t) =>
        t.title.toLowerCase().includes(query)
      );
      if (!nameMatch && !genreMatch && !trackMatch) return false;
    }

    if (filters.genre && filters.genre !== "All") {
      const target = filters.genre.toLowerCase();
      const hasGenre =
        artist.primaryGenre.toLowerCase() === target ||
        artist.genres.some((g) => g.toLowerCase().includes(target));
      if (!hasGenre) return false;
    }

    if (filters.momentum === "gainers" && artist.dailyDelta <= 0) return false;
    if (filters.momentum === "losers" && artist.dailyDelta >= 0) return false;
    if (filters.momentum === "peak" && artist.peakRank !== 1) return false;
    if (filters.momentum === "surge" && artist.dailyDelta < 100000)
      return false;

    // Listener tier filter (based on global scale or relative)
    if (filters.tier === "mega" && artist.monthlyListeners < 90_000_000)
      return false;
    if (
      filters.tier === "superstar" &&
      (artist.monthlyListeners < 72_000_000 ||
        artist.monthlyListeners >= 90_000_000)
    )
      return false;
    if (filters.tier === "rising" && artist.monthlyListeners >= 72_000_000)
      return false;

    if (filters.era !== "all" && artist.debutEra !== filters.era) return false;

    return true;
  });

  // 3. Sort
  const dir = filters.artistSortOrder === "asc" ? 1 : -1;
  const field = filters.artistSortField;

  return [...filtered].sort((a, b) => {
    if (field === "name") {
      return a.name.localeCompare(b.name) * dir;
    }
    const valA = a[field] as number;
    const valB = b[field] as number;
    return (valA - valB) * dir;
  });
}

export function filterAndSortSongs(
  songs: SongStat[],
  filters: FilterState
): SongStat[] {
  const query = filters.search.trim().toLowerCase();

  let list = songs.map((s) => applyCountryToSong(s, filters.country));

  if (filters.country && filters.country !== "GLOBAL") {
    const byStreams = [...list].sort(
      (a, b) => b.dailyStreams - a.dailyStreams
    );
    const rankMap = new Map<string, number>();
    byStreams.forEach((item, idx) => rankMap.set(item.id, idx + 1));
    list = list.map((s) => ({
      ...s,
      rank: rankMap.get(s.id) ?? s.rank,
    }));
  }

  const filtered = list.filter((song) => {
    if (query) {
      const titleMatch = song.title.toLowerCase().includes(query);
      const artistMatch = song.artistName.toLowerCase().includes(query);
      const albumMatch = song.album.toLowerCase().includes(query);
      if (!titleMatch && !artistMatch && !albumMatch) return false;
    }

    if (filters.genre && filters.genre !== "All") {
      if (song.genre.toLowerCase() !== filters.genre.toLowerCase()) {
        return false;
      }
    }

    if (filters.momentum === "gainers" && song.dailyDelta <= 0) return false;
    if (filters.momentum === "losers" && song.dailyDelta >= 0) return false;
    if (filters.momentum === "peak" && song.peakRank !== 1) return false;
    if (filters.momentum === "surge" && song.dailyDelta < 100000) return false;

    if (filters.era !== "all" && song.era !== filters.era) return false;

    return true;
  });

  const dir = filters.songSortOrder === "asc" ? 1 : -1;
  const field = filters.songSortField;

  return [...filtered].sort((a, b) => {
    if (field === "title") {
      return a.title.localeCompare(b.title) * dir;
    }
    const valA = a[field] as number;
    const valB = b[field] as number;
    return (valA - valB) * dir;
  });
}

export function computeArtistKpis(artists: ArtistStat[]) {
  if (artists.length === 0) {
    return {
      leader: null,
      topGainer: null,
      biggestDrop: null,
      totalListeners: 0,
      avgDailyDelta: 0,
    };
  }

  const byListeners = [...artists].sort(
    (a, b) => b.monthlyListeners - a.monthlyListeners
  );
  const byGain = [...artists].sort((a, b) => b.dailyDelta - a.dailyDelta);
  const byDrop = [...artists].sort((a, b) => a.dailyDelta - b.dailyDelta);

  const totalListeners = artists.reduce(
    (acc, a) => acc + a.monthlyListeners,
    0
  );
  const avgDailyDelta = Math.round(
    artists.reduce((acc, a) => acc + a.dailyDelta, 0) / artists.length
  );

  return {
    leader: byListeners[0],
    topGainer: byGain[0],
    biggestDrop: byDrop[0],
    totalListeners,
    avgDailyDelta,
  };
}
