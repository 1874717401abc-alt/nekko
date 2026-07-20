import { NextRequest, NextResponse } from "next/server";
import { GUEST_COOKIE, GUEST_COOKIE_MAX_AGE, isSecureRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GUEST_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  });
  return res;
}
