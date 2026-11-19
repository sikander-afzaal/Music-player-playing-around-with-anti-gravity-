import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ tracks: [], totalCount: 0 }, { status: 400 });
  }

  try {
    const embedUrl = `https://open.spotify.com/embed/playlist/${encodeURIComponent(
      id
    )}`;
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ tracks: [], totalCount: 0 });
    }

    const html = await res.text();
    const match = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    );
    if (!match?.[1]) {
      return NextResponse.json({ tracks: [], totalCount: 0 });
    }

    const nextData = JSON.parse(match[1]);
    const entity =
      nextData?.props?.pageProps?.state?.data?.entity ||
      nextData?.props?.pageProps?.state?.data?.defaultAudioEntity;

    const trackList: Record<string, unknown>[] =
      entity?.trackList || entity?.tracks?.items || [];
    const coverFromEntity: string =
      entity?.coverArt?.sources?.[0]?.url ||
      entity?.images?.[0]?.url ||
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80";

    const tracks = trackList
      .map((item: Record<string, unknown>, idx: number) => {
        const uri = String(item.uri || "");
        const trackId =
          String(item.id || "") ||
          (uri.includes("spotify:track:") ? uri.split("spotify:track:")[1] : "");
        if (!trackId) return null;

        const durationMs = Number(item.duration || item.duration_ms || 210000);
        const totalSec = Math.floor(durationMs / 1000);
        const duration = `${Math.floor(totalSec / 60)}:${String(
          totalSec % 60
        ).padStart(2, "0")}`;

        const coverObj = item.coverArt as
          | { sources?: { url: string }[] }
          | undefined;

        return {
          id: trackId,
          spotifyTrackId: trackId,
          title: String(item.title || item.name || "Track"),
          artistName: String(item.subtitle || "Artist").replace(/\u00a0/g, " "),
          coverUrl: coverObj?.sources?.[0]?.url || coverFromEntity,
          duration,
          idx,
        };
      })
      .filter(Boolean);

    // Reverse so the newest added tracks (at the end of the Spotify playlist) are on top!
    const reversed = [...tracks].reverse();

    return NextResponse.json({
      tracks: reversed,
      totalCount: reversed.length,
    });
  } catch {
    return NextResponse.json({ tracks: [], totalCount: 0 });
  }
}
