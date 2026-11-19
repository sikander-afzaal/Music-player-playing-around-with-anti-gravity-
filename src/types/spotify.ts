export type MomentumFilter = "all" | "gainers" | "losers" | "peak" | "surge";
export type ListenerTierFilter = "all" | "mega" | "superstar" | "rising";
export type EraFilter = "all" | "2020s" | "2010s" | "2000s" | "classics";
export type ViewMode = "table" | "grid";
export type DashboardTab =
  | "artists"
  | "songs"
  | "countries"
  | "compare"
  | "vault"
  | "youtube";

export type ArtistSortField =
  | "rank"
  | "name"
  | "monthlyListeners"
  | "dailyDelta"
  | "peakRank"
  | "peakListeners"
  | "followers"
  | "totalStreams";

export type SongSortField =
  | "rank"
  | "title"
  | "dailyStreams"
  | "dailyDelta"
  | "totalStreams"
  | "peakRank"
  | "releaseYear";

export interface TopCityMarket {
  city: string;
  countryCode: string;
  listeners: number;
}

export interface ArtistTopTrack {
  id: string;
  spotifyTrackId: string;
  title: string;
  dailyStreams: number;
  totalStreams: number;
  dailyDelta: number;
  releaseYear: number;
  duration: string;
}

export interface ArtistStat {
  id: string;
  spotifyArtistId: string;
  rank: number;
  name: string;
  avatar: string;
  bannerColor: string;
  verified: boolean;
  monthlyListeners: number;
  dailyDelta: number;
  peakRank: number;
  peakListeners: number;
  followers: number;
  totalStreams: number; // in millions
  leadStreams: number; // in millions
  genres: string[];
  primaryGenre: string;
  countryOrigin: string;
  debutEra: "2020s" | "2010s" | "2000s" | "classics";
  history30d: number[]; // 30-day monthly listeners in millions
  topCities: TopCityMarket[];
  topTracks: ArtistTopTrack[];
  countryMultipliers?: Record<string, number>;
}

export interface AudioFeatures {
  danceability: number; // 0-100
  energy: number; // 0-100
  valence: number; // 0-100
  acousticness: number; // 0-100
  bpm: number;
}

export interface SongStat {
  id: string;
  spotifyTrackId: string;
  rank: number;
  title: string;
  artistId: string;
  artistName: string;
  featuring?: string;
  album: string;
  coverUrl: string;
  dailyStreams: number;
  dailyDelta: number;
  totalStreams: number; // total all-time streams
  peakRank: number;
  peakDailyStreams: number;
  releaseYear: number;
  era: "2020s" | "2010s" | "2000s" | "classics";
  genre: string;
  duration: string;
  history30d: number[]; // daily streams in millions
  audioFeatures: AudioFeatures;
  countryMultipliers?: Record<string, number>;
  addedAt?: string;
  addedAtMs?: number;
}

export interface CountryMarket {
  code: string;
  name: string;
  flag: string;
  region: string;
  shareFactor: number;
  activeListenersM: number;
  topGenre: string;
  dailyStreamVolumeM: number;
}

export interface FilterState {
  search: string;
  genre: string;
  country: string; // "GLOBAL" or ISO code like "US", "UK", "BR"
  momentum: MomentumFilter;
  tier: ListenerTierFilter;
  era: EraFilter;
  viewMode: ViewMode;
  artistSortField: ArtistSortField;
  artistSortOrder: "asc" | "desc";
  songSortField: SongSortField;
  songSortOrder: "asc" | "desc";
}

export interface PlayableItem {
  spotifyTrackId: string;
  youtubeVideoId?: string;
  source?: "spotify" | "youtube";
  title: string;
  artistName: string;
  artistId?: string;
  coverUrl: string;
  duration?: string;
  dailyStreams?: number;
  bpm?: number;
  viewsText?: string;
}

export interface GoogleUserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string;
}

export interface YouTubeTrackItem {
  videoId: string;
  title: string;
  artistName: string;
  coverUrl: string;
  duration: string;
  viewsText: string;
  publishedText?: string;
}

export interface YouTubePlaylistItem {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  itemCount: number;
  channelTitle: string;
}

export interface SpotifyUserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  country: string;
  product: "premium" | "free" | "demo";
  followers: number;
  isDemo: boolean;
}

export interface SpotifyPlaylistItem {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  trackCount: number;
  ownerName: string;
  isPublic: boolean;
  lastPlayedAtMs?: number;
  lastPlayedLabel?: string;
}

export interface PersonalVaultData {
  topArtistsByRange: {
    short_term: ArtistStat[];
    medium_term: ArtistStat[];
    long_term: ArtistStat[];
  };
  topTracksByRange: {
    short_term: SongStat[];
    medium_term: SongStat[];
    long_term: SongStat[];
  };
  recentlyPlayed: {
    song: SongStat;
    playedAt: string;
  }[];
  likedSongs?: SongStat[];
  likedSongsTotal?: number;
  playlists?: SpotifyPlaylistItem[];
  needsLibraryScope?: boolean;
  minutesListened30d: number;
  topGenres: { genre: string; percentage: number; color: string }[];
  audioDna: AudioFeatures;
}
