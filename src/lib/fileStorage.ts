import path from "path";

export const UPLOADS_ROOT = path.join(process.cwd(), "data", "uploads");

export function uploadDir(category: string): string {
  return path.join(UPLOADS_ROOT, category);
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extFromDataUrl(dataUrl: string): { mime: string; ext: string; base64: string } | null {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const ext = MIME_TO_EXT[mime];
  if (!ext) return null;
  return { mime, ext, base64: match[2] };
}

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
