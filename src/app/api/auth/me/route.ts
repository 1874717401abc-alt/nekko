import { NextResponse } from "next/server";
import { getCurrentUser, isGuest } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (user) {
    return NextResponse.json({ user, guest: false });
  }
  if (await isGuest()) {
    return NextResponse.json({ user: null, guest: true });
  }
  return NextResponse.json({ error: "未登录" }, { status: 401 });
}
