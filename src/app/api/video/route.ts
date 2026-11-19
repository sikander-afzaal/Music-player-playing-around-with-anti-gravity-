import { NextRequest, NextResponse } from "next/server";

interface ItunesMusicVideo {
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
}

/**
 * 1. Apple Music / iTunes Music Videos — strictly matching the requested artist!
 */
async function fetchMatchingItunesVideos(
  title: string,
  artist: string
): Promise<{ exact: string[]; sameArtist: string[] }> {
  if (!artist) return { exact: [], sameArtist: [] };
  const artistLower = artist.toLowerCase();
  const titleLower = title.toLowerCase();

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      `${title} ${artist}`.trim()
    )}&entity=musicVideo&limit=12`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { exact: [], sameArtist: [] };
    const data = await res.json();
    if (!Array.isArray(data.results)) return { exact: [], sameArtist: [] };

    const exact: string[] = [];
    const sameArtist: string[] = [];

    for (const r of data.results as ItunesMusicVideo[]) {
      if (!r.previewUrl || !r.previewUrl.startsWith("https://")) continue;
      const rArtist = (r.artistName || "").toLowerCase();
      const rTrack = (r.trackName || "").toLowerCase();

      const artistMatches =
        rArtist.includes(artistLower) || artistLower.includes(rArtist);
      if (!artistMatches) continue;

      if (
        titleLower &&
        (rTrack.includes(titleLower) || titleLower.includes(rTrack))
      ) {
        exact.push(r.previewUrl);
      } else {
        sameArtist.push(r.previewUrl);
      }
    }

    return { exact, sameArtist };
  } catch {
    return { exact: [], sameArtist: [] };
  }
}

/**
 * 2. Spotify Embed Page Canvas Check (checks if open.spotify.com/embed/track/{id} exposes a canvas .mp4 URL)
 */
async function fetchSpotifyEmbedCanvas(
  spotifyTrackId?: string
): Promise<string | null> {
  if (!spotifyTrackId || spotifyTrackId.length < 15) return null;
  try {
    const res = await fetch(
      `https://open.spotify.com/embed/track/${encodeURIComponent(
        spotifyTrackId
      )}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const html = await res.text();
    const mp4Match = html.match(/https:\/\/canvaz\.scdn\.co\/[^"'\s]+\.mp4/);
    return mp4Match?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * 3. Find the real YouTube Music Video / Visualizer for this song & artist
 *    (strictly preferring real music videos over static "- Topic" audio uploads)
 */
async function findYouTubeVideoForSong(
  title: string,
  artist: string
): Promise<{ videoId: string | null; lyricsVideoId: string | null }> {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    const q = `${title} ${artist} official music video`.trim();
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
      { headers, next: { revalidate: 3600 } }
    );
    if (!res.ok) return { videoId: null, lyricsVideoId: null };

    const html = await res.text();
    const match = html.match(
      /var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/
    );
    const candidates: { id: string; isTopic: boolean }[] = [];

    if (match?.[1]) {
      try {
        const data = JSON.parse(match[1]);
        const sections =
          data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
            ?.sectionListRenderer?.contents || [];
        for (const sec of sections) {
          const items = sec?.itemSectionRenderer?.contents || [];
          for (const it of items) {
            const v = it?.videoRenderer;
            if (!v?.videoId) continue;
            const channel = String(
              v.ownerText?.runs?.[0]?.text || ""
            ).toLowerCase();
            const vTitle = String(
              v.title?.runs?.[0]?.text || ""
            ).toLowerCase();
            const isTopic =
              channel.endsWith("- topic") ||
              vTitle.includes("official audio") ||
              vTitle.includes("provided to youtube");
            candidates.push({ id: String(v.videoId), isTopic });
            if (candidates.length >= 8) break;
          }
          if (candidates.length >= 8) break;
        }
      } catch {
        // fallback regex below
      }
    }

    if (candidates.length === 0) {
      const re = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null && candidates.length < 6) {
        if (!candidates.some((c) => c.id === m![1])) {
          candidates.push({ id: m[1], isTopic: false });
        }
      }
    }

    const lyricsVideoId = candidates[0]?.id || null;

    // Prefer non-Topic real music videos first for the visual canvas, then check oEmbed
    const orderedForVisual = [
      ...candidates.filter((c) => !c.isTopic),
      ...candidates.filter((c) => c.isTopic),
    ];

    const checks = await Promise.all(
      orderedForVisual.slice(0, 6).map(async (c) => {
        try {
          const o = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(
              `https://www.youtube.com/watch?v=${c.id}`
            )}&format=json`,
            { next: { revalidate: 86400 } }
          );
          return o.ok ? c.id : null;
        } catch {
          return null;
        }
      })
    );

    const videoId = checks.find((id): id is string => Boolean(id)) || null;
    return { videoId, lyricsVideoId: lyricsVideoId || videoId };
  } catch {
    return { videoId: null, lyricsVideoId: null };
  }
}

/**
 * 4. Try extracting a direct HTML5 .mp4/.webm stream from Piped API mirrors for the YouTube videoId
 */
async function tryExtractPipedMp4(videoId: string | null): Promise<string | null> {
  if (!videoId) return null;
  const instances = [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.adminforge.de",
    "https://api.piped.private.coffee",
  ];

  for (const base of instances) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 1600);
      const res = await fetch(`${base}/streams/${encodeURIComponent(videoId)}`, {
        signal: ctrl.signal,
        next: { revalidate: 3600 },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      const streams: { url?: string; format?: string; quality?: string }[] =
        data?.videoStreams || [];
      const mp4 = streams.find(
        (s) =>
          s.url &&
          (s.format === "MPEG_4" || s.format === "WEBM") &&
          (s.quality === "720p" || s.quality === "480p" || s.quality === "360p")
      );
      if (mp4?.url) return mp4.url;
    } catch {
      // try next mirror
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim() || "";
  const artist = req.nextUrl.searchParams.get("artist")?.trim() || "";
  const title = req.nextUrl.searchParams.get("title")?.trim() || query;
  const trackId = req.nextUrl.searchParams.get("trackId")?.trim() || "";

  if (!title && !artist) {
    return NextResponse.json(
      { mp4Url: null, backupMp4Urls: [], youtubeVideoId: null },
      { status: 400 }
    );
  }

  try {
    const [spotifyCanvasMp4, itunes, yt] = await Promise.all([
      fetchSpotifyEmbedCanvas(trackId),
      fetchMatchingItunesVideos(title, artist),
      findYouTubeVideoForSong(title, artist),
    ]);

    const allArtistMp4s = Array.from(
      new Set([
        ...(spotifyCanvasMp4 ? [spotifyCanvasMp4] : []),
        ...itunes.exact,
        ...itunes.sameArtist,
      ])
    );

    // If neither Spotify Embed nor Apple Music had an MP4 for this artist, try extracting a direct MP4 from Piped for the YouTube video
    if (allArtistMp4s.length === 0 && yt.videoId) {
      const pipedMp4 = await tryExtractPipedMp4(yt.videoId);
      if (pipedMp4) {
        allArtistMp4s.push(pipedMp4);
      }
    }

    return NextResponse.json({
      mp4Url: allArtistMp4s[0] || null,
      backupMp4Urls: allArtistMp4s.slice(1, 6),
      youtubeVideoId: yt.videoId,
      lyricsVideoId: yt.lyricsVideoId,
      isExactMatch: Boolean(spotifyCanvasMp4 || itunes.exact.length > 0),
    });
  } catch {
    return NextResponse.json({
      mp4Url: null,
      backupMp4Urls: [],
      youtubeVideoId: null,
      lyricsVideoId: null,
      isExactMatch: false,
    });
  }
}
