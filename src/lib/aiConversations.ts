import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import type {
  AiAttachment,
  AiConversation,
  AiConversationSummary,
  AiMessage,
  AiMode,
} from "@/lib/types";

type ConversationRow = {
  id: string;
  user_id: string;
  title: string;
  mode: AiMode;
  memory: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  attachments: string;
  created_at: string;
};

function toConversation(row: ConversationRow): AiConversation {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    mode: row.mode,
    memory: row.memory,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseAttachments(value: string): AiAttachment[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as AiAttachment[]) : [];
  } catch {
    return [];
  }
}

function toMessage(row: MessageRow): AiMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    userId: row.user_id,
    role: row.role,
    content: row.content,
    attachments: parseAttachments(row.attachments),
    createdAt: row.created_at,
  };
}

export function titleFromMessage(content: string) {
  const text = content.replace(/\s+/g, " ").trim();
  if (!text) return "新的 AI 对话";
  return text.length > 24 ? `${text.slice(0, 24)}...` : text;
}

export function createAiConversation(input: {
  userId: string;
  title: string;
  mode: AiMode;
}): AiConversation {
  const db = getDb();
  const now = new Date().toISOString();
  const conversation: AiConversation = {
    id: `ai-conv-${randomUUID()}`,
    userId: input.userId,
    title: titleFromMessage(input.title),
    mode: input.mode,
    memory: "",
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `INSERT INTO ai_conversations (id, user_id, title, mode, memory, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    conversation.id,
    conversation.userId,
    conversation.title,
    conversation.mode,
    conversation.memory,
    conversation.createdAt,
    conversation.updatedAt
  );

  return conversation;
}

export function getAiConversation(id: string, userId: string): AiConversation | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?")
    .get(id, userId) as ConversationRow | undefined;
  return row ? toConversation(row) : null;
}

export function listAiConversations(userId: string): AiConversationSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
         c.*,
         COUNT(m.id) AS message_count,
         (
           SELECT content
           FROM ai_messages
           WHERE conversation_id = c.id
           ORDER BY created_at DESC
           LIMIT 1
         ) AS last_message
       FROM ai_conversations c
       LEFT JOIN ai_messages m ON m.conversation_id = c.id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.updated_at DESC
       LIMIT 40`
    )
    .all(userId) as Array<ConversationRow & { message_count: number; last_message?: string }>;

  return rows.map((row) => ({
    ...toConversation(row),
    lastMessage: row.last_message,
    messageCount: row.message_count,
  }));
}

export function listAiMessages(conversationId: string, userId: string): AiMessage[] {
  const db = getDb();
  const conversation = getAiConversation(conversationId, userId);
  if (!conversation) return [];

  const rows = db
    .prepare("SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conversationId) as MessageRow[];
  return rows.map(toMessage);
}

export function appendAiMessage(input: {
  conversationId: string;
  userId: string;
  role: AiMessage["role"];
  content: string;
  attachments?: AiAttachment[];
}): AiMessage {
  const db = getDb();
  const now = new Date().toISOString();
  const message: AiMessage = {
    id: `ai-msg-${randomUUID()}`,
    conversationId: input.conversationId,
    userId: input.userId,
    role: input.role,
    content: input.content,
    attachments: input.attachments ?? [],
    createdAt: now,
  };

  db.prepare(
    `INSERT INTO ai_messages (id, conversation_id, user_id, role, content, attachments, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    message.id,
    message.conversationId,
    message.userId,
    message.role,
    message.content,
    JSON.stringify(message.attachments),
    message.createdAt
  );
  db.prepare("UPDATE ai_conversations SET updated_at = ? WHERE id = ?").run(
    now,
    message.conversationId
  );

  return message;
}

export function updateAiConversation(input: {
  id: string;
  userId: string;
  mode?: AiMode;
  memory?: string;
  title?: string;
}): AiConversation | null {
  const existing = getAiConversation(input.id, input.userId);
  if (!existing) return null;

  const next = {
    title: input.title ?? existing.title,
    mode: input.mode ?? existing.mode,
    memory: input.memory ?? existing.memory,
    updatedAt: new Date().toISOString(),
  };

  const db = getDb();
  db.prepare(
    `UPDATE ai_conversations
     SET title = ?, mode = ?, memory = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`
  ).run(next.title, next.mode, next.memory, next.updatedAt, input.id, input.userId);

  return getAiConversation(input.id, input.userId);
}

export function deleteAiConversation(id: string, userId: string): boolean {
  const db = getDb();
  const tx = db.transaction(() => {
    const existing = getAiConversation(id, userId);
    if (!existing) return false;
    db.prepare("DELETE FROM ai_messages WHERE conversation_id = ?").run(id);
    db.prepare("DELETE FROM ai_conversations WHERE id = ? AND user_id = ?").run(id, userId);
    return true;
  });
  return tx();
}

export function buildConversationMemory(messages: AiMessage[]) {
  const userMessages = messages.filter((message) => message.role === "user").slice(-8);
  if (userMessages.length === 0) return "";

  return userMessages
    .map((message) => {
      const attachmentNames = message.attachments.map((item) => item.name).filter(Boolean);
      const suffix = attachmentNames.length ? `（附件：${attachmentNames.join("、")}）` : "";
      const text = message.content.replace(/\s+/g, " ").trim();
      return `- ${text.slice(0, 180)}${text.length > 180 ? "..." : ""}${suffix}`;
    })
    .join("\n")
    .slice(0, 1800);
}
