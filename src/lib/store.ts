import { getDb } from "@/lib/db";
import type { TrashItem, TrashResource, User } from "@/lib/types";

export type ResourceName =
  | "inspiration"
  | "library"
  | "progress"
  | "checkins"
  | "hero"
  | "heroContent"
  | "projects"
  | "scripts"
  | "costs"
  | "milestones"
  | "scriptVersions"
  | "scriptReviews"
  | "assets"
  | "deliverables"
  | "performance"
  | "automations"
  | "notifications"
  | "activity";

const ALLOWED: ResourceName[] = [
  "inspiration",
  "library",
  "progress",
  "checkins",
  "hero",
  "heroContent",
  "projects",
  "scripts",
  "costs",
  "milestones",
  "scriptVersions",
  "scriptReviews",
  "assets",
  "deliverables",
  "performance",
  "automations",
  "notifications",
  "activity",
];

export function isAllowedResource(name: string): name is ResourceName {
  return (ALLOWED as string[]).includes(name);
}

export async function readData<T>(resource: ResourceName): Promise<T> {
  const db = getDb();
  const row = db
    .prepare("SELECT data FROM app_data WHERE resource = ?")
    .get(resource) as { data: string } | undefined;

  const parsed = row ? JSON.parse(row.data) : [];
  if (isItemResource(resource) && Array.isArray(parsed)) {
    return activeResourceItems(parsed) as T;
  }
  return parsed as T;
}

export async function writeData<T>(resource: ResourceName, data: T): Promise<void> {
  const db = getDb();
  db.prepare(
    `INSERT INTO app_data (resource, data) VALUES (?, ?)
     ON CONFLICT(resource) DO UPDATE SET data = excluded.data`
  ).run(resource, JSON.stringify(data));
}

export type ItemResourceName = Exclude<ResourceName, "hero" | "heroContent" | "activity">;
export type ResourceItem = { id: string; [key: string]: unknown };

export function isItemResource(name: string): name is ItemResourceName {
  return (
    isAllowedResource(name) &&
    name !== "hero" &&
    name !== "heroContent" &&
    name !== "activity"
  );
}

