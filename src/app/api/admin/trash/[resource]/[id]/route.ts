import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  hardDeleteDataItem,
  hardDeleteProjectAndUnlink,
  isItemResource,
  restoreDataItem,
  type ResourceItem,
} from "@/lib/store";
import { recordActivity } from "@/lib/activity";
import { removeProjectAssetFile } from "@/lib/projectAssets";
import { listAllDataItems } from "@/lib/store";

function titleFromItem(item: ResourceItem) {
  for (const key of ["title", "name", "note", "memberName"]) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "未命名";
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { resource, id } = await params;
  if (!isItemResource(resource)) {
    return NextResponse.json({ error: "unknown resource" }, { status: 404 });
  }

  const restored = restoreDataItem<ResourceItem>(resource, id);
  if (!restored) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  recordActivity({
    type: "restore",
    resource,
    resourceId: restored.id,
    title: titleFromItem(restored),
    summary: `${user.displayName} 恢复了「${titleFromItem(restored)}」`,
    projectId: typeof restored.projectId === "string" ? restored.projectId : undefined,
    user,
  });

  return NextResponse.json(restored);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { resource, id } = await params;
  if (!isItemResource(resource)) {
    return NextResponse.json({ error: "unknown resource" }, { status: 404 });
  }

  const projectAssetFiles = resource === "projects"
    ? listAllDataItems<ResourceItem>("assets").filter((item) => item.projectId === id).map((item) => item.storedName)
    : [];
  const deleted =
    resource === "projects"
      ? hardDeleteProjectAndUnlink(id)
      : hardDeleteDataItem<ResourceItem>(resource, id);
  if (!deleted) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  if (resource === "assets") await removeProjectAssetFile(deleted.storedName);
  if (resource === "projects") await Promise.all(projectAssetFiles.map(removeProjectAssetFile));

  recordActivity({
    type: "purge",
    resource,
    resourceId: deleted.id,
    title: titleFromItem(deleted),
    summary: `${user.displayName} 永久删除了「${titleFromItem(deleted)}」`,
    projectId: typeof deleted.projectId === "string" ? deleted.projectId : undefined,
    user,
  });

  return NextResponse.json({ ok: true });
}
