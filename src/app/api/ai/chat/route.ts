import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { AgentRequestError } from "@/lib/aiAgent";
import {
  buildAiSystemPrompt,
  buildAiWorkspaceContext,
} from "@/lib/aiWorkspace";
import {
  appendAiMessage,
  buildConversationMemory,
  createAiConversation,
  getAiConversation,
  listAiMessages,
  titleFromMessage,
  updateAiConversation,
} from "@/lib/aiConversations";
import { extractUrlAttachmentsFromText } from "@/lib/aiSources";
import { recordWorkspaceAgentTask } from "@/lib/agentTasks";
import { runWorkspaceAgent } from "@/lib/workspaceAgent";
import type { AiAttachment, AiMessage, AiMode } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChatRole = "user" | "assistant";
type ChatMessage = {
  role: ChatRole;
  content: string;
};

const modes = new Set<AiMode>(["strategy", "content", "review", "deep"]);
const MAX_HISTORY = 14;
const MAX_MESSAGE_CHARS = 5000;
const MAX_ATTACHMENTS = 6;
const MAX_ATTACHMENT_CHARS = 10_000;

function cleanLegacyMessages(value: unknown): ChatMessage[] | null {
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

function cleanMessageContent(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MAX_MESSAGE_CHARS) : "";
}

function cleanAttachments(value: unknown): AiAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      if (typeof record.id !== "string" || typeof record.name !== "string") return null;
      const kind = record.kind === "link" ? "link" : "upload";
      const text = typeof record.text === "string" ? record.text.slice(0, MAX_ATTACHMENT_CHARS) : "";
      const error = typeof record.error === "string" ? record.error.slice(0, 600) : undefined;
      if (!text && !error) return null;
      return {
        id: record.id,
        kind,
        name: record.name.slice(0, 180),
        mimeType: typeof record.mimeType === "string" ? record.mimeType.slice(0, 120) : undefined,
        size: typeof record.size === "number" ? record.size : undefined,
        url: typeof record.url === "string" ? record.url.slice(0, 1000) : undefined,
        text,
        error,
      } satisfies AiAttachment;
    })
    .filter(Boolean)
    .slice(0, MAX_ATTACHMENTS) as AiAttachment[];
}

function cleanMode(value: unknown): AiMode {
  return typeof value === "string" && modes.has(value as AiMode)
    ? (value as AiMode)
    : "strategy";
}

function mergeAttachments(primary: AiAttachment[], secondary: AiAttachment[]) {
  const seen = new Set<string>();
  const merged: AiAttachment[] = [];
  for (const item of [...primary, ...secondary]) {
    const key = item.url || item.id || item.name;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= MAX_ATTACHMENTS) break;
  }
  return merged;
}

function attachmentBlock(attachments: AiAttachment[], maxChars: number) {
  if (attachments.length === 0) return "";
  return attachments
    .map((attachment) => {
      if (attachment.error) {
        return [
          `【${attachment.kind === "link" ? "链接" : "文件"}：${attachment.name}】`,
          attachment.url ? `来源：${attachment.url}` : "",
          `读取失败：${attachment.error}`,
        ]
          .filter(Boolean)
          .join("\n");
      }

      return [
        `【${attachment.kind === "link" ? "链接" : "文件"}：${attachment.name}】`,
        attachment.url ? `来源：${attachment.url}` : "",
        attachment.text.slice(0, maxChars),
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function messageForModel(message: AiMessage) {
  const attachments = attachmentBlock(message.attachments, 4500);
  const content = message.content.trim() || "请分析我上传的附件。";
  return {
    role: message.role,
    content: attachments ? `${content}\n\n附件和链接内容：\n${attachments}` : content,
  };
}

function latestLegacyUserMessage(messages: ChatMessage[] | null) {
  return [...(messages ?? [])].reverse().find((message) => message.role === "user")?.content ?? "";
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const record = body as Record<string, unknown> | null;
  const legacyMessages = cleanLegacyMessages(record?.messages);
  const messageContent =
    cleanMessageContent(record?.message) || latestLegacyUserMessage(legacyMessages);
  const incomingAttachments = cleanAttachments(record?.attachments);
  if (!messageContent && incomingAttachments.length === 0) {
    return NextResponse.json({ error: "消息内容为空。" }, { status: 400 });
  }

  const mode = cleanMode((body as Record<string, unknown> | null)?.mode);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const existingConversationId =
      typeof record?.conversationId === "string" ? record.conversationId : "";
    const existingConversation = existingConversationId
      ? getAiConversation(existingConversationId, user.id)
      : null;
    const conversation =
      existingConversation ??
      createAiConversation({
        userId: user.id,
        title: messageContent || incomingAttachments[0]?.name || "新的 AI 对话",
        mode,
      });

    const linkAttachments = messageContent
      ? await extractUrlAttachmentsFromText(messageContent)
      : [];
    const attachments = mergeAttachments(incomingAttachments, linkAttachments);
    const userMessage = appendAiMessage({
      conversationId: conversation.id,
      userId: user.id,
      role: "user",
      content: messageContent || "请分析我上传的附件。",
      attachments,
    });

    const persistedMessages = listAiMessages(conversation.id, user.id);
    const recentMessages = persistedMessages.slice(-MAX_HISTORY);
    const memory = buildConversationMemory(persistedMessages);
    updateAiConversation({
      id: conversation.id,
      userId: user.id,
      mode,
      memory,
      title: persistedMessages.length === 1 ? titleFromMessage(userMessage.content) : undefined,
    });

    const workspaceContext = await buildAiWorkspaceContext(user);
    const modelMessages = [
      {
        role: "system" as const,
        content: buildAiSystemPrompt(mode, workspaceContext, memory),
      },
      ...recentMessages.map(messageForModel),
    ];

    const completion = await runWorkspaceAgent({
      messages: modelMessages,
      mode,
      signal: controller.signal,
      conversationId: conversation.id,
      user,
    });
    const run = recordWorkspaceAgentTask({
      prompt: userMessage.content,
      mode,
      user,
      summary: completion.content,
      actions: completion.plannedActions,
      results: completion.actions,
    });

    const assistantMessage = appendAiMessage({
      conversationId: conversation.id,
      userId: user.id,
      role: "assistant",
      content: completion.content,
    });
    const messages = listAiMessages(conversation.id, user.id);
    const updatedConversation = updateAiConversation({
      id: conversation.id,
      userId: user.id,
      mode,
      memory: buildConversationMemory(messages),
    });

    return NextResponse.json({
      conversation: updatedConversation ?? conversation,
      userMessage,
      message: assistantMessage,
      messages,
      usage: completion.usage,
      model: completion.model,
      backend: completion.backend,
      fallbackFrom: completion.fallbackFrom,
      actions: completion.actions,
      run,
    });
  } catch (error) {
    if (error instanceof AgentRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "AI 响应超时，请稍后重试。"
        : "AI 助手暂时不可用，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
