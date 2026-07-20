import { randomUUID } from "crypto";
import { recordActivity } from "@/lib/activity";
import { requestAgentCompletion } from "@/lib/aiAgent";
import { insertDataItem, listDataItems } from "@/lib/store";
import type { InspirationItem } from "@/lib/types";

type BilibiliVideo = {
  bvid: string;
  title: string;
  desc: string;
  owner: string;
  tname: string;
  duration: number;
  stat: {
    view?: number;
    vv?: number;
    like?: number;
    favorite?: number;
    coin?: number;
    share?: number;
    reply?: number;
    danmaku?: number;
  };
};

type BilibiliResponse = {
  code?: number;
  message?: string;
  data?: {
    list?: Array<{
      bvid?: string;
      title?: string;
      desc?: string;
      tname?: string;
      duration?: number;
      owner?: { name?: string };
      stat?: BilibiliVideo["stat"];
    }>;
  };
};

type RadarIdea = {
  title?: string;
  sourceBvid?: string;
  angle?: string;
  hook?: string;
  reason?: string;
  tags?: string[];
};

export type ContentRadarResult = {
  createdItems: InspirationItem[];
  skipped: number;
  sourceCount: number;
  message: string;
};

const SYSTEM_AGENT = {
  id: "system-agent",
  displayName: "Nekko Agent",
};

const BILIBILI_ENDPOINTS = [
  "https://api.bilibili.com/x/web-interface/popular?ps=30&pn=1",
  "https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all",
];

function todayKey() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function compactNumber(value?: number) {
  if (!value) return "0";
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`;
  return String(value);
}

function videoUrl(bvid: string) {
  return `https://www.bilibili.com/video/${bvid}`;
}

