export type InspirationItem = {
  id: string;
  title: string;
  type: "link" | "note" | "image";
  url?: string;
  note?: string;
  tags: string[];
  createdAt: string;
  createdBy: string;
  createdById?: string;
  projectId?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type LibraryItem = {
  id: string;
  title: string;
  type: "video" | "doc";
  url: string;
  category: string;
  note?: string;
  addedAt: string;
  createdBy: string;
  createdById?: string;
  projectId?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  budget?: number;
  stage?: ProjectStage;
  stageOwner?: string;
  blockedReason?: string;
  template?: ProjectTemplate;
  createdAt: string;
  createdBy: string;
  createdById?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type ProjectStage =
  | "idea"
  | "research"
  | "script"
  | "shooting"
  | "editing"
  | "review"
  | "publishing"
  | "published"
  | "retrospective";

export type ProjectTemplate = "blank" | "talking" | "interview" | "store" | "documentary";

export type ScriptSceneType = "hook" | "narration" | "broll" | "interview" | "outro";
export type ScriptSceneStatus = "draft" | "ready" | "shot";

export type ScriptScene = {
  id: string;
  projectId: string;
  order: number;
  title: string;
  type: ScriptSceneType;
  duration: number;
  script: string;
  visual?: string;
  assignee?: string;
  status: ScriptSceneStatus;
  createdAt: string;
  createdBy: string;
  createdById?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type CostStatus = "planned" | "approved" | "paid";

export type CostItem = {
  id: string;
  projectId: string;
  title: string;
  category: string;
  amount: number;
  status: CostStatus;
  vendor?: string;
  date?: string;
  note?: string;
  createdAt: string;
  createdBy: string;
  createdById?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type MilestoneStatus = "planned" | "doing" | "done";

export type ProjectMilestone = {
  id: string;
  projectId: string;
  title: string;
  date: string;
  status: MilestoneStatus;
  assignee?: string;
  note?: string;
  createdAt: string;
  createdBy: string;
  createdById?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type ScriptVersionStatus = "draft" | "in_review" | "approved" | "locked";

export type ScriptVersion = {
  id: string;
  projectId: string;
  sceneId: string;
  version: number;
  title: string;
  script: string;
  visual?: string;
  duration: number;
  status: ScriptVersionStatus;
  note?: string;
  createdAt: string;
  createdBy: string;
  createdById?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type ScriptReview = {
  id: string;
  projectId: string;
  sceneId: string;
  versionId?: string;
  content: string;
  resolved: boolean;
  createdAt: string;
  createdBy: string;
  createdById?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type ProjectAssetKind =
  | "image"
  | "video"
  | "document"
  | "contract"
  | "invoice"
  | "other";

export type ProjectAsset = {
  id: string;
  projectId: string;
  title: string;
  kind: ProjectAssetKind;
  fileName: string;
  storedName: string;
  mimeType: string;
  size: number;
  url: string;
  tags: string[];
  version: number;
  note?: string;
  extractedText?: string;
  createdAt: string;
  createdBy: string;
  createdById?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type PublishPlatform = "bilibili" | "xiaohongshu" | "douyin" | "wechat" | "other";
export type DeliverableStatus = "draft" | "scheduled" | "published";

export type Deliverable = {
  id: string;
  projectId: string;
  platform: PublishPlatform;
  title: string;
  caption?: string;
  coverUrl?: string;
  status: DeliverableStatus;
  scheduledAt?: string;
  publishedAt?: string;
  url?: string;
  createdAt: string;
  createdBy: string;
  createdById?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type PerformanceRecord = {
  id: string;
  projectId: string;
  deliverableId?: string;
  recordedAt: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followers: number;
  completionRate: number;
  revenue: number;
  note?: string;
  createdAt: string;
  createdBy: string;
  createdById?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type AutomationAction = "content_radar" | "topic_digest" | "deadline_scan";
export type AutomationCadence = "daily" | "weekly";

export type AutomationRule = {
  id: string;
  title: string;
  action: AutomationAction;
  cadence: AutomationCadence;
  time: string;
  weekday?: number;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  createdBy: string;
  createdById?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type NotificationType = "deadline" | "budget" | "review" | "publish" | "automation";

export type NotificationItem = {
  id: string;
  key?: string;
  userId?: string;
  projectId?: string;
  type: NotificationType;
  title: string;
  message: string;
  href?: string;
  readAt?: string;
  createdAt: string;
  createdBy: string;
  createdById?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "normal" | "high";

export type ProgressLogEntry = {
  id: string;
  userId: string;
  memberName: string;
  content: string;
  createdAt: string;
};

export type ProgressComment = {
  id: string;
  userId: string;
  memberName: string;
  content: string;
  createdAt: string;
};

export type ProgressTask = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string; // YYYY-MM-DD
  assignee: string;
  createdAt: string;
  createdBy: string;
  createdById?: string;
  logs?: ProgressLogEntry[];
  comments?: ProgressComment[];
  projectId?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type ActivityType =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "purge"
  | "log"
  | "comment"
  | "checkin";

export type ActivityEvent = {
  id: string;
  type: ActivityType;
  resource: string;
  resourceId?: string;
  title: string;
  summary: string;
  userId: string;
  memberName: string;
  projectId?: string;
  createdAt: string;
};

export type User = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  bio: string;
  focus: string[];
  avatarUrl: string;
  contact: string;
  createdAt: string;
  isAdmin: boolean;
  isOwner: boolean;
};

export type HeroSlideText = {
  vertical: string;
  category: string;
  title: string;
  desc: string;
  posterLabel: string;
  posterSub: string;
};

export type HeroContent = {
  slides: HeroSlideText[];
  latestLabel: string;
  latestTitle: string;
  latestDesc: string;
};

export type CheckIn = {
  id: string;
  userId: string;
  memberName: string;
  date: string; // YYYY-MM-DD
  time: string; // ISO timestamp
  note?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedById?: string;
};

export type TrashResource =
  | "projects"
  | "progress"
  | "inspiration"
  | "library"
  | "checkins"
  | "scripts"
  | "costs"
  | "milestones"
  | "scriptVersions"
  | "scriptReviews"
  | "assets"
  | "deliverables"
  | "performance"
  | "automations"
  | "notifications";

export type TrashItem = {
  resource: TrashResource;
  id: string;
  title: string;
  subtitle?: string;
  deletedAt: string;
  deletedBy?: string;
};

export type AiMode = "strategy" | "content" | "review" | "deep";

export type AiAttachmentKind = "upload" | "link";

export type AiAttachment = {
  id: string;
  kind: AiAttachmentKind;
  name: string;
  mimeType?: string;
  size?: number;
  url?: string;
  text: string;
  error?: string;
};

export type AiMessage = {
  id: string;
  conversationId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  attachments: AiAttachment[];
  createdAt: string;
};

export type AiConversation = {
  id: string;
  userId: string;
  title: string;
  mode: AiMode;
  memory: string;
  createdAt: string;
  updatedAt: string;
};

export type AiConversationSummary = AiConversation & {
  lastMessage?: string;
  messageCount: number;
};

export type AgentTaskStatus = "planning" | "running" | "completed" | "failed" | "blocked";

export type AgentTaskStepStatus = "pending" | "running" | "completed" | "failed" | "blocked";

export type AgentTaskRun = {
  id: string;
  userId: string;
  title: string;
  prompt: string;
  mode: AiMode;
  status: AgentTaskStatus;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type AgentTaskStep = {
  id: string;
  runId: string;
  orderIndex: number;
  action: string;
  ref?: string;
  title: string;
  payload: Record<string, unknown>;
  status: AgentTaskStepStatus;
  result?: string;
  resource?: string;
  resourceId?: string;
  error?: string;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AgentTaskRunDetail = AgentTaskRun & {
  steps: AgentTaskStep[];
};
