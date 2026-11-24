import { NextRequest, NextResponse } from "next/server";
import {
  createSignedSessionToken,
  isEmailAllowed,
  verifyTotpCode,
} from "../../../../lib/totpAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const code = String(body?.code || "").trim();

    if (!email) {
      return NextResponse.json(
        { error: "Please enter your allowlisted email address." },
        { status: 400 }
      );
    }

    if (!isEmailAllowed(email)) {
      return NextResponse.json(
        {
          error:
            "Access Denied — Your account is not in the Pulseify Keycloak Realm allowlist.",
        },
        { status: 403 }
      );
    }

    if (!verifyTotpCode(code)) {
      return NextResponse.json(
        {
          error:
            "Invalid 6-digit Authenticator App code. Open your Authenticator app or click 'Pair Authenticator App' below.",
        },
        { status: 401 }
      );
    }

    const sessionToken = createSignedSessionToken(email);
    const res = NextResponse.json({
      authenticated: true,
      email,
      role: "admin",
    });

    res.cookies.set("pulseify_kc_session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Failed to process authentication request." },
      { status: 500 }
    );
  }
}
