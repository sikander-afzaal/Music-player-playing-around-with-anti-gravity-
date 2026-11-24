import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// Default Base32 TOTP secret (overridden by PULSEIFY_TOTP_SECRET in .env.local / Vercel Env)
const DEFAULT_TOTP_SECRET = "JBSWY3DPEHPK3PXP247AC5LQMVZGC43F";
const DEFAULT_ALLOWED_EMAILS = [
  "sikander.aaa@gmail.com",
  "sikanderbusiness85@gmail.com",
];
const DEFAULT_SETUP_PASSCODE = "pulseify-admin-2026";
const DEFAULT_SESSION_SECRET =
  "pulseify-keycloak-hmac-session-secret-9f4e2a7c1b8d";

export function getTotpSecret(): string {
  const raw = (process.env.PULSEIFY_TOTP_SECRET || DEFAULT_TOTP_SECRET)
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, "");
  return raw || DEFAULT_TOTP_SECRET;
}

export function getAllowedEmails(): string[] {
  const raw = process.env.PULSEIFY_ALLOWED_EMAILS;
  if (!raw || !raw.trim()) return DEFAULT_ALLOWED_EMAILS;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string): boolean {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return false;
  return getAllowedEmails().includes(normalized);
}

export function getSetupPasscode(): string {
  return (process.env.PULSEIFY_SETUP_PASSCODE || DEFAULT_SETUP_PASSCODE).trim();
}

function getSessionSecret(): string {
  return process.env.PULSEIFY_SESSION_SECRET || DEFAULT_SESSION_SECRET;
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function generateTotpCode(
  secretBase32: string = getTotpSecret(),
  timestampMs: number = Date.now(),
  stepSeconds: number = 30,
  digits: number = 6
): string {
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  const counterBuf = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  const key = base32Decode(secretBase32);
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return String(otp).padStart(digits, "0");
}

export function verifyTotpCode(
  code: string,
  secretBase32: string = getTotpSecret(),
  timestampMs: number = Date.now(),
  windowSteps: number = 1
): boolean {
  const cleanCode = (code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanCode)) return false;

  for (let w = -windowSteps; w <= windowSteps; w++) {
    const candidate = generateTotpCode(
      secretBase32,
      timestampMs + w * 30_000,
      30,
      6
    );
    if (candidate === cleanCode) {
      return true;
    }
  }
  return false;
}

export function buildOtpAuthUri(
  email: string,
  secretBase32: string = getTotpSecret(),
  issuer: string = "Pulseify Keycloak"
): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(
    email.trim().toLowerCase()
  )}`;
  return `otpauth://totp/${label}?secret=${encodeURIComponent(
    secretBase32
  )}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export interface KeycloakSessionPayload {
  email: string;
  role: "admin" | "allowed_user";
  iat: number;
  exp: number;
}

export function createSignedSessionToken(
  email: string,
  ttlSeconds: number = 60 * 60 * 24 * 30
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: KeycloakSessionPayload = {
    email: email.trim().toLowerCase(),
    role: "admin",
    iat: now,
    exp: now + ttlSeconds,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifySignedSessionToken(
  token: string | undefined | null
): KeycloakSessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payloadB64)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as KeycloakSessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!parsed.exp || parsed.exp < now) return null;
    if (!isEmailAllowed(parsed.email)) return null;
    return parsed;
  } catch {
    return null;
  }
}
