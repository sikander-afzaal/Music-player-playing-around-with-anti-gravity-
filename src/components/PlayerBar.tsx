"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Maximize2,
  X,
  Mic2,
  ExternalLink,
  Loader2,
  Volume2,
} from "lucide-react";
import { PlayableItem } from "../types/spotify";

/* -------------------------------------------------------------------------- */
/* Spotify iFrame API + YouTube IFrame API typings                             */
/* -------------------------------------------------------------------------- */
interface PlaybackUpdateEvent {
  data: {
    isPaused: boolean;
    isBuffering: boolean;
    duration: number; // ms
    position: number; // ms
  };
}

interface EmbedController {
  loadUri: (uri: string, preferVideo?: boolean, startAt?: number) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  destroy?: () => void;
  addListener: (event: string, cb: (e: PlaybackUpdateEvent) => void) => void;
}

interface SpotifyIFrameAPI {
  createController: (
    el: HTMLElement,
    opts: { uri: string; width?: number | string; height?: number | string },
    cb: (controller: EmbedController) => void
  ) => void;
}

interface YTPlayerInstance {
  loadVideoById: (
    videoIdOrConfig:
      | string
      | { videoId: string; startSeconds?: number; endSeconds?: number }
  ) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  mute?: () => void;
  unMute?: () => void;
  isMuted?: () => boolean;
  setVolume?: (volume: number) => void;
  getVolume?: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy?: () => void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
    __pulseifySpotifyApi?: SpotifyIFrameAPI;
    onYouTubeIframeAPIReady?: () => void;
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId?: string;
          host?: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YTPlayerInstance }) => void;
            onStateChange?: (e: {
              data: number;
              target: YTPlayerInstance;
            }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
      };
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */
interface LyricLine {
  time: number | null; // seconds
  text: string;
}

interface LrcLibItem {
  trackName?: string;
  artistName?: string;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  duration?: number;
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*[([][^)\]]*[)\]]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titlesMatchStrictly(a?: string, b?: string): boolean {
  const na = normalizeForMatch(a || "");
  const nb = normalizeForMatch(b || "");
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) {
    return true;
  }
  const wordsA = na.split(" ").filter((w) => w.length >= 3);
  const wordsB = nb.split(" ").filter((w) => w.length >= 3);
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  const overlap = wordsA.filter((w) => wordsB.includes(w));
  return overlap.length >= Math.min(wordsA.length, wordsB.length);
}

function fmt(ms: number): string {
  if (!ms || ms < 0 || !Number.isFinite(ms)) return "0:00";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function parseDurationSec(d?: string): number {
  if (!d) return 0;
  const parts = d.split(":").map(Number);
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function cleanForSearch(title: string, artist: string) {
  const cleanTitle = title
    .replace(/\s*[([](feat\.?|ft\.?|with)[^)\]]*[)\]]/gi, "")
    .replace(/\s+-\s+.*$/, "")
    .trim();
  const primaryArtist = artist.split(/,|&| feat\.? | x /i)[0].trim();
  return { cleanTitle, primaryArtist };
}

function parseLyrics(raw: string, synced: boolean): LyricLine[] {
  return raw
    .split("\n")
    .map((line) => {
      const m = line.match(
        /^\s*\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)$/
      );
      if (m) {
        const frac = m[3] ? Number(`0.${m[3]}`) : 0;
        return {
          time: Number(m[1]) * 60 + Number(m[2]) + frac,
          text: m[4].trim(),
        };
      }
      return { time: null, text: line.trim() };
    })
    .filter((l) => l.text.length > 0)
    .map((l) => (synced ? l : { ...l, time: null }));
}

