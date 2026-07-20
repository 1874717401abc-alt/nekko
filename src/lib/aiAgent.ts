import type { AiMode } from "@/lib/types";

export type AgentBackend = "hermes" | "deepseek";

export type AgentStatus = {
  backend: AgentBackend;
  label: string;
  model: string;
  configured: boolean;
  healthy: boolean;
  detail: string;
  capabilities: string[];
};

export type AgentMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AgentCompletion = {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model: string;
  backend: AgentBackend;
  fallbackFrom?: AgentBackend;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: AgentCompletion["usage"];
  error?: {
    message?: string;
  };
  model?: string;
};

type HermesCapabilitiesResponse = {
  features?: Record<string, boolean>;
  session_key_header?: string;
};

const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_HERMES_BASE_URL = "http://127.0.0.1:8642/v1";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEFAULT_HERMES_MODEL = "hermes-agent";

export class AgentRequestError extends Error {
  constructor(
    message: string,
    public status = 502
  ) {
    super(message);
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function preferredBackend(): AgentBackend {
  return process.env.AI_BACKEND?.toLowerCase() === "hermes" ? "hermes" : "deepseek";
}

function hermesConfig() {
  return {
    apiKey: process.env.HERMES_API_KEY ?? "",
    baseUrl: trimTrailingSlash(process.env.HERMES_API_BASE_URL || DEFAULT_HERMES_BASE_URL),
    model: process.env.HERMES_MODEL || DEFAULT_HERMES_MODEL,
  };
}

function deepSeekConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    baseUrl: trimTrailingSlash(process.env.DEEPSEEK_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL),
    model: process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL,
  };
}

function safeHermesHeader(value: string) {
  return value.replace(/[\r\n\x00]/g, "-").slice(0, 256);
}

async function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = (await response.json().catch(() => null)) as T | null;
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

function deepSeekRequestBody(messages: AgentMessage[], mode: AiMode, model: string) {
  const body: Record<string, unknown> = {
    model,
    messages,
    thinking: { type: mode === "deep" ? "enabled" : "disabled" },
    max_tokens: mode === "deep" ? 1800 : 1200,
    stream: false,
  };

  if (mode === "deep") {
    body.reasoning_effort = "high";
  } else {
    body.temperature = mode === "content" ? 0.8 : 0.55;
  }

  return body;
}

async function requestDeepSeekCompletion(input: {
  messages: AgentMessage[];
  mode: AiMode;
  signal: AbortSignal;
}): Promise<AgentCompletion> {
  const config = deepSeekConfig();
  if (!config.apiKey) {
    throw new AgentRequestError("AI 助手还没有配置 DeepSeek API Key。", 503);
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    signal: input.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(deepSeekRequestBody(input.messages, input.mode, config.model)),
  });

  const data = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
  if (!response.ok) {
    const detail = data?.error?.message ? `：${data.error.message}` : "";
    throw new AgentRequestError(`DeepSeek 请求失败（${response.status}）${detail}`);
  }

  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new AgentRequestError("DeepSeek 没有返回有效内容。");
  }

  return {
    content,
    usage: data?.usage,
    model: data?.model || config.model,
    backend: "deepseek",
  };
}

export async function requestAgentPlanningCompletion(input: {
  messages: AgentMessage[];
  signal: AbortSignal;
}): Promise<AgentCompletion> {
  const config = deepSeekConfig();
  if (!config.apiKey) {
    throw new AgentRequestError("站内动作规划器还没有配置 DeepSeek API Key。", 503);
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    signal: input.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: input.messages,
      max_tokens: 1800,
      temperature: 0.1,
      response_format: { type: "json_object" },
      stream: false,
    }),
  });

  const data = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
  if (!response.ok) {
    const detail = data?.error?.message ? `：${data.error.message}` : "";
    throw new AgentRequestError(`站内动作规划失败（${response.status}）${detail}`);
  }

  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new AgentRequestError("站内动作规划器没有返回有效内容。");
  }

  return {
    content,
    usage: data?.usage,
    model: data?.model || config.model,
    backend: "deepseek",
  };
}

