import { NextRequest, NextResponse } from "next/server";

interface LyricLine {
  time: number | null;
  text: string;
}

interface LrcLibTrack {
  trackName?: string;
  artistName?: string;
  duration?: number;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
}

function extractPlayerResponse(html: string): Record<string, any> | null {
  const match = html.match(
    /var ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});\s*(?:var|<\/script>)/
  );
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n+/g, " ")
    .trim();
}

function parseTrueSongTitleAndArtist(
  rawTitle: string,
  channelName: string
): { title: string; artist: string } {
  const cleanedChannel = channelName
    .replace(/\s*-\s*Topic$/i, "")
    .replace(/VEVO$/i, "")
    .replace(/\s*Official$/i, "")
    .replace(/\s*Music$/i, "")
    .trim();

  const stripped = rawTitle
    .replace(
      /\s*[([](Official\s*(Music\s*)?Video|Official\s*Audio|Music\s*Video|Lyric\s*Video|Lyrics|Audio|Video|HD|4K|Visualizer|Full\s*Video|Full\s*Song|Unplugged|Live[^)\]]*)[)\]]/gi,
      ""
    )
    .trim();

  const parts = stripped
    .split(/\s*(?:\||-|\u2013|\u2014)\s*/)
    .map((p) => p.replace(/^["']|["']$/g, "").trim())
    .filter((p) => p.length > 0)
    .filter(
      (p) =>
        !/^(official\s*(music\s*)?(video|audio)|lyric\s*video|coke\s*studio(\s*season\s*\d+)?|season\s*\d+|ep(isode)?\s*\d+|4k|hd)$/i.test(
          p
        )
    );

  if (parts.length >= 2) {
    const chLower = cleanedChannel.toLowerCase();
    const firstLower = parts[0].toLowerCase();
    const secondLower = parts[1].toLowerCase();

    if (
      chLower &&
      (firstLower === chLower ||
        chLower.includes(firstLower) ||
        firstLower.includes(chLower))
    ) {
      return { artist: parts[0], title: parts[1] };
    }
    if (
      chLower &&
      (secondLower === chLower ||
        chLower.includes(secondLower) ||
        secondLower.includes(chLower))
    ) {
      return { title: parts[0], artist: parts[1] };
    }
    return { artist: parts[0], title: parts[1] };
  }

  return {
    title: parts[0] || stripped || rawTitle,
    artist: cleanedChannel || channelName || "",
  };
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*[([][^)\]]*[)\]]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titlesStrictlyMatch(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
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

function parseLrcString(raw: string, synced: boolean): LyricLine[] {
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

function extractLyricsFromDescription(desc: string): LyricLine[] {
  if (!desc) return [];
  const lines = desc.split(/\r?\n/).map((l) => l.trim());

  // Only extract from description if there is an explicit "Lyrics" header
  const startIdx = lines.findIndex((l) =>
    /^(lyrics|lyric|official lyrics|song lyrics)\s*[:\-–—]?$/i.test(l)
  );
  if (startIdx === -1) return [];

  const candidateLines = lines.slice(startIdx + 1);
  const filtered: string[] = [];

  for (const line of candidateLines) {
    if (!line) continue;
    if (
      /https?:\/\//i.test(line) ||
      /^[@#]/.test(line) ||
      /\b(instagram|spotify|facebook|twitter|tiktok|subscribe|produced by|directed by|mixed by|mastered by|copyright|all rights reserved|booking|management|audio credits|video credits)\b/i.test(
        line
      ) ||
      /^[A-Za-z0-9\s,&]+\s*:\s*@[A-Za-z0-9_.]+/.test(line)
    ) {
      if (filtered.length >= 6) break;
      continue;
    }

    if (line.length >= 3 && line.length <= 95) {
      filtered.push(line);
    }
  }

  if (filtered.length < 6) return [];
  return filtered.slice(0, 80).map((text) => ({ time: null, text }));
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("videoId")?.trim();
  if (!videoId) {
    return NextResponse.json({ lines: [], synced: false }, { status: 400 });
  }

  try {
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(
      videoId
    )}`;
    const res = await fetch(watchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ lines: [], synced: false });
    }

    const html = await res.text();
    const playerResp = extractPlayerResponse(html);
    if (!playerResp) {
      return NextResponse.json({ lines: [], synced: false });
    }

    const rawVideoTitle = String(playerResp?.videoDetails?.title || "");
    const rawAuthor = String(playerResp?.videoDetails?.author || "");
    const videoDurationSec = Number(
      playerResp?.videoDetails?.lengthSeconds || 0
    );
    const { title: resolvedTitle, artist: resolvedArtist } =
      parseTrueSongTitleAndArtist(rawVideoTitle, rawAuthor);

    // 1. Search LRCLIB using the TRUE parsed Song Title & Artist from YouTube's videoDetails,
    //    with STRICT title verification so we never return a different song by the same artist!
    if (resolvedTitle) {
      try {
        const q = `${resolvedTitle} ${resolvedArtist}`.trim();
        const lrcRes = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`,
          { next: { revalidate: 3600 } }
        );
        if (lrcRes.ok) {
          const items: LrcLibTrack[] = await lrcRes.json();
          if (Array.isArray(items) && items.length > 0) {
            const matchingTitleItems = items.filter(
              (it) =>
                it.trackName &&
                titlesStrictlyMatch(it.trackName, resolvedTitle)
            );

            const score = (it: LrcLibTrack) =>
              videoDurationSec && it.duration
                ? Math.abs(it.duration - videoDurationSec)
                : 0;

            const synced = matchingTitleItems
              .filter((it) => Boolean(it.syncedLyrics))
              .sort((a, b) => score(a) - score(b));

            if (synced[0]?.syncedLyrics) {
              return NextResponse.json({
                lines: parseLrcString(synced[0].syncedLyrics, true),
                synced: true,
                resolvedTitle,
                resolvedArtist,
                source: "lrclib-verified",
              });
            }

            const plain = matchingTitleItems
              .filter((it) => Boolean(it.plainLyrics))
              .sort((a, b) => score(a) - score(b));

            if (plain[0]?.plainLyrics) {
              return NextResponse.json({
                lines: parseLrcString(plain[0].plainLyrics, false),
                synced: false,
                resolvedTitle,
                resolvedArtist,
                source: "lrclib-plain-verified",
              });
            }
          }
        }
      } catch {
        // Fall through to YouTube human captions
      }
    }

    // 2. Try YouTube HUMAN-UPLOADED Captions / Subtitles (strictly excluding auto-generated ASR gibberish!)
    const captionTracks: Record<string, any>[] =
      playerResp?.captions?.playerCaptionsTracklistRenderer?.captionTracks ||
      [];
    const humanCaption = captionTracks.find((c) => c.kind !== "asr");

    if (humanCaption?.baseUrl) {
      const capRes = await fetch(`${humanCaption.baseUrl}&fmt=json3`);
      if (capRes.ok) {
        const capJson = await capRes.json();
        if (Array.isArray(capJson.events)) {
          const lines: LyricLine[] = [];
          for (const ev of capJson.events) {
            if (!Array.isArray(ev.segs)) continue;
            const text = decodeHtmlEntities(
              ev.segs.map((s: { utf8?: string }) => s.utf8 || "").join("")
            )
              .replace(/^♪+|♪+$/g, "")
              .trim();
            if (!text || text.length < 2) continue;
            const timeSec = Number(ev.tStartMs || 0) / 1000;
            lines.push({ time: timeSec, text });
          }
          if (lines.length >= 4) {
            return NextResponse.json({
              lines,
              synced: true,
              resolvedTitle,
              resolvedArtist,
              source: "youtube-human-captions",
            });
          }
        }
      }
    }

    // 3. Fallback: Extract Lyrics from YouTube Video Description if an explicit "Lyrics:" section exists
    const shortDesc: string =
      playerResp?.videoDetails?.shortDescription || "";
    const descLyrics = extractLyricsFromDescription(shortDesc);
    if (descLyrics.length >= 6) {
      return NextResponse.json({
        lines: descLyrics,
        synced: false,
        resolvedTitle,
        resolvedArtist,
        source: "youtube-description",
      });
    }

    return NextResponse.json({
      lines: [],
      synced: false,
      resolvedTitle,
      resolvedArtist,
    });
  } catch {
    return NextResponse.json({ lines: [], synced: false });
  }
}
