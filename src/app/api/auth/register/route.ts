import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE,
  createSessionToken,
  hashPassword,
  verifyInviteCode,
} from "@/lib/auth";
import { createUser, getUserByUsername } from "@/lib/users";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const inviteCode = typeof body?.inviteCode === "string" ? body.inviteCode : "";

  if (!username || !password || !displayName) {
    return NextResponse.json({ error: "请填写完整信息" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少需要 6 位" }, { status: 400 });
  }
  if (!verifyInviteCode(inviteCode)) {
    return NextResponse.json({ error: "邀请码不正确" }, { status: 401 });
  }
  if (getUserByUsername(username)) {
    return NextResponse.json({ error: "该用户名已被注册" }, { status: 409 });
  }

  const user = createUser({ username, passwordHash: hashPassword(password), displayName });

  const token = await createSessionToken(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
  return res;
}
