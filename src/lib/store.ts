import { getDb } from "@/lib/db";

export type ResourceName = "inspiration" | "library" | "progress" | "checkins" | "hero" | "heroContent" | "projects";

const ALLOWED: ResourceName[] = ["inspiration", "library", "progress", "checkins", "hero", "heroContent", "projects"];

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
