import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordItemActivity } from "@/lib/activity";
import {
  deleteDataItem,
  deleteProjectItem,
  isItemResource,
  listDataItems,
  updateDataItem,
  type ResourceItem,
} from "@/lib/store";
import {
  canDeleteResourceItem,
  canUpdateResourceItem,
  patchResourceItem,
} from "@/lib/resourceRules";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { resource, id } = await params;
  if (!isItemResource(resource)) {
    return NextResponse.json({ error: "unknown resource" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const existing = listDataItems<ResourceItem>(resource).find((item) => item.id === id);
  if (!existing) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  if (!canUpdateResourceItem(resource, existing, user)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const result = patchResourceItem(resource, existing, body as Record<string, unknown>);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const updated = updateDataItem<ResourceItem>(resource, id, () => result.item);
  if (!updated) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  recordItemActivity("update", resource, updated, user);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { resource, id } = await params;
  if (!isItemResource(resource)) {
    return NextResponse.json({ error: "unknown resource" }, { status: 404 });
  }

  const existing = listDataItems<ResourceItem>(resource).find((item) => item.id === id);
  if (!existing) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  if (!canDeleteResourceItem(resource, existing, user)) {
    return NextResponse.json({ error: "只有创建者或管理员可以删除" }, { status: 403 });
  }

  if (resource === "projects") {
    const ok = deleteProjectItem(id, user);
    if (ok) {
      recordItemActivity("delete", resource, existing, user);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  const deleted = deleteDataItem<ResourceItem>(resource, id, user);
  if (!deleted) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  recordItemActivity("delete", resource, deleted, user);
  return NextResponse.json({ ok: true });
}
