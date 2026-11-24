"use client";

import React, { useEffect, useState } from "react";

const KEYS_TO_SYNC = [
  "pulseify_spotify_client_id",
  "pulseify_spotify_redirect_uri",
  "pulseify_spotify_access_token",
  "pulseify_spotify_refresh_token",
  "pulseify_spotify_expires_at",
  "pulseify_user_profile",
  "pulseify_user_vault_v4",
  "pulseify_playlist_last_played",
  "pulseify_google_client_id",
  "pulseify_google_redirect_uri",
  "pulseify_google_access_token",
  "pulseify_google_profile",
  "pulseify_yt_liked_videos",
  "pulseify_yt_playlists",
];

export default function SyncBridgePage() {
  const [status, setStatus] = useState("Syncing local session to env...");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dump: Record<string, string> = {};
    for (const k of KEYS_TO_SYNC) {
      const val = window.localStorage.getItem(k);
      if (val) {
        dump[k] = val;
      }
    }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "PULSEIFY_STORAGE_BRIDGE",
          dump,
        },
        "*"
      );
    }

    if (Object.keys(dump).length > 0) {
      fetch("/api/auth/save-env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dump }),
      })
        .then(() => setStatus(`Synced ${Object.keys(dump).length} keys`))
        .catch(() => setStatus("Sync failed"));
    } else {
      setStatus("No keys in this origin");
    }
  }, []);

  return (
    <div className="p-4 text-xs text-slate-400 bg-[#07080C]">{status}</div>
  );
}
