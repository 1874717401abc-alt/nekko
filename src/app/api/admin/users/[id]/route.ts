import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { setUserAdmin } from "@/lib/users";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.isOwner) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.isAdmin !== "boolean") {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  if (id === user.id) {
    return NextResponse.json({ error: "不能修改自己的权限" }, { status: 400 });
  }

  const updated = setUserAdmin(id, body.isAdmin);
  if (!updated) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
