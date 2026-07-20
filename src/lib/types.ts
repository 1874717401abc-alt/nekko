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

export type TrashResource = "projects" | "progress" | "inspiration" | "library" | "checkins";

export type TrashItem = {
  resource: TrashResource;
  id: string;
  title: string;
  subtitle?: string;
  deletedAt: string;
  deletedBy?: string;
};
