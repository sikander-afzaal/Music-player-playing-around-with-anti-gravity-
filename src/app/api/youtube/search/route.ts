import { NextRequest, NextResponse } from "next/server";
import { YouTubeTrackItem } from "../../../../types/spotify";

function extractYtInitialData(html: string): Record<string, unknown> | null {
  const match =
    html.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/) ||
    html.match(/window\["ytInitialData"\]\s*=\s*(\{[\s\S]*?\});/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function cleanSongTitleAndArtist(
  rawTitle: string,
  channelName: string
): { title: string; artist: string } {
  const cleanedChannel = channelName
    .replace(/\s*-\s*Topic$/i, "")
    .replace(/VEVO$/i, "")
    .replace(/\s*Official$/i, "")
    .replace(/\s*Music$/i, "")
    .trim();

  // Strip parenthetical/bracketed tags like (Official Music Video), [4K], (Lyrics), etc.
  const stripped = rawTitle
    .replace(
      /\s*[([](Official\s*(Music\s*)?Video|Official\s*Audio|Music\s*Video|Lyric\s*Video|Lyrics|Audio|Video|HD|4K|Visualizer|Full\s*Video|Full\s*Song|Unplugged|Live[^)\]]*)[)\]]/gi,
      ""
    )
    .trim();

  // Split by pipe "|" or dash " - " / " – " / " — "
  const parts = stripped
    .split(/\s*(?:\||-|\u2013|\u2014)\s*/)
    .map((p) => p.replace(/^["']|["']$/g, "").trim())
    .filter((p) => p.length > 0)
    // Filter out segments that are just noise like "Official Video", "Coke Studio Season 14", "Season 15"
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

    // Case 1: "Bayaan | Teri Tasveer" or "Bayaan - Nahin Milta" (First part is the artist/channel)
    if (
      chLower &&
      (firstLower === chLower ||
        chLower.includes(firstLower) ||
        firstLower.includes(chLower))
    ) {
      return {
        artist: parts[0],
        title: parts[1],
      };
    }

    // Case 2: "Teri Tasveer - Bayaan" (Second part is the artist/channel)
    if (
      chLower &&
      (secondLower === chLower ||
        chLower.includes(secondLower) ||
        secondLower.includes(chLower))
    ) {
      return {
        title: parts[0],
        artist: parts[1],
      };
    }

    // Default for "Artist - Song": parts[0] is Artist, parts[1] is Song Title
    return {
      artist: parts[0],
      title: parts[1],
    };
  }

  return {
    title: parts[0] || stripped || rawTitle,
    artist: cleanedChannel || channelName || "YouTube Artist",
  };
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();
  const playlistId = req.nextUrl.searchParams.get("playlistId")?.trim();

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    // 1. PLAYLIST FETCH MODE (?playlistId=PL...)
    if (playlistId) {
      const plUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(
        playlistId
      )}`;
      const res = await fetch(plUrl, { headers, next: { revalidate: 300 } });
      if (!res.ok) {
        return NextResponse.json({ tracks: [], playlistTitle: "Playlist" });
      }
      const html = await res.text();
      const data = extractYtInitialData(html) as Record<string, any> | null;
      if (!data) {
        return NextResponse.json({ tracks: [], playlistTitle: "Playlist" });
      }

      const playlistTitle =
        data?.metadata?.playlistMetadataRenderer?.title ||
        data?.header?.playlistHeaderRenderer?.title?.simpleText ||
        "YouTube Playlist";

      const tabs =
        data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
      const sectionContents =
        tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      const itemSection =
        sectionContents[0]?.itemSectionRenderer?.contents || [];
      const videoList =
        itemSection[0]?.playlistVideoListRenderer?.contents || [];

      const tracks: YouTubeTrackItem[] = [];
      for (const entry of videoList) {
        const v = entry?.playlistVideoRenderer;
        if (!v || !v.videoId) continue;
        const rawTitle =
          v.title?.runs?.[0]?.text || v.title?.simpleText || "Track";
        const channel =
          v.shortBylineText?.runs?.[0]?.text || "YouTube Music";
        const duration =
          v.lengthText?.simpleText ||
          v.lengthText?.runs?.[0]?.text ||
          "3:30";
        const { title, artist } = cleanSongTitleAndArtist(rawTitle, channel);

        tracks.push({
          videoId: String(v.videoId),
          title,
          artistName: artist,
          coverUrl: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          duration,
          viewsText: v.videoInfo?.runs?.[0]?.text || "Playlist Track",
        });
      }

      return NextResponse.json({ tracks, playlistTitle });
    }

    // 2. SEARCH MODE (?q=...)
    if (!query) {
      return NextResponse.json({ tracks: [] }, { status: 400 });
    }

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      query
    )}`;
    const res = await fetch(searchUrl, { headers, next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json({ tracks: [] });
    }

    const html = await res.text();
    const data = extractYtInitialData(html) as Record<string, any> | null;
    if (!data) {
      return NextResponse.json({ tracks: [] });
    }

    const primaryContents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents || [];

    const tracks: YouTubeTrackItem[] = [];
    for (const section of primaryContents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item?.videoRenderer;
        if (!v || !v.videoId) continue;

        const rawTitle =
          v.title?.runs?.[0]?.text || v.title?.simpleText || "Untitled";
        const channel =
          v.ownerText?.runs?.[0]?.text ||
          v.longBylineText?.runs?.[0]?.text ||
          "YouTube Artist";
        const duration =
          v.lengthText?.simpleText ||
          v.lengthText?.runs?.[0]?.text ||
          "LIVE";
        const viewsText =
          v.shortViewCountText?.simpleText ||
          v.shortViewCountText?.runs?.[0]?.text ||
          v.viewCountText?.simpleText ||
          "1M views";
        const publishedText =
          v.publishedTimeText?.simpleText || "";

        const { title, artist } = cleanSongTitleAndArtist(rawTitle, channel);

        tracks.push({
          videoId: String(v.videoId),
          title,
          artistName: artist,
          coverUrl: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          duration,
          viewsText,
          publishedText,
        });

        if (tracks.length >= 24) break;
      }
      if (tracks.length >= 24) break;
    }

    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json({ tracks: [] });
  }
}