/* -------------------------------------------------------------------------- */
/* Seek bar                                                                    */
/* -------------------------------------------------------------------------- */
function SeekBar({
  position,
  duration,
  onSeek,
  accent = "emerald",
}: {
  position: number;
  duration: number;
  onSeek: (fraction: number) => void;
  accent?: "emerald" | "rose";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <div
      ref={ref}
      onClick={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        onSeek(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
      }}
      className="group relative flex h-4 w-full cursor-pointer items-center"
    >
      <div className="relative h-1 w-full rounded-full bg-white/15 transition-all group-hover:h-1.5">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${
            accent === "rose"
              ? "bg-gradient-to-r from-rose-500 to-amber-400 shadow-[0_0_12px_rgba(244,63,94,0.55)]"
              : "bg-gradient-to-r from-[#1ED760] to-emerald-300 shadow-[0_0_12px_rgba(30,215,96,0.55)]"
          }`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Player                                                                      */
/* -------------------------------------------------------------------------- */
interface PlayerBarProps {
  currentTrack: PlayableItem | null;
  onNext: () => void;
  onPrev: () => void;
  onInspectArtist?: (artistId: string) => void;
}

interface PlaybackState {
  isPaused: boolean;
  isBuffering: boolean;
  duration: number;
  position: number;
  at: number;
}

export default function PlayerBar({
  currentTrack,
  onNext,
  onPrev,
  onInspectArtist,
}: PlayerBarProps) {
  // Automatically determined from where the track was played ("spotify" vs "youtube")
  const engine: "spotify" | "youtube" =
    currentTrack?.source === "youtube" ? "youtube" : "spotify";
  const resolvedYtId = currentTrack?.youtubeVideoId || null;

  /* ---------------------------- Spotify engine ---------------------------- */
  const embedWrapRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<EmbedController | null>(null);
  const loadedUriRef = useRef<string | null>(null);
  const pendingRef = useRef<{ uri: string; autoplay: boolean } | null>(null);
  const lastTrackObjRef = useRef<PlayableItem | null>(null);
  const trackRef = useRef<PlayableItem | null>(currentTrack);
  const onNextRef = useRef(onNext);
  const endedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const lastPosRef = useRef(0);
  const engineRef = useRef(engine);

  /* ---------------------------- YouTube engine ---------------------------- */
  // Single persistent YT.Player mounted directly inside the 9:16 Canvas Card!
  // Zero duplicate iframes, zero mute=1 conflicts, 100% real video + unmuted audio.
  const ytHostWrapRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const ytReadyRef = useRef(false);
  const pendingYtIdRef = useRef<string | null>(null);
  const [ytReadyState, setYtReadyState] = useState(false);
  // Only reveal the YouTube video layer 450ms AFTER it enters PLAYING (state === 1)
  // so YouTube's center pause/play bezel icon (||) or buffer spinner is NEVER visible!
  const [ytVisualPlaying, setYtVisualPlaying] = useState(false);
  const bezelTimerRef = useRef<number | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [playback, setPlayback] = useState<PlaybackState>({
    isPaused: true,
    isBuffering: false,
    duration: 0,
    position: 0,
    at: 0,
  });
  const [now, setNow] = useState(0);

  // Canvas Frosted Glass state
  const [frostLevel, setFrostLevel] = useState<"soft" | "deep" | "clear">(
    "soft"
  );
  const [clipIdx, setClipIdx] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);
  useEffect(() => {
    trackRef.current = currentTrack;
  }, [currentTrack]);
  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  const forceUnmuteYouTube = (p?: YTPlayerInstance | null) => {
    const target = p || ytPlayerRef.current;
    if (!target) return;
    try {
      target.unMute?.();
      target.setVolume?.(100);
    } catch {
      // ignore
    }
  };

  // 1. Initialize Spotify iFrame API
  useEffect(() => {
    const wrap = embedWrapRef.current;
    if (!wrap) return;
    let cancelled = false;
    const host = document.createElement("div");
    wrap.appendChild(host);

    const init = (api: SpotifyIFrameAPI) => {
      if (cancelled) return;
      const initialUri = `spotify:track:${
        trackRef.current?.spotifyTrackId ?? "2plbrEY59IikOBgBGLjaoe"
      }`;
      api.createController(
        host,
        { uri: initialUri, width: 300, height: 80 },
        (controller) => {
          if (cancelled) {
            controller.destroy?.();
            return;
          }
          controllerRef.current = controller;
          loadedUriRef.current = initialUri;

          controller.addListener("ready", () => {
            setIsReady(true);
            const pending = pendingRef.current;
            if (pending && engineRef.current === "spotify") {
              if (pending.uri !== loadedUriRef.current) {
                controller.loadUri(pending.uri);
                loadedUriRef.current = pending.uri;
              }
              if (pending.autoplay) controller.play();
              pendingRef.current = null;
            }
          });

          controller.addListener("playback_update", (e) => {
            if (engineRef.current !== "spotify") return;
            const { isPaused, isBuffering, duration, position } = e.data;
            const ended =
              hasStartedRef.current &&
              isPaused &&
              duration > 0 &&
              (position >= duration - 800 ||
                lastPosRef.current >= duration - 1500);

            if (!isPaused) hasStartedRef.current = true;
            lastPosRef.current = position;

            setPlayback({
              isPaused,
              isBuffering,
              duration,
              position,
              at: performance.now(),
            });

            if (ended && !endedRef.current) {
              endedRef.current = true;
              onNextRef.current();
            }
          });
        }
      );
    };

    if (window.__pulseifySpotifyApi) {
      init(window.__pulseifySpotifyApi);
    } else {
      window.onSpotifyIframeApiReady = (api) => {
        window.__pulseifySpotifyApi = api;
        init(api);
      };
      if (!document.getElementById("spotify-iframe-api")) {
        const s = document.createElement("script");
        s.id = "spotify-iframe-api";
        s.src = "https://open.spotify.com/embed/iframe-api/v1";
        s.async = true;
        document.body.appendChild(s);
      }
    }

    return () => {
      cancelled = true;
      controllerRef.current?.destroy?.();
      controllerRef.current = null;
      wrap.innerHTML = "";
    };
  }, []);

  // 2. Initialize SINGLE YouTube YT.Player directly inside the 9:16 Canvas Host
  useEffect(() => {
    const wrap = ytHostWrapRef.current;
    if (!wrap) return;
    let cancelled = false;

    // Clear any YouTube mute flag stored in localStorage/sessionStorage from earlier
    try {
      localStorage.removeItem("yt-player-volume");
      sessionStorage.removeItem("yt-player-volume");
    } catch {
      // ignore
    }

    const host = document.createElement("div");
    wrap.appendChild(host);

    const createYtPlayer = () => {
      if (cancelled || !window.YT || !window.YT.Player) return;
      const p = new window.YT.Player(host, {
        width: "100%",
        height: "100%",
        videoId: trackRef.current?.youtubeVideoId || "kPa7bsKwL-c",
        playerVars: {
          autoplay: 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
        },
        events: {
          onReady: (ev) => {
            if (cancelled) return;
            ytPlayerRef.current = ev.target;
            ytReadyRef.current = true;
            setYtReadyState(true);
            setIsReady(true);
            forceUnmuteYouTube(ev.target);

            const targetId =
              pendingYtIdRef.current ||
              (trackRef.current?.source === "youtube"
                ? trackRef.current.youtubeVideoId
                : null);

            if (targetId && engineRef.current === "youtube") {
              pendingYtIdRef.current = null;
              ev.target.loadVideoById(targetId);
              forceUnmuteYouTube(ev.target);
              ev.target.playVideo();
            }
          },
          onStateChange: (ev) => {
            if (cancelled) return;
            const state = ev.data;

            // Manage visual visibility for both Spotify-Canvas mode & YouTube mode:
            // Only show the iframe 450ms after entering PLAYING (state === 1) so the center || bezel is never seen
            if (bezelTimerRef.current) {
              window.clearTimeout(bezelTimerRef.current);
              bezelTimerRef.current = null;
            }
            if (state === 1) {
              bezelTimerRef.current = window.setTimeout(() => {
                setYtVisualPlaying(true);
              }, 450);
            } else {
              setYtVisualPlaying(false);
              // If in Spotify Canvas trailer mode and YouTube somehow paused or ended, resume muted playback automatically
              if (engineRef.current === "spotify" && (state === 2 || state === 0)) {
                try {
                  ev.target.mute?.();
                  if (state === 0) ev.target.seekTo?.(20, true);
                  ev.target.playVideo?.();
                } catch {
                  // ignore
                }
              }
            }

            if (engineRef.current !== "youtube") return;
            if (state === 1) {
              forceUnmuteYouTube(ev.target);
            }
            const durMs = Math.max(0, (ev.target.getDuration?.() || 0) * 1000);
            const posMs = Math.max(
              0,
              (ev.target.getCurrentTime?.() || 0) * 1000
            );
            if (state === 0) {
              onNextRef.current();
              return;
            }
            setPlayback({
              isPaused: state !== 1 && state !== 3,
              isBuffering: state === 3,
              duration:
                durMs ||
                parseDurationSec(trackRef.current?.duration) * 1000,
              position: posMs,
              at: performance.now(),
            });
          },
        },
      });
      ytPlayerRef.current = p;
    };

    if (window.YT && window.YT.Player) {
      createYtPlayer();
    } else {
      const prevCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevCb?.();
        createYtPlayer();
      };
      if (!document.getElementById("youtube-iframe-api")) {
        const s = document.createElement("script");
        s.id = "youtube-iframe-api";
        s.src = "https://www.youtube.com/iframe_api";
        s.async = true;
        document.body.appendChild(s);
      }
    }

    return () => {
      cancelled = true;
      ytPlayerRef.current?.destroy?.();
      ytPlayerRef.current = null;
      wrap.innerHTML = "";
    };
  }, []);

  // Poll YT.Player time AND enforce unmuted volume while YouTube engine is active
  useEffect(() => {
    if (engine !== "youtube") return;
    const id = window.setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p || !ytReadyRef.current || typeof p.getCurrentTime !== "function")
        return;
      const state = p.getPlayerState?.();
      if (state === 1) {
        if (p.isMuted?.() || (p.getVolume && p.getVolume() < 50)) {
          forceUnmuteYouTube(p);
        }
        const posMs = Math.max(0, (p.getCurrentTime() || 0) * 1000);
        const durMs = Math.max(0, (p.getDuration() || 0) * 1000);
        setPlayback((prev) => ({
          ...prev,
          isPaused: false,
          isBuffering: false,
          position: posMs,
          duration: durMs || prev.duration,
          at: performance.now(),
        }));
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [engine]);

  // React to currentTrack changes
  useEffect(() => {
    if (!currentTrack) return;
    if (lastTrackObjRef.current === currentTrack) return;
    const autoplay = lastTrackObjRef.current !== null;
    lastTrackObjRef.current = currentTrack;

    endedRef.current = false;
    hasStartedRef.current = false;
    lastPosRef.current = 0;

    setPlayback((p) => ({
      ...p,
      position: 0,
      duration: parseDurationSec(currentTrack.duration) * 1000,
      at: performance.now(),
    }));

    if (currentTrack.source === "youtube" && currentTrack.youtubeVideoId) {
      // Pause Spotify controller
      controllerRef.current?.pause?.();
      const vid = currentTrack.youtubeVideoId;
      if (ytPlayerRef.current && ytReadyRef.current) {
        ytPlayerRef.current.loadVideoById(vid);
        forceUnmuteYouTube(ytPlayerRef.current);
        ytPlayerRef.current.playVideo();
      } else {
        pendingYtIdRef.current = vid;
      }
      return;
    }

    // Spotify engine
    ytPlayerRef.current?.pauseVideo?.();
    const uri = `spotify:track:${currentTrack.spotifyTrackId}`;
    const c = controllerRef.current;
    if (!c) {
      pendingRef.current = { uri, autoplay };
      return;
    }
    if (loadedUriRef.current !== uri) {
      c.loadUri(uri);
      loadedUriRef.current = uri;
    }
    if (autoplay) c.play();
  }, [currentTrack]);

  // Smooth clock while playing
  useEffect(() => {
    if (playback.isPaused) return;
    const id = window.setInterval(() => setNow(performance.now()), 200);
    return () => window.clearInterval(id);
  }, [playback.isPaused]);

  const fallbackDuration = parseDurationSec(currentTrack?.duration) * 1000;
  const duration = playback.duration || fallbackDuration;
  const livePosition = playback.isPaused
    ? playback.position
    : Math.min(duration, playback.position + Math.max(0, now - playback.at));
  const isPlaying = !playback.isPaused;
  const isPreview =
    engine === "spotify" &&
    playback.duration > 0 &&
    playback.duration <= 31000;

  const togglePlay = () => {
    if (engine === "youtube") {
      const p = ytPlayerRef.current;
      if (!p || !ytReadyRef.current) return;
      const state = p.getPlayerState?.();
      if (state === 1) {
        p.pauseVideo();
        setPlayback((prev) => ({ ...prev, isPaused: true }));
      } else {
        forceUnmuteYouTube(p);
        p.playVideo();
        setPlayback((prev) => ({
          ...prev,
          isPaused: false,
          at: performance.now(),
        }));
      }
      return;
    }

    const c = controllerRef.current;
    if (!c) return;
    c.togglePlay();
    setPlayback((p) => ({
      ...p,
      isPaused: !p.isPaused,
      position: livePosition,
      at: performance.now(),
    }));
  };

  const seekTo = (ms: number) => {
    if (!duration) return;
    const clamped = Math.max(0, Math.min(duration, ms));

    if (engine === "youtube") {
      const p = ytPlayerRef.current;
      if (p && ytReadyRef.current) {
        forceUnmuteYouTube(p);
        p.seekTo(clamped / 1000, true);
      }
      setPlayback((prev) => ({
        ...prev,
        position: clamped,
        at: performance.now(),
      }));
      return;
    }

    const c = controllerRef.current;
    if (!c) return;
    c.seek(clamped / 1000);
    setPlayback((p) => ({ ...p, position: clamped, at: performance.now() }));
  };

  /* ------------------------------- Fullscreen ------------------------------ */
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const idleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isFullScreen) {
      setControlsVisible(true);
      return;
    }
    const wake = () => {
      setControlsVisible(true);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(
        () => setControlsVisible(false),
        2800
      );
    };
    wake();
    window.addEventListener("mousemove", wake);
    return () => {
      window.removeEventListener("mousemove", wake);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [isFullScreen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isFullScreen) return;
      if (e.key === "Escape") setIsFullScreen(false);
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ------------------------------ Lyrics data ------------------------------ */
  const trackKey =
    currentTrack?.youtubeVideoId || currentTrack?.spotifyTrackId;
  const trackYtId = currentTrack?.youtubeVideoId;
  const trackSource = currentTrack?.source;
  const trackTitle = currentTrack?.title;
  const trackArtist = currentTrack?.artistName;
  const trackDurSec = parseDurationSec(currentTrack?.duration);

  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [lyricsSynced, setLyricsSynced] = useState(false);
  const [lyricsStatus, setLyricsStatus] = useState<
    "loading" | "ready" | "none"
  >("loading");

  useEffect(() => {
    if (!trackKey || !trackTitle || !trackArtist) return;
    let cancelled = false;
    setLyrics([]);
    setLyricsSynced(false);
    setLyricsStatus("loading");
    const { cleanTitle, primaryArtist } = cleanForSearch(
      trackTitle,
      trackArtist
    );

    (async () => {
      try {
        // 1. If playing from YouTube, pull lyrics directly from /api/youtube/lyrics (which parses the true YouTube videoDetails title, checks verified LRCLIB, human YouTube captions, and description!)
        let effectiveTitle = cleanTitle;
        let effectiveArtist = primaryArtist;

        if (trackSource === "youtube" && trackYtId) {
          const ytRes = await fetch(
            `/api/youtube/lyrics?videoId=${encodeURIComponent(trackYtId)}`
          );
          if (ytRes.ok) {
            const ytData = await ytRes.json();
            if (ytData.resolvedTitle) {
              effectiveTitle = ytData.resolvedTitle;
            }
            if (ytData.resolvedArtist) {
              effectiveArtist = ytData.resolvedArtist;
            }
            if (
              !cancelled &&
              Array.isArray(ytData.lines) &&
              ytData.lines.length >= 4
            ) {
              setLyrics(ytData.lines);
              setLyricsSynced(Boolean(ytData.synced));
              setLyricsStatus("ready");
              return;
            }
          }
        }

        // 2. Query LRCLIB (strictly verifying that trackName matches effectiveTitle so we never show lyrics from a different song by the same artist!)
        let items: LrcLibItem[] = [];
        const p = new URLSearchParams({
          track_name: effectiveTitle,
          artist_name: effectiveArtist,
        });
        const r1 = await fetch(`https://lrclib.net/api/search?${p}`);
        if (r1.ok) items = await r1.json();
        if (!Array.isArray(items) || items.length === 0) {
          const r2 = await fetch(
            `https://lrclib.net/api/search?q=${encodeURIComponent(
              `${effectiveTitle} ${effectiveArtist}`
            )}`
          );
          if (r2.ok) items = await r2.json();
        }
        if (cancelled) return;
        if (!Array.isArray(items)) items = [];

        // Strictly keep only results whose trackName matches our song title!
        const validItems = items.filter((it) =>
          titlesMatchStrictly(it.trackName, effectiveTitle)
        );

        const score = (it: LrcLibItem) =>
          trackDurSec && it.duration ? Math.abs(it.duration - trackDurSec) : 0;
        const synced = validItems
          .filter((i) => i.syncedLyrics)
          .sort((a, b) => score(a) - score(b));
        const plain = validItems
          .filter((i) => i.plainLyrics)
          .sort((a, b) => score(a) - score(b));

        const bestSynced = synced.find((i) => score(i) <= 25) || synced[0];
        if (bestSynced?.syncedLyrics) {
          setLyrics(parseLyrics(bestSynced.syncedLyrics, true));
          setLyricsSynced(true);
          setLyricsStatus("ready");
          return;
        }
        if (plain[0]?.plainLyrics) {
          setLyrics(parseLyrics(plain[0].plainLyrics, false));
          setLyricsStatus("ready");
          return;
        }
        setLyricsStatus("none");
      } catch {
        if (!cancelled) setLyricsStatus("none");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trackKey, trackYtId, trackSource, trackTitle, trackArtist, trackDurSec]);

  const posSec = livePosition / 1000;
  const activeIdx = useMemo(() => {
    if (lyrics.length === 0) return -1;
    if (lyricsSynced) {
      let idx = -1;
      for (let i = 0; i < lyrics.length; i++) {
        const t = lyrics[i].time;
        if (t === null) continue;
        if (t <= posSec + 0.25) idx = i;
        else break;
      }
      return idx;
    }
    const durSec = duration / 1000;
    if (!durSec) return 0;
    return Math.min(
      lyrics.length - 1,
      Math.floor((posSec / durSec) * lyrics.length)
    );
  }, [lyrics, lyricsSynced, posSec, duration]);

  const lyricsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = lyricsRef.current;
    if (!isFullScreen || !showLyrics || !container) return;
    const el = container.querySelector(
      `[data-idx="${Math.max(0, activeIdx)}"]`
    ) as HTMLElement | null;
    if (!el) return;
    container.scrollTo({
      top: el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2,
      behavior: "smooth",
    });
  }, [activeIdx, isFullScreen, showLyrics]);

  /* ------------------------------ Canvas data ------------------------------ */
  const [canvasVideoUrls, setCanvasVideoUrls] = useState<string[]>([]);
  const [canvasYtId, setCanvasYtId] = useState<string | null>(null);
  const [lyricsFallbackYtId, setLyricsFallbackYtId] = useState<string | null>(
    null
  );
  const canvasForTrackRef = useRef<string | null>(null);

  useEffect(() => {
    if (!trackKey || !trackTitle || !trackArtist) return;
    if (canvasForTrackRef.current === trackKey) return;
    canvasForTrackRef.current = trackKey;
    let cancelled = false;
    setCanvasVideoUrls([]);
    setCanvasYtId(null);
    setLyricsFallbackYtId(null);

    const { cleanTitle, primaryArtist } = cleanForSearch(
      trackTitle,
      trackArtist
    );

    const params = new URLSearchParams({
      q: `${cleanTitle} ${primaryArtist}`,
      title: cleanTitle,
      artist: primaryArtist,
      trackId: currentTrack?.spotifyTrackId || "",
    });

    fetch(`/api/video?${params.toString()}`)
      .then((r) =>
        r.ok
          ? r.json()
          : {
              mp4Url: null,
              backupMp4Urls: [],
              youtubeVideoId: null,
              lyricsVideoId: null,
            }
      )
      .then(
        (d: {
          mp4Url?: string | null;
          backupMp4Urls?: string[];
          youtubeVideoId?: string | null;
          lyricsVideoId?: string | null;
        }) => {
          if (cancelled) return;
          const urls = [
            ...(d.mp4Url ? [d.mp4Url] : []),
            ...(Array.isArray(d.backupMp4Urls) ? d.backupMp4Urls : []),
          ];
          setCanvasVideoUrls(urls);
          setCanvasYtId(d.youtubeVideoId || null);
          setLyricsFallbackYtId(d.lyricsVideoId || d.youtubeVideoId || null);
          setClipIdx(0);
          setVideoReady(false);
        }
      )
      .catch(() => {
        if (!cancelled) {
          setCanvasVideoUrls([]);
          setCanvasYtId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trackKey, trackTitle, trackArtist, currentTrack?.spotifyTrackId]);

  // If playing a Spotify track and no Apple Music MP4 was found for this artist,
  // use our single YT.Player (muted, looping a smooth 45-second trailer slice 20s -> 65s) for the visual canvas!
  const useYtForSpotifyCanvas =
    engine === "spotify" &&
    canvasVideoUrls.length === 0 &&
    Boolean(canvasYtId);

  useEffect(() => {
    if (!useYtForSpotifyCanvas || !canvasYtId || !ytReadyState) return;
    const p = ytPlayerRef.current;
    if (!p || !ytReadyRef.current) return;

    setYtVisualPlaying(false);
    try {
      p.mute?.();
      p.loadVideoById({
        videoId: canvasYtId,
        startSeconds: 20,
      });
    } catch {
      // ignore
    }

    // Check every 2 seconds: once the trailer reaches 65s (a full 45-second trailer clip!),
    // fade out briefly, seek back to 20s without redundant playVideo() calls, and fade back in!
    const loopTimer = window.setInterval(() => {
      if (engineRef.current !== "spotify") return;
      try {
        p.mute?.();
        const cur = p.getCurrentTime?.() || 0;
        const dur = p.getDuration?.() || 0;
        const state = p.getPlayerState?.();
        if (state === 2) {
          p.playVideo?.();
        } else if (cur >= 65 || (dur > 0 && cur >= dur - 4)) {
          setYtVisualPlaying(false);
          p.seekTo?.(20, true);
          window.setTimeout(() => {
            if (p.getPlayerState?.() === 1) {
              setYtVisualPlaying(true);
            }
          }, 500);
        }
      } catch {
        // ignore
      }
    }, 2000);

    return () => {
      window.clearInterval(loopTimer);
    };
  }, [useYtForSpotifyCanvas, canvasYtId, ytReadyState]);

  // If LRCLIB found no lyrics for a Spotify song, automatically try pulling lyrics from the matched YouTube video!
  useEffect(() => {
    if (
      lyricsStatus !== "none" ||
      !lyricsFallbackYtId ||
      trackSource === "youtube"
    )
      return;
    let cancelled = false;
    fetch(
      `/api/youtube/lyrics?videoId=${encodeURIComponent(lyricsFallbackYtId)}`
    )
      .then((r) => (r.ok ? r.json() : { lines: [], synced: false }))
      .then((ytData) => {
        if (
          !cancelled &&
          Array.isArray(ytData.lines) &&
          ytData.lines.length >= 4
        ) {
          setLyrics(ytData.lines);
          setLyricsSynced(Boolean(ytData.synced));
          setLyricsStatus("ready");
        }
      })
      .catch(() => {
        // keep none
      });
    return () => {
      cancelled = true;
    };
  }, [lyricsStatus, lyricsFallbackYtId, trackSource]);

  const activeMp4Url =
    canvasVideoUrls.length > 0
      ? canvasVideoUrls[clipIdx % canvasVideoUrls.length]
      : null;

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !activeMp4Url) return;
    setVideoReady(false);
    v.load();
    v.play().catch(() => {
      // Muted autoplay is allowed
    });
  }, [activeMp4Url]);

  const videoFilterClass =
    frostLevel === "deep"
      ? "brightness-[0.48] contrast-[0.88] saturate-[0.78] blur-[4px]"
      : frostLevel === "soft"
      ? "brightness-[0.58] contrast-[0.92] saturate-[0.85] blur-[1.5px]"
      : "brightness-[0.78] contrast-[0.95] saturate-[0.92]";

  const glassOverlayClass =
    frostLevel === "deep"
      ? "bg-[#06080E]/50 backdrop-blur-[10px]"
      : frostLevel === "soft"
      ? "bg-[#06080E]/38 backdrop-blur-[5px]"
      : "bg-[#06080E]/20 backdrop-blur-[1.5px]";

  const playButtonIcon = (size: string) =>
    !isReady || (isPlaying && playback.isBuffering) ? (
      <Loader2 className={`${size} animate-spin`} />
    ) : isPlaying ? (
      <Pause className={`${size} fill-current`} />
    ) : (
      <Play className={`${size} fill-current ml-0.5`} />
    );

  return (
    <>
      {/* Hidden Spotify iFrame Controller Host */}
      <div
        ref={embedWrapRef}
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-0 -z-10 h-[80px] w-[300px] opacity-0"
      />

      {/* =================================================================== */}
      {/* PERSISTENT FULLSCREEN STAGE (Always mounted so YT.Player inside the */}
      {/* card NEVER unmounts, morphing between Spotify 9:16 Emerald Canvas   */}
      {/* and YouTube 16:9 Crimson Widescreen Ambilight Cinema!)              */}
      {/* =================================================================== */}
      <div
        className={`fixed inset-0 overflow-hidden text-white transition-all duration-500 ${
          engine === "youtube" ? "bg-[#060307]" : "bg-[#030407]"
        } ${
          isFullScreen
            ? "z-[60] opacity-100 pointer-events-auto"
            : "-z-20 opacity-[0.01] pointer-events-none"
        }`}
        style={{ cursor: isFullScreen && !controlsVisible ? "none" : "auto" }}
      >
        {/* Dynamic Universe Backdrop (Emerald Aurora for Spotify vs Crimson-Amber Cinema Ambilight for YouTube) */}
        {currentTrack && (
          <div className="pointer-events-none absolute inset-0">
            <img
              src={currentTrack.coverUrl}
              alt=""
              className={`absolute inset-0 h-full w-full scale-150 object-cover blur-[120px] animate-aurora transition-opacity duration-700 ${
                engine === "youtube" ? "opacity-35" : "opacity-50"
              }`}
            />
            {engine === "youtube" ? (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_45%,rgba(244,63,94,0.24),rgba(245,158,11,0.08)_45%,transparent_75%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_25%,rgba(168,85,247,0.14),transparent_60%)]" />
              </>
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(30,215,96,0.14),transparent_55%)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/85" />
            <div className="absolute inset-0 grain-overlay opacity-[0.06]" />
          </div>
        )}

        {/* Auto-hiding top controls */}
        <div
          className={`absolute inset-x-0 top-0 z-20 flex items-center justify-between px-8 py-6 transition-all duration-500 ${
            controlsVisible
              ? "opacity-100"
              : "pointer-events-none -translate-y-3 opacity-0"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em] ${
                engine === "youtube"
                  ? "border-rose-500/35 bg-rose-500/15 text-rose-300"
                  : "border-[#1ED760]/30 bg-[#1ED760]/10 text-[#1ED760]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  engine === "youtube" ? "bg-rose-500 animate-ping" : "bg-[#1ED760]"
                }`}
              />
              {engine === "youtube"
                ? "YouTube Widescreen Cinema"
                : "Spotify Canvas Studio"}
            </span>
            {isPreview && (
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-200">
                30s preview
              </span>
            )}
          </div>

          <button
            onClick={() => setShowLyrics((s) => !s)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold backdrop-blur-xl transition cursor-pointer ${
              showLyrics
                ? engine === "youtube"
                  ? "border-rose-500/45 bg-rose-500/20 text-rose-200 shadow-[0_0_24px_rgba(244,63,94,0.3)]"
                  : "border-[#1ED760]/40 bg-[#1ED760]/15 text-[#1ED760]"
                : "border-white/10 bg-white/[0.06] text-white/70 hover:text-white"
            }`}
          >
            <Mic2 className="h-3.5 w-3.5" />
            {showLyrics ? "Lyrics on" : "Lyrics off"}
          </button>

          <button
            onClick={() => setIsFullScreen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white/80 backdrop-blur-xl transition hover:bg-white/15 hover:text-white cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stage */}
        <div
          className={`relative z-10 mx-auto flex h-full w-full max-w-[1520px] items-center px-8 lg:px-14 ${
            showLyrics ? "justify-between gap-12 lg:gap-16" : "justify-center"
          }`}
        >
          {/* Left Column Wrapper (Holds the morphing Video/Canvas Card + YouTube Cinema Console) */}
          <div
            className={`flex flex-col items-center justify-center shrink-0 transition-all duration-500 ${
              engine === "youtube"
                ? showLyrics
                  ? "w-full max-w-[540px] xl:max-w-[640px]"
                  : "w-full max-w-[960px]"
                : ""
            }`}
          >
            {/* Morphing Visual Card: 9:16 Vertical Canvas for Spotify vs 16:9 Widescreen Ambilight Cinema for YouTube */}
            <div
              className={`relative overflow-hidden bg-[#05070C] transition-all duration-500 ${
                engine === "youtube"
                  ? "aspect-video w-full rounded-[28px] border border-rose-500/30 shadow-[0_0_90px_rgba(244,63,94,0.22),0_40px_110px_rgba(0,0,0,0.95)]"
                  : "aspect-[9/16] h-[min(80vh,820px)] rounded-[30px] border border-white/10 shadow-[0_50px_140px_-20px_rgba(0,0,0,0.9)]"
              }`}
            >
              {/* Base cover art */}
              {currentTrack && (
                <img
                  src={currentTrack.coverUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-45 blur-xl scale-115"
                />
              )}

              {/* Native HTML5 HD Music Video Trailer Loop (used in Spotify mode) */}
              {activeMp4Url && engine === "spotify" && (
                <video
                  ref={videoRef}
                  key={activeMp4Url}
                  src={activeMp4Url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onCanPlay={() => setVideoReady(true)}
                  onError={() => {
                    if (canvasVideoUrls.length > 1) {
                      setClipIdx((i) => (i + 1) % canvasVideoUrls.length);
                    }
                  }}
                  className={`absolute inset-0 h-full w-full object-cover scale-[1.08] transition-all duration-700 ${videoFilterClass} ${
                    videoReady ? "opacity-90" : "opacity-0"
                  }`}
                />
              )}

              {/* SINGLE Persistent YouTube YT.Player Host:
                  - In YouTube Mode: Full uncropped 16:9 widescreen cinema frame!
                  - In Spotify Fallback Mode: 9:16 vertical center-cropped canvas trailer! */}
              <div
                ref={ytHostWrapRef}
                className={`pointer-events-none absolute top-0 h-full transition-opacity duration-700 ${
                  engine === "youtube"
                    ? frostLevel === "clear"
                      ? "brightness-[0.92] contrast-[0.98]"
                      : videoFilterClass
                    : videoFilterClass
                } ${
                  (engine === "youtube" || useYtForSpotifyCanvas) &&
                  ytVisualPlaying
                    ? "opacity-95"
                    : "opacity-0"
                }`}
                style={
                  engine === "youtube"
                    ? {
                        left: 0,
                        width: "100%",
                        transform: "scale(1.03)",
                      }
                    : {
                        left: "50%",
                        width: "320%",
                        transform: "translateX(-50%) scale(1.25)",
                      }
                }
              />

              {/* Smoked Frosted Obsidian Glass Diffusion Layer */}
              <div
                className={`pointer-events-none absolute inset-0 transition-all duration-500 ${
                  engine === "youtube" && frostLevel === "clear"
                    ? "bg-transparent"
                    : glassOverlayClass
                } shadow-[inset_0_1px_1px_rgba(255,255,255,0.16),inset_0_0_80px_rgba(3,4,7,0.85)]`}
              />

              {/* Subtle Diagonal Glass Reflection Sheen & Radial Edge Vignette */}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.02)_35%,transparent_60%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(3,4,7,0.72)_100%)]" />

              {/* Top Floating Controls inside Card: Frost Level Toggle + Switch Visual */}
              <div
                className={`absolute inset-x-4 top-4 z-20 flex items-center justify-between gap-2 transition-opacity duration-500 ${
                  controlsVisible
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                <button
                  onClick={() =>
                    setFrostLevel((prev) =>
                      prev === "soft"
                        ? "deep"
                        : prev === "deep"
                        ? "clear"
                        : "soft"
                    )
                  }
                  className="rounded-full border border-white/15 bg-black/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80 backdrop-blur-xl hover:bg-black/75 hover:text-white transition cursor-pointer"
                  title="Adjust Glass Frost Intensity"
                >
                  ✦ Glass: {frostLevel}
                </button>

                {engine === "youtube" ? (
                  <button
                    onClick={() => {
                      forceUnmuteYouTube();
                      ytPlayerRef.current?.playVideo?.();
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-500/35 bg-black/55 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-300 backdrop-blur-xl hover:bg-black/80 transition cursor-pointer"
                    title="Ensure YouTube Audio is Unmuted"
                  >
                    <Volume2 className="h-3 w-3 text-rose-400" /> Cinema Audio
                  </button>
                ) : (
                  canvasVideoUrls.length > 1 && (
                    <button
                      onClick={() =>
                        setClipIdx((i) => (i + 1) % canvasVideoUrls.length)
                      }
                      className="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/75 backdrop-blur-xl hover:bg-black/70 hover:text-[#1ED760] transition cursor-pointer"
                      title="Switch Canvas Visual Clip"
                    >
                      ↻ Switch Visual
                    </button>
                  )
                )}
              </div>

              <div className="pointer-events-none absolute inset-0 grain-overlay opacity-[0.05] mix-blend-overlay" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />

              {/* SPOTIFY MODE ONLY: Inline Bottom Track Info & Transport inside the 9:16 Card */}
              {currentTrack && engine === "spotify" && (
                <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-6 pb-6 pt-28">
                  <div className="flex items-end gap-3">
                    <img
                      src={currentTrack.coverUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-white/20"
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-black tracking-tight">
                        {currentTrack.title}
                      </h2>
                      <p className="truncate text-sm text-white/65">
                        {currentTrack.artistName}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`mt-5 transition-all duration-500 ${
                      controlsVisible
                        ? "opacity-100"
                        : "pointer-events-none translate-y-2 opacity-0"
                    }`}
                  >
                    <SeekBar
                      position={livePosition}
                      duration={duration}
                      onSeek={(f) => seekTo(f * duration)}
                      accent="emerald"
                    />
                    <div className="mt-1 flex justify-between font-mono-tabular text-[11px] text-white/50">
                      <span>{fmt(livePosition)}</span>
                      <span>-{fmt(duration - livePosition)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-8">
                      <button
                        onClick={onPrev}
                        className="text-white/70 transition hover:text-white cursor-pointer"
                        title="Previous"
                      >
                        <SkipBack className="h-6 w-6 fill-current" />
                      </button>
                      <button
                        onClick={togglePlay}
                        disabled={!isReady}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.2)] transition hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60"
                      >
                        {playButtonIcon("h-6 w-6")}
                      </button>
                      <button
                        onClick={onNext}
                        className="text-white/70 transition hover:text-white cursor-pointer"
                        title="Next"
                      >
                        <SkipForward className="h-6 w-6 fill-current" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* YOUTUBE MODE ONLY: Floating Crimson-Glass Cinema Console Below the 16:9 Widescreen Frame */}
            {currentTrack && engine === "youtube" && (
              <div className="mt-6 w-full rounded-3xl border border-rose-500/25 bg-[#12080E]/80 p-5 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.85)]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={currentTrack.coverUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-rose-500/40 shadow-lg"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-400">
                          YT Theater
                        </span>
                        {currentTrack.viewsText && (
                          <span className="text-[11px] text-white/45 truncate">
                            {currentTrack.viewsText}
                          </span>
                        )}
                      </div>
                      <h2 className="mt-0.5 truncate text-xl font-black tracking-tight text-white">
                        {currentTrack.title}
                      </h2>
                      <p className="truncate text-xs font-semibold text-rose-300/80">
                        {currentTrack.artistName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <button
                      onClick={onPrev}
                      className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white cursor-pointer"
                      title="Previous"
                    >
                      <SkipBack className="h-5 w-5 fill-current" />
                    </button>
                    <button
                      onClick={togglePlay}
                      disabled={!isReady}
                      className="flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 text-white shadow-[0_0_32px_rgba(244,63,94,0.45)] transition hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60"
                    >
                      {playButtonIcon("h-5 w-5")}
                    </button>
                    <button
                      onClick={onNext}
                      className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white cursor-pointer"
                      title="Next"
                    >
                      <SkipForward className="h-5 w-5 fill-current" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 font-mono-tabular text-[11px] text-white/50">
                  <span className="w-9 text-right">{fmt(livePosition)}</span>
                  <div className="flex-1">
                    <SeekBar
                      position={livePosition}
                      duration={duration}
                      onSeek={(f) => seekTo(f * duration)}
                      accent="rose"
                    />
                  </div>
                  <span className="w-10">-{fmt(duration - livePosition)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Lyrics Stage (Emerald Glow for Spotify vs Crimson-Amber Cinema Spotlight for YouTube) */}
          {showLyrics && (
            <div className="relative h-[80vh] min-w-0 max-w-3xl flex-1">
              {lyricsStatus === "loading" && (
                <div className="flex h-full items-center justify-center">
                  <Loader2
                    className={`h-8 w-8 animate-spin ${
                      engine === "youtube" ? "text-rose-500" : "text-[#1ED760]"
                    }`}
                  />
                </div>
              )}
              {lyricsStatus === "none" && (
                <div className="flex h-full flex-col items-start justify-center gap-2">
                  <p className="text-3xl font-black text-white/40">
                    No lyrics found for this song.
                  </p>
                  <p className="text-sm text-white/30">
                    Enjoy the visual experience.
                  </p>
                </div>
              )}
              {lyricsStatus === "ready" && (
                <div
                  ref={lyricsRef}
                  className="no-scrollbar lyrics-fade-mask relative h-full overflow-y-auto py-[38vh]"
                >
                  {lyrics.map((line, i) => {
                    const isActive = i === activeIdx;
                    const isPast = activeIdx >= 0 && i < activeIdx;
                    const dist =
                      activeIdx < 0 ? i + 1 : Math.abs(i - activeIdx);
                    return (
                      <p
                        key={i}
                        data-idx={i}
                        onClick={() =>
                          line.time !== null && seekTo(line.time * 1000)
                        }
                        className={`origin-left py-2.5 text-[length:clamp(24px,3vw,44px)] font-extrabold leading-[1.18] tracking-tight transition-all duration-500 ease-out ${
                          line.time !== null ? "cursor-pointer" : ""
                        } ${
                          isActive
                            ? engine === "youtube"
                              ? "scale-100 border-l-4 border-rose-500 pl-4 text-rose-50 [text-shadow:0_0_45px_rgba(244,63,94,0.6)]"
                              : "scale-100 text-white [text-shadow:0_0_40px_rgba(30,215,96,0.35)]"
                            : isPast
                            ? "scale-[0.96] text-white/25"
                            : "scale-[0.96] text-white/40 hover:text-white/70"
                        }`}
                        style={{
                          filter: isActive
                            ? "none"
                            : `blur(${Math.min(dist, 4) * 0.6}px)`,
                        }}
                      >
                        {line.text}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================== FLOATING DOCK =========================== */}
      {currentTrack && (
        <div
          className={`pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-all duration-500 ${
            isFullScreen ? "translate-y-24 opacity-0" : "opacity-100"
          }`}
        >
          <div className="pointer-events-auto relative w-full max-w-5xl overflow-hidden rounded-[22px] border border-white/10 bg-[#0A0D14]/85 shadow-[0_20px_60px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0">
              <img
                src={currentTrack.coverUrl}
                alt=""
                className="absolute -left-10 top-1/2 h-40 w-72 -translate-y-1/2 object-cover opacity-30 blur-3xl"
              />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>

            <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-3 py-2.5">
              {/* Left: track */}
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setIsFullScreen(true)}
                  className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl shadow-lg ring-1 ring-white/10 cursor-pointer"
                  title="Open full screen"
                >
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                    <Maximize2 className="h-4 w-4 text-white" />
                  </span>
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-white">
                      {currentTrack.title}
                    </p>
                    {isPlaying && (
                      <span className="flex h-3 shrink-0 items-end gap-[2px]">
                        <span
                          className={`w-[3px] rounded-full eq-bar-1 ${
                            engine === "youtube"
                              ? "bg-rose-500"
                              : "bg-[#1ED760]"
                          }`}
                        />
                        <span
                          className={`w-[3px] rounded-full eq-bar-2 ${
                            engine === "youtube"
                              ? "bg-rose-500"
                              : "bg-[#1ED760]"
                          }`}
                        />
                        <span
                          className={`w-[3px] rounded-full eq-bar-3 ${
                            engine === "youtube"
                              ? "bg-rose-500"
                              : "bg-[#1ED760]"
                          }`}
                        />
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      currentTrack.artistId &&
                      onInspectArtist?.(currentTrack.artistId)
                    }
                    className="block max-w-full truncate text-xs text-white/55 transition hover:text-white hover:underline cursor-pointer"
                  >
                    {currentTrack.artistName}
                  </button>
                </div>
              </div>

              {/* Center: transport */}
              <div className="flex w-[clamp(220px,40vw,520px)] flex-col items-center gap-1">
                <div className="flex items-center gap-6">
                  <button
                    onClick={onPrev}
                    className="text-white/60 transition hover:text-white cursor-pointer"
                    title="Previous"
                  >
                    <SkipBack className="h-[18px] w-[18px] fill-current" />
                  </button>
                  <button
                    onClick={togglePlay}
                    disabled={!isReady}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.15)] transition hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {playButtonIcon("h-[18px] w-[18px]")}
                  </button>
                  <button
                    onClick={onNext}
                    className="text-white/60 transition hover:text-white cursor-pointer"
                    title="Next"
                  >
                    <SkipForward className="h-[18px] w-[18px] fill-current" />
                  </button>
                </div>
                <div className="flex w-full items-center gap-2.5 font-mono-tabular text-[10px] text-white/45">
                  <span className="w-9 text-right">{fmt(livePosition)}</span>
                  <div className="flex-1">
                    <SeekBar
                      position={livePosition}
                      duration={duration}
                      onSeek={(f) => seekTo(f * duration)}
                      accent={engine === "youtube" ? "rose" : "emerald"}
                    />
                  </div>
                  <span className="w-9">{fmt(duration)}</span>
                </div>
              </div>

              {/* Right: Clean Actions */}
              <div className="hidden items-center justify-end gap-1 sm:flex">
                {isPreview && (
                  <span
                    className="mr-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-200"
                    title="Log in at open.spotify.com in this browser to stream full tracks"
                  >
                    30s preview
                  </span>
                )}
                <button
                  onClick={() => {
                    setShowLyrics(true);
                    setIsFullScreen(true);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-[#1ED760] cursor-pointer"
                  title="Lyrics"
                >
                  <Mic2 className="h-4 w-4" />
                </button>
                <a
                  href={
                    engine === "youtube" && resolvedYtId
                      ? `https://www.youtube.com/watch?v=${resolvedYtId}`
                      : `https://open.spotify.com/track/${currentTrack.spotifyTrackId}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
                  title={
                    engine === "youtube"
                      ? "Open on YouTube"
                      : "Open in Spotify"
                  }
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => {
                    setShowLyrics(false);
                    setIsFullScreen(true);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white cursor-pointer"
                  title="Full screen Canvas"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
