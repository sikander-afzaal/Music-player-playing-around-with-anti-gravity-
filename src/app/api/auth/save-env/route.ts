import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dump = body?.dump || {};

    // Only write to local disk during local development
    if (process.env.NODE_ENV !== "production") {
      const scratchPath =
        "C:\\Users\\sikan\\.gemini\\antigravity\\brain\\e22d9576-f47d-4995-907e-53566f881b17\\scratch\\recovered_session.json";
      let existing: Record<string, string> = {};
      try {
        if (fs.existsSync(scratchPath)) {
          existing = JSON.parse(fs.readFileSync(scratchPath, "utf8"));
        }
      } catch {
        // ignore
      }

      const merged = { ...existing, ...dump };
      fs.writeFileSync(scratchPath, JSON.stringify(merged, null, 2), "utf8");

      const envPath = path.join(process.cwd(), ".env.local");
      let envText = "";
      try {
        if (fs.existsSync(envPath)) {
          envText = fs.readFileSync(envPath, "utf8");
        }
      } catch {
        // ignore
      }

      const upsertEnv = (key: string, val: string) => {
        if (!val) return;
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(envText)) {
          envText = envText.replace(regex, `${key}=${val}`);
        } else {
          envText = `${envText.trimEnd()}\n${key}=${val}\n`;
        }
      };

      if (merged.pulseify_spotify_client_id) {
        upsertEnv(
          "NEXT_PUBLIC_SPOTIFY_CLIENT_ID",
          merged.pulseify_spotify_client_id
        );
      }
      if (merged.pulseify_google_client_id) {
        upsertEnv(
          "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
          merged.pulseify_google_client_id
        );
      }
      if (merged.pulseify_spotify_refresh_token) {
        upsertEnv(
          "PULSEIFY_SPOTIFY_REFRESH_TOKEN",
          merged.pulseify_spotify_refresh_token
        );
      }
      if (merged.pulseify_spotify_access_token) {
        upsertEnv(
          "PULSEIFY_SPOTIFY_ACCESS_TOKEN",
          merged.pulseify_spotify_access_token
        );
      }

      fs.writeFileSync(envPath, envText, "utf8");
    }

    const res = NextResponse.json({
      ok: true,
      keysCount: Object.keys(dump).length,
    });

    if (dump.pulseify_spotify_refresh_token) {
      res.cookies.set(
        "pulseify_spotify_rt",
        String(dump.pulseify_spotify_refresh_token),
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 365, // 1 year
        }
      );
    }

    return res;
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: 500 }
    );
  }
}
