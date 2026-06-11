import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateUser } from "@/lib/users";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : undefined;
  const role = typeof body?.role === "string" ? body.role.trim() : undefined;
  const bio = typeof body?.bio === "string" ? body.bio.trim() : undefined;
  const focus = Array.isArray(body?.focus)
    ? body.focus.filter((f: unknown) => typeof f === "string" && f.trim()).map((f: string) => f.trim())
    : undefined;
  const contact = typeof body?.contact === "string" ? body.contact.trim() : undefined;

  if (displayName !== undefined && !displayName) {
    return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
  }

  const updated = updateUser(user.id, { displayName, role, bio, focus, contact });
  return NextResponse.json(updated);
}
