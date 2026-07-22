import { randomUUID } from "crypto";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { recordItemActivity } from "@/lib/activity";
import { extractTextFromBuffer } from "@/lib/aiSources";
import { getCurrentUser } from "@/lib/auth";
import { createResourceItem } from "@/lib/resourceRules";
import { insertDataItem, listDataItems } from "@/lib/store";
import type { Project, ProjectAsset, ProjectAssetKind } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 40 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "project-assets");
const ACCEPTED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain", "text/markdown", "text/csv", "application/json",
]);
const ACCEPTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov", ".pdf", ".doc", ".docx", ".txt", ".md", ".csv", ".json"]);

function cleanExtension(name: string) {
  const ext = path.extname(name).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : "";
}

function inferKind(mimeType: string): ProjectAssetKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const projectId = String(form?.get("projectId") ?? "").trim();
  if (!(file instanceof File) || !projectId) {
    return NextResponse.json({ error: "请选择项目和文件。" }, { status: 400 });
  }
  if (!listDataItems<Project>("projects").some((project) => project.id === projectId)) {
    return NextResponse.json({ error: "项目不存在。" }, { status: 404 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "单个文件需要小于 40MB。" }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ACCEPTED_MIME.has(mimeType) && !ACCEPTED_EXTENSIONS.has(cleanExtension(file.name))) {
    return NextResponse.json({ error: "暂不支持这种文件格式。" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storedName = `${randomUUID()}${cleanExtension(file.name)}`;
  const storedPath = path.join(UPLOAD_DIR, storedName);

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(storedPath, buffer, { flag: "wx" });

    let extractedText: string | undefined;
    if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/")) {
      try {
        extractedText = await extractTextFromBuffer({ buffer, name: file.name, mimeType });
      } catch {
        extractedText = undefined;
      }
    }

    const requestedKind = String(form?.get("kind") ?? "") as ProjectAssetKind;
    const result = createResourceItem(
      "assets",
      {
        projectId,
        title: String(form?.get("title") ?? "").trim() || file.name,
        kind: requestedKind || inferKind(mimeType),
        fileName: file.name,
        storedName,
        mimeType,
        size: file.size,
        url: `/api/project-assets/${storedName}`,
        tags: String(form?.get("tags") ?? "").split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
        version: Number(form?.get("version")) || 1,
        note: String(form?.get("note") ?? "").trim(),
        extractedText,
      },
      user
    );
    if ("error" in result) throw new Error(result.error);
    const asset = insertDataItem("assets", result.item as ProjectAsset);
    recordItemActivity("create", "assets", asset, user);
    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    await rm(storedPath, { force: true }).catch(() => undefined);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "文件保存失败。" },
      { status: 400 }
    );
  }
}
