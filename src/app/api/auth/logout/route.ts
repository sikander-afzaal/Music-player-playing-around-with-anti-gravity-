import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ authenticated: false });
  res.cookies.set("pulseify_kc_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
