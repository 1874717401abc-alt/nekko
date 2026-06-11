export type InspirationItem = {
  id: string;
  title: string;
  type: "link" | "note" | "image";
  url?: string;
  note?: string;
  tags: string[];
  createdAt: string;
  createdBy: string;
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
};

export type TaskStatus = "todo" | "doing" | "done";

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
  assignee: string;
  createdAt: string;
  createdBy: string;
  logs?: ProgressLogEntry[];
  comments?: ProgressComment[];
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
};

export type CheckIn = {
  id: string;
  userId: string;
  memberName: string;
  date: string; // YYYY-MM-DD
  time: string; // ISO timestamp
  note?: string;
};
