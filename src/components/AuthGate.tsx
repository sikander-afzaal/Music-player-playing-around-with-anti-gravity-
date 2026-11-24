"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Smartphone,
  KeyRound,
  QrCode,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Disc3,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

interface AuthGateProps {
  onAuthenticated: (email: string) => void;
  keycloakIssuer?: string | null;
}

export default function AuthGate({
  onAuthenticated,
  keycloakIssuer,
}: AuthGateProps) {
  const [email, setEmail] = useState("sikander.aaa@gmail.com");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enrollment / QR Pairing state
  const [showEnroll, setShowEnroll] = useState(false);
  const [setupPasscode, setSetupPasscode] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollmentData, setEnrollmentData] = useState<{
    secret: string;
    otpauthUri: string;
    issuer: string;
    account: string;
  } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.replace(/\s+/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        setError(data.error || "Authentication failed.");
      } else {
        onAuthenticated(data.email);
      }
    } catch {
      setError("Network error while verifying Authenticator code.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockQr = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError(null);
    setEnrollLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          setupPasscode: setupPasscode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEnrollError(data.error || "Invalid setup passcode.");
      } else {
        setEnrollmentData(data);
      }
    } catch {
      setEnrollError("Could not load Authenticator setup key.");
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (!enrollmentData?.secret) return;
    navigator.clipboard.writeText(enrollmentData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const formatSecretGroups = (s: string) =>
    s.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#07080C] px-4 py-10 overflow-hidden">
      {/* Ambient Background Studio Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[440px] w-[780px] rounded-full bg-[#1ED760]/10 blur-[150px]" />
        <div className="absolute bottom-[-160px] right-[-100px] h-[360px] w-[520px] rounded-full bg-indigo-500/10 blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/12 bg-[#0E1118]/95 p-7 shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        {/* Top Brand & Keycloak Security Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1ED760] to-emerald-600 text-black shadow-lg shadow-[#1ED760]/25">
            <Disc3 className="h-8 w-8 animate-[spin_10s_linear_infinite]" />
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0E1118] bg-[#10131C] text-[#1ED760]">
              <Lock className="h-3 w-3" />
            </div>
          </div>

          <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-[#1ED760]/30 bg-[#1ED760]/10 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[#1ED760]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Keycloak Realm • TOTP 2FA Gate</span>
          </div>

          <h1 className="mt-2.5 text-2xl font-black tracking-tight text-white">
            Pulseify Access Control
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Restricted exclusively to allowlisted users with an enrolled
            Authenticator App (Google / Microsoft Authenticator).
          </p>
        </div>

        {/* Main TOTP Login Form */}
        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Allowlisted User Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sikander.aaa@gmail.com"
              className="w-full rounded-xl border border-white/12 bg-[#07080C] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#1ED760] focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-[#1ED760]" />
                6-Digit Authenticator Code
              </span>
              <span className="text-[10px] font-normal text-slate-400">
                RFC 6238 • 30s
              </span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              required
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/[^0-9\s]/g, ""))
              }
              placeholder="000 000"
              className="w-full rounded-xl border border-white/15 bg-[#07080C] px-4 py-3 text-center font-mono-tabular text-xl font-black tracking-[0.35em] text-[#1ED760] placeholder-slate-700 focus:border-[#1ED760] focus:outline-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1ED760] px-4 py-3 text-xs font-extrabold text-black shadow-lg shadow-[#1ED760]/20 hover:bg-[#22e668] transition cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            <span>
              {loading
                ? "Verifying Keycloak TOTP..."
                : "Verify & Unlock Pulseify"}
            </span>
          </button>

          {keycloakIssuer && (
            <a
              href={`${keycloakIssuer}/protocol/openid-connect/auth?client_id=${encodeURIComponent(
                process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "pulseify-web"
              )}&response_type=code&scope=openid%20email%20profile&redirect_uri=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.origin : ""
              )}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition"
            >
              <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
              <span>Sign In with External Keycloak OIDC SSO</span>
            </a>
          )}
        </form>

        {/* Authenticator App Pairing / QR Drawer */}
        <div className="mt-6 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => setShowEnroll((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.07] hover:text-white transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-[#1ED760]" />
              <span>Pair Authenticator App (QR Code Setup)</span>
            </span>
            {showEnroll ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showEnroll && (
            <div className="mt-3 rounded-2xl border border-white/10 bg-[#07080C] p-4 space-y-3">
              {!enrollmentData ? (
                <form onSubmit={handleUnlockQr} className="space-y-3">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Enter your <strong className="text-white">Master Setup Passcode</strong>{" "}
                    to display your TOTP QR code for Google Authenticator,
                    Microsoft Authenticator, or Authy.
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="password"
                        value={setupPasscode}
                        onChange={(e) => setSetupPasscode(e.target.value)}
                        placeholder="Master Setup Passcode"
                        className="w-full rounded-xl border border-white/12 bg-[#0E1118] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-[#1ED760] focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={enrollLoading}
                      className="rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer"
                    >
                      {enrollLoading ? "..." : "Show QR"}
                    </button>
                  </div>
                  {enrollError && (
                    <p className="text-[11px] text-rose-400">{enrollError}</p>
                  )}
                </form>
              ) : (
                <div className="space-y-3 text-center">
                  <div className="mx-auto inline-block rounded-2xl bg-white p-3 shadow-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&ecc=M&data=${encodeURIComponent(
                        enrollmentData.otpauthUri
                      )}`}
                      alt="TOTP Authenticator QR Code"
                      width={160}
                      height={160}
                      className="h-40 w-40"
                    />
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Scan with <strong>Google Authenticator</strong> or{" "}
                    <strong>Microsoft Authenticator</strong>, or enter this
                    Base32 key manually:
                  </p>
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0E1118] px-3 py-2">
                    <code className="font-mono-tabular text-[11px] font-bold text-[#1ED760] select-all">
                      {formatSecretGroups(enrollmentData.secret)}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-white hover:bg-white/20 cursor-pointer"
                    >
                      {copiedSecret ? (
                        <>
                          <Check className="h-3 w-3 text-[#1ED760]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