async function fetchBilibiliEndpoint(url: string): Promise<BilibiliVideo[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 NekkoContentRadar/1.0",
      Referer: "https://www.bilibili.com/",
      Accept: "application/json,text/plain,*/*",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Bilibili request failed: ${response.status}`);
  }

  const data = (await response.json()) as BilibiliResponse;
  if (data.code !== 0 || !Array.isArray(data.data?.list)) {
    throw new Error(data.message || "Bilibili response is not usable");
  }

  return data.data.list
    .map((item) => {
      if (!item.bvid || !item.title) return null;
      return {
        bvid: item.bvid,
        title: item.title,
        desc: item.desc ?? "",
        owner: item.owner?.name ?? "未知 UP",
        tname: item.tname ?? "未分类",
        duration: item.duration ?? 0,
        stat: item.stat ?? {},
      } satisfies BilibiliVideo;
    })
    .filter(Boolean) as BilibiliVideo[];
}

async function fetchBilibiliSignals() {
  const settled = await Promise.allSettled(BILIBILI_ENDPOINTS.map(fetchBilibiliEndpoint));
  const seen = new Set<string>();
  const videos: BilibiliVideo[] = [];

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const video of result.value) {
      if (seen.has(video.bvid)) continue;
      seen.add(video.bvid);
      videos.push(video);
      if (videos.length >= 36) break;
    }
  }

  return videos;
}

function sourceSnapshot(videos: BilibiliVideo[]) {
  return videos.slice(0, 24).map((video) => ({
    bvid: video.bvid,
    title: video.title,
    up: video.owner,
    category: video.tname,
    desc: video.desc.slice(0, 160),
    url: videoUrl(video.bvid),
    stats: {
      view: video.stat.view ?? video.stat.vv ?? 0,
      like: video.stat.like ?? 0,
      favorite: video.stat.favorite ?? 0,
      coin: video.stat.coin ?? 0,
      share: video.stat.share ?? 0,
      reply: video.stat.reply ?? 0,
    },
  }));
}

function extractJsonArray(text: string): RadarIdea[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced ?? text;
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end < start) return [];

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return Array.isArray(parsed) ? (parsed as RadarIdea[]) : [];
  } catch {
    return [];
  }
}

function fallbackIdeas(videos: BilibiliVideo[], limit: number): RadarIdea[] {
  return videos.slice(0, limit).map((video) => ({
    title: `拆解这个爆款：${video.title}`.slice(0, 42),
    sourceBvid: video.bvid,
    angle: "从标题钩子、内容结构和评论互动中拆出可复用的短视频表达方式。",
    hook: `为什么「${video.title.slice(0, 18)}」会被转发？`,
    reason: "该视频在公开热门/排行榜中热度靠前，适合作为当日选题拆解样本。",
    tags: ["爆款拆解", "B站趋势", video.tname].filter(Boolean),
  }));
}

function tagsFromIdea(idea: RadarIdea, video: BilibiliVideo) {
  const tags = [
    ...(Array.isArray(idea.tags) ? idea.tags : []),
    "AI选题",
    "B站趋势",
    video.tname,
  ]
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter(Boolean);

  return Array.from(new Set(tags)).slice(0, 6);
}

function noteFromIdea(idea: RadarIdea, video: BilibiliVideo) {
  const stats = video.stat;
  return [
    `来源：B站公开热门/排行榜 · ${video.owner}`,
    `源视频：${video.title}`,
    `热度：播放 ${compactNumber(stats.view ?? stats.vv)} / 点赞 ${compactNumber(
      stats.like
    )} / 收藏 ${compactNumber(stats.favorite)} / 投币 ${compactNumber(
      stats.coin
    )} / 分享 ${compactNumber(stats.share)}`,
    "",
    `选题角度：${idea.angle || "拆解该内容的表达结构，迁移到工作室账号选题。"}`,
    `开头钩子：${idea.hook || "把高互动点改写成一个更适合我们账号的开场问题。"}`,
    `推荐理由：${idea.reason || "公开热度较高，适合作为今日灵感样本。"}`,
  ].join("\n");
}

async function generateIdeas(videos: BilibiliVideo[], limit: number) {
  const prompt = [
    "你是 Nekko 自媒体工作室的内容策略 agent。",
    "根据下面的 B站公开热门/排行榜视频信号，生成适合工作室灵感库的原创选题。",
    "要求：不要照搬标题，不要制造事实，不要输出营销套话；每条必须能让团队直接开始写脚本或做拆解。",
    `输出 ${limit} 条，只返回 JSON 数组，不要 Markdown，不要解释。`,
    "字段：title（28字内）、sourceBvid、angle、hook、reason、tags（3-5个中文标签）。",
    "",
    JSON.stringify(sourceSnapshot(videos), null, 2),
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 150_000);
  try {
    const completion = await requestAgentCompletion({
      messages: [
        {
          role: "system",
          content:
            "你只负责把公开视频趋势转成原创选题 JSON。输出必须能被 JSON.parse 解析。",
        },
        { role: "user", content: prompt },
      ],
      mode: "deep",
      signal: controller.signal,
      conversationId: `content-radar-${todayKey()}`,
      userId: SYSTEM_AGENT.id,
    });
    const ideas = extractJsonArray(completion.content);
    return ideas.length ? ideas : fallbackIdeas(videos, limit);
  } catch {
    return fallbackIdeas(videos, limit);
  } finally {
    clearTimeout(timeout);
  }
}

export async function runContentRadar(limit = 6): Promise<ContentRadarResult> {
  const videos = await fetchBilibiliSignals();
  if (videos.length === 0) {
    return {
      createdItems: [],
      skipped: 0,
      sourceCount: 0,
      message: "没有拿到可用的 B站公开趋势信号。",
    };
  }

  const existing = listDataItems<InspirationItem>("inspiration");
  const existingUrls = new Set(existing.map((item) => item.url).filter(Boolean));
  const existingTitles = new Set(existing.map((item) => normalizeText(item.title)));
  const videoByBvid = new Map(videos.map((video) => [video.bvid, video]));
  const ideas = await generateIdeas(videos, Math.max(1, Math.min(limit, 10)));
  const createdItems: InspirationItem[] = [];
  let skipped = 0;

  for (const idea of ideas) {
    if (createdItems.length >= limit) break;
    const video =
      (idea.sourceBvid ? videoByBvid.get(idea.sourceBvid) : undefined) ??
      videos.find((candidate) => !existingUrls.has(videoUrl(candidate.bvid)));
    if (!video) {
      skipped += 1;
      continue;
    }

    const url = videoUrl(video.bvid);
    const title = (idea.title || `拆解这个爆款：${video.title}`).trim().slice(0, 42);
    const titleKey = normalizeText(title);
    if (existingUrls.has(url) || existingTitles.has(titleKey)) {
      skipped += 1;
      continue;
    }

    const now = new Date().toISOString();
    const item: InspirationItem = {
      id: `insp-radar-${todayKey()}-${video.bvid}-${randomUUID().slice(0, 8)}`,
      title,
      type: "link",
      url,
      note: noteFromIdea(idea, video),
      tags: tagsFromIdea(idea, video),
      createdAt: now,
      createdBy: SYSTEM_AGENT.displayName,
      createdById: SYSTEM_AGENT.id,
    };

    insertDataItem("inspiration", item);
    existingUrls.add(url);
    existingTitles.add(titleKey);
    createdItems.push(item);
  }

  if (createdItems.length > 0) {
    recordActivity({
      type: "create",
      resource: "inspiration",
      title: "B站内容雷达",
      summary: `Nekko Agent 自动生成了 ${createdItems.length} 条 B站趋势选题灵感`,
      user: SYSTEM_AGENT,
    });
  }

  return {
    createdItems,
    skipped,
    sourceCount: videos.length,
    message:
      createdItems.length > 0
        ? `已生成 ${createdItems.length} 条灵感，跳过 ${skipped} 条重复来源。`
        : `没有新增灵感，${skipped} 条候选与已有记录重复。`,
  };
}
