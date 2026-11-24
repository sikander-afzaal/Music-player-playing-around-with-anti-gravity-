"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Radio,
  LogOut,
} from "lucide-react";
import { getSavedClientId, initiateSpotifyPkceLogin } from "../lib/spotifyAuth";
import { SpotifyUserProfile } from "../types/spotify";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SpotifyUserProfile | null;
  onActivateDemo: () => void;
  onLogout: () => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  user,
  onActivateDemo,
  onLogout,
}: LoginModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRealOAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await initiateSpotifyPkceLogin(getSavedClientId());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start Spotify OAuth."
      );
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#10131C] p-6 shadow-2xl overflow-hidden">
        {/* Ambient green glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#1ED760]/15 blur-3xl" />

        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1ED760]/15 border border-[#1ED760]/40 text-[#1ED760]">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Connect to Spotify
              </h2>
              <p className="text-xs text-slate-400">
                Unlock personal top artists, tracks, playlists &amp; live sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
            aria-label="Close login modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {user ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-[#1ED760]/30 bg-[#1ED760]/10 p-4">
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="h-14 w-14 rounded-full object-cover border-2 border-[#1ED760]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">
                    {user.displayName}
                  </span>
                  <span className="rounded-full bg-[#1ED760]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1ED760]">
                    {user.isDemo ? "Demo VIP" : user.product}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{user.email}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Market: {user.country} • {user.followers.toLocaleString()}{" "}
                  followers
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Disconnect Account
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-[#1ED760] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#1fdf64] transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* Primary 1-Click Official Spotify OAuth PKCE */}
            <div className="rounded-xl border border-[#1ED760]/35 bg-gradient-to-br from-[#1ED760]/15 via-[#161B28] to-[#10131C] p-4 space-y-3">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#1ED760]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#1ED760]">
                  <ShieldCheck className="h-3.5 w-3.5" /> Official OAuth 2.0 PKCE
                </span>
                <h3 className="mt-1.5 text-sm font-bold text-white">
                  Sign In with Your Real Spotify Account
                </h3>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  Directly connects using your pre-configured Spotify Client ID
                  to sync your playlists, liked songs, top artists, and top
                  tracks.
                </p>
              </div>

              {error && (
                <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleRealOAuth}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1ED760] px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-[#1ED760]/20 hover:bg-[#22e668] transition cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                {loading
                  ? "Redirecting to Spotify..."
                  : "Continue with Spotify"}
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-white/10" />
              <span className="bg-[#10131C] px-3 text-[11px] uppercase tracking-wider text-slate-500">
                Or Preview Demo Vault
              </span>
              <div className="w-full border-t border-white/10" />
            </div>

            <button
              type="button"
              onClick={() => {
                onActivateDemo();
                onClose();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-[#1ED760]" />
              <CheckCircle2 className="h-3.5 w-3.5 text-[#1ED760]" />
              Launch Instant Demo Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
