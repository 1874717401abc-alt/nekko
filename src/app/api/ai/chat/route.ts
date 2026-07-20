import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  buildAiSystemPrompt,
  buildAiWorkspaceContext,
  type AiMode,
} from "@/lib/aiWorkspace";

export const dynamic = "force-dynamic";

type ChatRole = "user" | "assistant";
type ChatMessage = {
  role: ChatRole;
  content: string;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

const modes = new Set<AiMode>(["strategy", "content", "review", "deep"]);
const MAX_HISTORY = 14;
const MAX_MESSAGE_CHARS = 5000;

function cleanMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value)) return null;

  const messages = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      if (record.role !== "user" && record.role !== "assistant") return null;
      if (typeof record.content !== "string") return null;
      const content = record.content.trim().slice(0, MAX_MESSAGE_CHARS);
      if (!content) return null;
      return { role: record.role, content };
    })
    .filter(Boolean) as ChatMessage[];

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return null;
  }

  return messages.slice(-MAX_HISTORY);
}

function cleanMode(value: unknown): AiMode {
  return typeof value === "string" && modes.has(value as AiMode)
    ? (value as AiMode)
    : "strategy";
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI 助手还没有配置 API Key。" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const messages = cleanMessages((body as Record<string, unknown> | null)?.messages);
  if (!messages) {
    return NextResponse.json({ error: "消息内容为空。" }, { status: 400 });
  }

  const mode = cleanMode((body as Record<string, unknown> | null)?.mode);
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(
    /\/$/,
    ""
  );
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
  const workspaceContext = await buildAiWorkspaceContext(user);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: buildAiSystemPrompt(mode, workspaceContext),
          },
          ...messages,
        ],
        thinking: { type: mode === "deep" ? "enabled" : "disabled" },
        reasoning_effort: "high",
        temperature: mode === "content" ? 0.8 : 0.55,
        max_tokens: mode === "deep" ? 1800 : 1200,
        stream: false,
      }),
    });

    const data = (await response.json().catch(() => null)) as DeepSeekResponse | null;
    if (!response.ok) {
      const detail = data?.error?.message ? `：${data.error.message}` : "";
      return NextResponse.json(
        { error: `DeepSeek 请求失败（${response.status}）${detail}` },
        { status: 502 }
      );
    }

    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "DeepSeek 没有返回有效内容。" }, { status: 502 });
    }

    return NextResponse.json({
      message: { role: "assistant", content },
      usage: data?.usage,
      model,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "AI 响应超时，请稍后重试。"
        : "AI 助手暂时不可用，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
