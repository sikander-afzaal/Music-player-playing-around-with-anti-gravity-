import { NextRequest, NextResponse } from "next/server";
import { verifySignedSessionToken } from "../../../../lib/totpAuth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("pulseify_kc_session")?.value;
  const session = verifySignedSessionToken(token);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isVercel = Boolean(process.env.VERCEL);
  const spotifyClientId = isVercel
    ? process.env.NEXT_PUBLIC_SPOTIFY_PROD_CLIENT_ID ||
      "1f12a5bda93447f8849db99ad54d23d5"
    : process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ||
      "1f12a5bda93447f8849db99ad54d23d5";
  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    "";
  const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
  const refreshToken =
    process.env.PULSEIFY_SPOTIFY_REFRESH_TOKEN ||
    req.cookies.get("pulseify_spotify_rt")?.value ||
    "";
  let accessToken = process.env.PULSEIFY_SPOTIFY_ACCESS_TOKEN || "";
  let newRefreshToken = refreshToken;

  if (refreshToken && spotifyClientId) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };
      if (spotifyClientSecret) {
        const basic = Buffer.from(
          `${spotifyClientId}:${spotifyClientSecret}`
        ).toString("base64");
        headers["Authorization"] = `Basic ${basic}`;
      }
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers,
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: spotifyClientId,
        }),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          accessToken = String(data.access_token);
        }
        if (data.refresh_token) {
          newRefreshToken = String(data.refresh_token);
        }
      }
    } catch {
      // Fallback to stored access token if available
    }
  }

  return NextResponse.json({
    spotifyClientId,
    googleClientId,
    spotifyAccessToken: accessToken || null,
    spotifyRefreshToken: newRefreshToken || null,
  });
}
