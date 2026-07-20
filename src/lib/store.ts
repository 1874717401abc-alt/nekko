import { getDb } from "@/lib/db";

export type ResourceName =
  | "inspiration"
  | "library"
  | "progress"
  | "checkins"
  | "hero"
  | "heroContent"
  | "projects"
  | "activity";

const ALLOWED: ResourceName[] = [
  "inspiration",
  "library",
  "progress",
  "checkins",
  "hero",
  "heroContent",
  "projects",
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

  return (row ? JSON.parse(row.data) : []) as T;
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

function readResourceItems<T extends { id: string }>(resource: ItemResourceName): T[] {
  const db = getDb();
  const row = db
    .prepare("SELECT data FROM app_data WHERE resource = ?")
    .get(resource) as { data: string } | undefined;

  if (!row) return [];
  const parsed = JSON.parse(row.data);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function writeResourceItems<T extends { id: string }>(
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

export function listDataItems<T extends { id: string }>(resource: ItemResourceName): T[] {
  return readResourceItems<T>(resource);
}

export function insertDataItem<T extends { id: string }>(
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

export function updateDataItem<T extends { id: string }>(
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
      updated = updater(item);
      return updated;
    });
    if (!updated) return null;
    writeResourceItems(resource, next);
    return updated;
  });
  return tx();
}

export function deleteDataItem<T extends { id: string }>(
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

export function deleteProjectAndUnlink(projectId: string): boolean {
  const db = getDb();
  const tx = db.transaction(() => {
    const projects = readResourceItems<ResourceItem>("projects");
    const exists = projects.some((project) => project.id === projectId);
    if (!exists) return false;

    writeResourceItems(
      "projects",
      projects.filter((project) => project.id !== projectId)
    );

    for (const resource of ["inspiration", "library", "progress"] as const) {
      const items = readResourceItems<ResourceItem>(resource);
      const next = items.map((item) => {
        if (item.projectId !== projectId) return item;
        return Object.fromEntries(
          Object.entries(item).filter(([key]) => key !== "projectId")
        ) as ResourceItem;
      });
      writeResourceItems(resource, next);
    }

    return true;
  });
  return tx();
}
