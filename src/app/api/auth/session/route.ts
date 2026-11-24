import { NextRequest, NextResponse } from "next/server";
import { verifySignedSessionToken } from "../../../../lib/totpAuth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("pulseify_kc_session")?.value;
  const session = verifySignedSessionToken(token);

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      keycloakIssuer: process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER || null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    email: session.email,
    role: session.role,
    keycloakIssuer: process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER || null,
  });
}
