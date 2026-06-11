import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "nekko.db");

const RESOURCES = ["inspiration", "library", "progress", "checkins"] as const;

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_data (
      resource TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      focus TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    )
  `);

  seedFromJsonFiles(db);
  migrateLegacyData(db);

  return db;
}

function migrateLegacyData(db: Database.Database) {
  // Drop the old static "team" resource - members are now real user accounts.
  db.prepare("DELETE FROM app_data WHERE resource = 'team'").run();

  // Reset checkins if they're in the old { member: string } format.
  const checkinsRow = db
    .prepare("SELECT data FROM app_data WHERE resource = 'checkins'")
    .get() as { data: string } | undefined;
  if (checkinsRow) {
    try {
      const checkins = JSON.parse(checkinsRow.data);
      const isLegacy =
        Array.isArray(checkins) &&
        checkins.some((c) => c && typeof c === "object" && "member" in c && !("userId" in c));
      if (isLegacy) {
        db.prepare("UPDATE app_data SET data = '[]' WHERE resource = 'checkins'").run();
      }
    } catch {
      // ignore malformed data, leave as-is
    }
  }

  // Backfill createdBy on items created before per-account attribution.
  const update = db.prepare("UPDATE app_data SET data = ? WHERE resource = ?");
  for (const resource of ["inspiration", "library", "progress"] as const) {
    const row = db
      .prepare("SELECT data FROM app_data WHERE resource = ?")
      .get(resource) as { data: string } | undefined;
    if (!row) continue;
    try {
      const items = JSON.parse(row.data);
      if (!Array.isArray(items)) continue;
      let changed = false;
      for (const item of items) {
        if (item && typeof item === "object" && !("createdBy" in item)) {
          item.createdBy = "未知";
          changed = true;
        }
      }
      if (changed) {
        update.run(JSON.stringify(items), resource);
      }
    } catch {
      // ignore malformed data, leave as-is
    }
  }
}

function seedFromJsonFiles(db: Database.Database) {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO app_data (resource, data) VALUES (?, ?)"
  );

  for (const resource of RESOURCES) {
    const existing = db
      .prepare("SELECT 1 FROM app_data WHERE resource = ?")
      .get(resource);
    if (existing) continue;

    const jsonFile = path.join(DATA_DIR, `${resource}.json`);
    let raw = "[]";
    try {
      raw = fs.readFileSync(jsonFile, "utf-8");
    } catch {
      // no legacy JSON file for this resource, start empty
    }
    insert.run(resource, raw);
  }
}
