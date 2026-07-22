import { randomUUID } from "crypto";
import dns from "dns/promises";
import net from "net";
import type { AiAttachment } from "@/lib/types";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_URL_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 18_000;
const MAX_URLS_PER_MESSAGE = 3;

const textExtensions = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".html",
  ".htm",
  ".xml",
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".log",
]);

function makeAttachmentId() {
  return `ai-att-${randomUUID()}`;
}

function trimText(text: string, max = MAX_TEXT_CHARS) {
  const normalized = text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}\n\n[内容过长，已截断]`;
}

function extensionFromName(name: string) {
  const match = name.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? "";
}

function isTextLike(name: string, mimeType: string) {
  const ext = extensionFromName(name);
  return (
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("xml") ||
    mimeType.includes("csv") ||
    textExtensions.has(ext)
  );
}

function htmlToText(html: string) {
  return trimText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
  );
}

async function parsePdf(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return trimText(result.text || "");
  } finally {
    await parser.destroy();
  }
}

async function parseDocx(buffer: Buffer) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return trimText(result.value || "");
}

export async function extractTextFromBuffer(input: {
  buffer: Buffer;
  name: string;
  mimeType: string;
}): Promise<string> {
  const { buffer, name, mimeType } = input;
  const ext = extensionFromName(name);

  if (mimeType.includes("pdf") || ext === ".pdf") {
    return parsePdf(buffer);
  }
  if (
    mimeType.includes("wordprocessingml.document") ||
    mimeType.includes("msword") ||
    ext === ".docx"
  ) {
    return parseDocx(buffer);
  }
  if (mimeType.includes("html") || ext === ".html" || ext === ".htm") {
    return htmlToText(buffer.toString("utf-8"));
  }
  if (isTextLike(name, mimeType)) {
    return trimText(buffer.toString("utf-8"));
  }

  throw new Error("暂不支持这种文件格式，请上传 txt、md、csv、json、html、pdf 或 docx。");
}

function isPrivateIp(address: string) {
  const version = net.isIP(address);
  if (version === 0) return true;

  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    );
  }

  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

async function assertPublicUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("只支持 http 或 https 链接。");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    throw new Error("不能读取本地或内网链接。");
  }

  const addresses = await dns.lookup(hostname, { all: true });
  if (addresses.length === 0 || addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("不能读取本地或内网链接。");
  }
}

export async function extractAttachmentFromFile(file: File): Promise<AiAttachment> {
  if (file.size <= 0) {
    throw new Error("文件为空。");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("文件太大了，单个文件最大 12MB。");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractTextFromBuffer({
    buffer,
    name: file.name || "未命名文件",
    mimeType: file.type || "application/octet-stream",
  });

  if (!text) {
    throw new Error("没有从文件里提取到可阅读文字。");
  }

  return {
    id: makeAttachmentId(),
    kind: "upload",
    name: file.name || "未命名文件",
    mimeType: file.type || undefined,
    size: file.size,
    text,
  };
}

function extractUrls(text: string) {
  const matches = text.match(/https?:\/\/[^\s<>"')\]]+/g) ?? [];
  return [...new Set(matches.map((item) => item.replace(/[.,;，。；]+$/, "")))].slice(
    0,
    MAX_URLS_PER_MESSAGE
  );
}

async function readResponseBuffer(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return Buffer.from(await response.arrayBuffer());

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_URL_BYTES) {
      throw new Error("链接内容太大，已停止读取。");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function extractAttachmentFromUrl(rawUrl: string): Promise<AiAttachment> {
  let url: URL;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    url = new URL(rawUrl);
    await assertPublicUrl(url);
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 12_000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Nekko-AI-Assistant/1.0",
        Accept:
          "text/html,text/plain,application/json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*;q=0.8",
      },
    });
    if (!response.ok) {
      throw new Error(`链接返回 ${response.status}`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_URL_BYTES) {
      throw new Error("链接内容太大。");
    }

    const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
    const buffer = await readResponseBuffer(response);
    const pathnameName = decodeURIComponent(url.pathname.split("/").pop() || url.hostname);
    const name = pathnameName.includes(".") ? pathnameName : url.hostname;
    const text = await extractTextFromBuffer({ buffer, name, mimeType });

    return {
      id: makeAttachmentId(),
      kind: "link",
      name,
      mimeType: mimeType || undefined,
      size: buffer.byteLength,
      url: url.toString(),
      text,
    };
  } catch (error) {
    return {
      id: makeAttachmentId(),
      kind: "link",
      name: rawUrl.slice(0, 120),
      url: rawUrl,
      text: "",
      error: error instanceof Error ? error.message : "链接读取失败。",
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function extractUrlAttachmentsFromText(text: string): Promise<AiAttachment[]> {
  const urls = extractUrls(text);
  if (urls.length === 0) return [];
  return Promise.all(urls.map((url) => extractAttachmentFromUrl(url)));
}