function readResourceItems<T extends { id: string; deletedAt?: unknown }>(
  resource: ItemResourceName
): T[] {
  const db = getDb();
  const row = db
    .prepare("SELECT data FROM app_data WHERE resource = ?")
    .get(resource) as { data: string } | undefined;

  if (!row) return [];
  const parsed = JSON.parse(row.data);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function isDeletedResourceItem(item: { deletedAt?: unknown }) {
  return typeof item.deletedAt === "string" && item.deletedAt.length > 0;
}

function activeResourceItems<T extends { deletedAt?: unknown }>(items: T[]): T[] {
  return items.filter((item) => !isDeletedResourceItem(item));
}

function deletedResourceItems<T extends { deletedAt?: unknown }>(items: T[]): T[] {
  return items.filter((item) => isDeletedResourceItem(item));
}

function writeResourceItems<T extends { id: string; deletedAt?: unknown }>(
  resource: ItemResourceName,
  items: T[]
): T[] {
  const db = getDb();
  db.prepare(
    `INSERT INTO app_data (resource, data) VALUES (?, ?)
     ON CONFLICT(resource) DO UPDATE SET data = excluded.data`
  ).run(resource, JSON.stringify(items));
  return items;
}

export function listDataItems<T extends { id: string; deletedAt?: unknown }>(
  resource: ItemResourceName
): T[] {
  return activeResourceItems(readResourceItems<T>(resource));
}

export function listAllDataItems<T extends { id: string; deletedAt?: unknown }>(
  resource: ItemResourceName
): T[] {
  return readResourceItems<T>(resource);
}

export function listDeletedDataItems<T extends { id: string; deletedAt?: unknown }>(
  resource: ItemResourceName
): T[] {
  return deletedResourceItems(readResourceItems<T>(resource));
}

export function insertDataItem<T extends { id: string; deletedAt?: unknown }>(
  resource: ItemResourceName,
  item: T
): T {
  const db = getDb();
  const tx = db.transaction(() => {
    const items = readResourceItems<T>(resource);
    if (items.some((existing) => existing.id === item.id)) {
      throw new Error("duplicate id");
    }
    writeResourceItems(resource, [item, ...items]);
    return item;
  });
  return tx();
}

export function updateDataItem<T extends { id: string; deletedAt?: unknown }>(
  resource: ItemResourceName,
  id: string,
  updater: (item: T) => T
): T | null {
  const db = getDb();
  const tx = db.transaction(() => {
    const items = readResourceItems<T>(resource);
    let updated: T | null = null;
    const next = items.map((item) => {
      if (item.id !== id) return item;
      if (isDeletedResourceItem(item)) return item;
      updated = updater(item);
      return updated;
    });
    if (!updated) return null;
    writeResourceItems(resource, next);
    return updated;
  });
  return tx();
}

export function deleteDataItem<T extends { id: string; deletedAt?: unknown }>(
  resource: ItemResourceName,
  id: string,
  user?: Pick<User, "id" | "displayName">
): T | null {
  const db = getDb();
  const tx = db.transaction(() => {
    const items = readResourceItems<T>(resource);
    let item: T | null = null;
    const deletedAt = new Date().toISOString();
    const next = items.map((entry) => {
      if (entry.id !== id || isDeletedResourceItem(entry)) return entry;
      item = {
        ...entry,
        deletedAt,
        deletedBy: user?.displayName,
        deletedById: user?.id,
      } as T;
      return item;
    });
    if (!item) return null;
    writeResourceItems(resource, next);
    return item;
  });
  return tx();
}

export function hardDeleteDataItem<T extends { id: string; deletedAt?: unknown }>(
  resource: ItemResourceName,
  id: string
): T | null {
  const db = getDb();
  const tx = db.transaction(() => {
    const items = readResourceItems<T>(resource);
    const item = items.find((entry) => entry.id === id) ?? null;
    if (!item) return null;
    writeResourceItems(
      resource,
      items.filter((entry) => entry.id !== id)
    );
    return item;
  });
  return tx();
}

export function restoreDataItem<T extends { id: string; deletedAt?: unknown }>(
  resource: ItemResourceName,
  id: string
): T | null {
  const db = getDb();
  const tx = db.transaction(() => {
    const items = readResourceItems<T>(resource);
    let restored: T | null = null;
    const next = items.map((item) => {
      if (item.id !== id || !isDeletedResourceItem(item)) return item;
      restored = Object.fromEntries(
        Object.entries(item).filter(
          ([key]) => !["deletedAt", "deletedBy", "deletedById"].includes(key)
        )
      ) as T;
      return restored;
    });
    if (!restored) return null;
    writeResourceItems(resource, next);
    return restored;
  });
  return tx();
}

export function deleteProjectItem(
  projectId: string,
  user?: Pick<User, "id" | "displayName">
): boolean {
  return !!deleteDataItem("projects", projectId, user);
}

export function hardDeleteProjectAndUnlink(projectId: string): ResourceItem | null {
  const db = getDb();
  const tx = db.transaction(() => {
    const projects = readResourceItems<ResourceItem>("projects");
    const project = projects.find((entry) => entry.id === projectId) ?? null;
    if (!project) return null;

    writeResourceItems(
      "projects",
      projects.filter((entry) => entry.id !== projectId)
    );

    const linkedResources: ItemResourceName[] = ["inspiration", "library", "progress"];
    for (const resource of linkedResources) {
      const items = readResourceItems<ResourceItem>(resource);
      let changed = false;
      const next = items.map((item) => {
        if (item.projectId !== projectId) return item;
        changed = true;
        const rest = { ...item };
        delete rest.projectId;
        return rest;
      });
      if (changed) {
        writeResourceItems(resource, next);
      }
    }

    for (const resource of [
      "scripts",
      "costs",
      "milestones",
      "scriptVersions",
      "scriptReviews",
      "assets",
      "deliverables",
      "performance",
      "notifications",
    ] as ItemResourceName[]) {
      const items = readResourceItems<ResourceItem>(resource);
      const next = items.filter((item) => item.projectId !== projectId);
      if (next.length !== items.length) {
        writeResourceItems(resource, next);
      }
    }

    return project;
  });
  return tx();
}

function titleFromTrashItem(item: ResourceItem): string {
  for (const key of ["title", "name", "note", "memberName"]) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "未命名";
}

function subtitleFromTrashItem(resource: ItemResourceName, item: ResourceItem): string | undefined {
  if (resource === "checkins") {
    return typeof item.date === "string" ? item.date : undefined;
  }
  if (resource === "progress") {
    return typeof item.assignee === "string" ? `负责人：${item.assignee}` : undefined;
  }
  if (resource === "library") {
    return typeof item.category === "string" ? item.category : undefined;
  }
  if (resource === "inspiration" && Array.isArray(item.tags) && item.tags.length > 0) {
    return item.tags.filter((tag) => typeof tag === "string").join(", ");
  }
  if (resource === "scripts" && typeof item.duration === "number") {
    return `${item.duration} 秒`;
  }
  if (resource === "costs" && typeof item.amount === "number") {
    return `¥${item.amount.toLocaleString("zh-CN")}`;
  }
  if (resource === "milestones" && typeof item.date === "string") {
    return item.date;
  }
  if (resource === "assets" && typeof item.fileName === "string") return item.fileName;
  if (resource === "deliverables" && typeof item.platform === "string") return item.platform;
  if (resource === "performance" && typeof item.views === "number") {
    return `${item.views.toLocaleString("zh-CN")} 播放`;
  }
  if (resource === "scriptVersions" && typeof item.version === "number") {
    return `版本 ${item.version}`;
  }
  if (resource === "scriptReviews" && typeof item.createdBy === "string") {
    return item.createdBy;
  }
  if (resource === "automations" && typeof item.time === "string") return item.time;
  if (resource === "notifications" && typeof item.type === "string") return item.type;
  return undefined;
}

export function listTrashItems(): TrashItem[] {
  const resources: TrashResource[] = [
    "projects",
    "progress",
    "inspiration",
    "library",
    "checkins",
    "scripts",
    "costs",
    "milestones",
    "scriptVersions",
    "scriptReviews",
    "assets",
    "deliverables",
    "performance",
    "automations",
    "notifications",
  ];
  return resources
    .flatMap((resource) =>
      listDeletedDataItems<ResourceItem>(resource).map((item) => ({
        resource,
        id: item.id,
        title: titleFromTrashItem(item),
        subtitle: subtitleFromTrashItem(resource, item),
        deletedAt: String(item.deletedAt),
        deletedBy: typeof item.deletedBy === "string" ? item.deletedBy : undefined,
      }))
    )
    .sort((a, b) => +new Date(b.deletedAt) - +new Date(a.deletedAt));
}
