export type InspirationItem = {
  id: string;
  title: string;
  type: "link" | "note" | "image";
  url?: string;
  note?: string;
  tags: string[];
  createdAt: string;
};

export type LibraryItem = {
  id: string;
  title: string;
  type: "video" | "doc";
  url: string;
  category: string;
  note?: string;
  addedAt: string;
};

export type TaskStatus = "todo" | "doing" | "done";

export type ProgressTask = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignee: string;
  createdAt: string;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  focus: string[];
};

export type CheckIn = {
  id: string;
  member: string;
  date: string; // YYYY-MM-DD
  time: string; // ISO timestamp
  note?: string;
};