async function requestHermesCompletion(input: {
  messages: AgentMessage[];
  mode: AiMode;
  signal: AbortSignal;
  conversationId: string;
  userId: string;
}): Promise<AgentCompletion> {
  const config = hermesConfig();
  if (!config.apiKey) {
    throw new AgentRequestError("Hermes Agent 还没有配置 API Key。", 503);
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    signal: input.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "X-Hermes-Session-Id": safeHermesHeader(input.conversationId),
      "X-Hermes-Session-Key": safeHermesHeader(`nekko:${input.userId}:${input.conversationId}`),
    },
    body: JSON.stringify({
      model: config.model,
      messages: input.messages,
      stream: false,
    }),
  });

  const data = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
  if (!response.ok) {
    const detail = data?.error?.message ? `：${data.error.message}` : "";
    throw new AgentRequestError(`Hermes Agent 请求失败（${response.status}）${detail}`);
  }

  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new AgentRequestError("Hermes Agent 没有返回有效内容。");
  }

  return {
    content,
    usage: data?.usage,
    model: data?.model || config.model,
    backend: "hermes",
  };
}

export async function requestAgentCompletion(input: {
  messages: AgentMessage[];
  mode: AiMode;
  signal: AbortSignal;
  conversationId: string;
  userId: string;
}): Promise<AgentCompletion> {
  const backend = preferredBackend();

  if (backend === "hermes") {
    try {
      return await requestHermesCompletion(input);
    } catch (error) {
      if (!deepSeekConfig().apiKey) throw error;
      const fallbackMessages = input.messages.map((message, index) =>
        index === 0 && message.role === "system"
          ? {
              ...message,
              content: `${message.content}\n\n当前请求已降级到无工具模型。不要声称已经联网、浏览网页、读取服务器文件或执行外部操作；需要实时信息时明确说明本轮无法核实。`,
            }
          : message
      );
      const fallback = await requestDeepSeekCompletion({
        messages: fallbackMessages,
        mode: input.mode,
        signal: input.signal,
      });
      return { ...fallback, fallbackFrom: "hermes" };
    }
  }

  return requestDeepSeekCompletion(input);
}

export async function getAgentStatus(): Promise<AgentStatus> {
  if (preferredBackend() !== "hermes") {
    const config = deepSeekConfig();
    return {
      backend: "deepseek",
      label: "DeepSeek Direct",
      model: config.model,
      configured: Boolean(config.apiKey),
      healthy: Boolean(config.apiKey),
      detail: config.apiKey ? "直连模型已配置" : "缺少 DeepSeek API Key",
      capabilities: ["工作台上下文", "附件文本", "公开链接", "对话记忆"],
    };
  }

  const config = hermesConfig();
  const base = config.baseUrl.replace(/\/v1$/, "");
  const baseCapabilities = [
    "工作台上下文",
    "附件文本",
    "公开链接",
    "对话记忆",
    "站内动作",
    "自动内容雷达",
  ];

  if (!config.apiKey) {
    return {
      backend: "hermes",
      label: "Hermes Agent",
      model: config.model,
      configured: false,
      healthy: false,
      detail: "缺少 Hermes API Key",
      capabilities: baseCapabilities,
    };
  }

  try {
    const health = await fetchJsonWithTimeout<{ status?: string }>(
      `${base}/health`,
      { method: "GET" },
      1800
    );
    const models = await fetchJsonWithTimeout<{ data?: Array<{ id?: string }> }>(
      `${config.baseUrl}/models`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${config.apiKey}` },
      },
      1800
    );
    const capabilities = await fetchJsonWithTimeout<HermesCapabilitiesResponse>(
      `${config.baseUrl}/capabilities`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${config.apiKey}` },
      },
      1800
    );
    const featureMap = capabilities.data?.features ?? {};
    const featureLabels = [
      featureMap.responses_api ? "服务端会话" : "",
      featureMap.run_events_sse ? "工具进度" : "",
      capabilities.data?.session_key_header ? "长期记忆" : "",
      featureMap.run_approval ? "操作审批" : "",
    ].filter(Boolean);
    const advertisedModel = models.data?.data?.[0]?.id || config.model;
    const healthy = health.ok && health.data?.status === "ok" && models.ok;

    return {
      backend: "hermes",
      label: "Hermes Agent",
      model: advertisedModel,
      configured: true,
      healthy,
      detail: healthy ? "Agent 网关在线" : "Agent 网关未就绪",
      capabilities: [...baseCapabilities, ...featureLabels],
    };
  } catch {
    return {
      backend: "hermes",
      label: "Hermes Agent",
      model: config.model,
      configured: true,
      healthy: false,
      detail: "Agent 网关离线，聊天会自动降级",
      capabilities: baseCapabilities,
    };
  }
}
