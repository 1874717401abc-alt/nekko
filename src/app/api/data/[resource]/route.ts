import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordItemActivity } from "@/lib/activity";
import { insertDataItem, isAllowedResource, isItemResource, readData } from "@/lib/store";
import { createResourceItem } from "@/lib/resourceRules";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { resource } = await params;
  if (!isAllowedResource(resource)) {
    return NextResponse.json({ error: "unknown resource" }, { status: 404 });
  }
  const data = await readData(resource);
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { resource } = await params;
  if (!isItemResource(resource)) {
    return NextResponse.json({ error: "unknown resource" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const result = createResourceItem(resource, body as Record<string, unknown>, user);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const item = insertDataItem(resource, result.item);
  recordItemActivity(resource === "checkins" ? "checkin" : "create", resource, item, user);
  return NextResponse.json(item, { status: 201 });
}

export async function PUT() {
  return NextResponse.json(
    { error: "整表覆盖已关闭，请使用新增、编辑或删除操作。" },
    { status: 405 }
  );
}
