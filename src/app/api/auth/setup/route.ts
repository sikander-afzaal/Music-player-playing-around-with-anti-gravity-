import { NextRequest, NextResponse } from "next/server";
import {
  buildOtpAuthUri,
  getSetupPasscode,
  getTotpSecret,
  isEmailAllowed,
} from "../../../../lib/totpAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const setupPasscode = String(body?.setupPasscode || "").trim();

    if (!isEmailAllowed(email)) {
      return NextResponse.json(
        {
          error:
            "Access Denied — Only allowlisted users can enroll an Authenticator App.",
        },
        { status: 403 }
      );
    }

    if (!setupPasscode || setupPasscode !== getSetupPasscode()) {
      return NextResponse.json(
        {
          error: "Invalid master setup passcode.",
        },
        { status: 401 }
      );
    }

    const secret = getTotpSecret();
    const otpauthUri = buildOtpAuthUri(email, secret, "Pulseify Keycloak");

    return NextResponse.json({
      secret,
      otpauthUri,
      issuer: "Pulseify Keycloak",
      account: email,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate Authenticator App enrollment key." },
      { status: 500 }
    );
  }
}
