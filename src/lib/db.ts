import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "nekko.db");

const RESOURCES = [
  "inspiration",
  "library",
  "progress",
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
] as const;

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
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      mode TEXT NOT NULL,
      memory TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      attachments TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated
      ON ai_conversations (user_id, updated_at DESC)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_created
      ON ai_messages (conversation_id, created_at ASC)
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_task_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_task_steps (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      action TEXT NOT NULL,
      ref TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL,
      result TEXT NOT NULL DEFAULT '',
      resource TEXT NOT NULL DEFAULT '',
      resource_id TEXT NOT NULL DEFAULT '',
      error TEXT NOT NULL DEFAULT '',
      requires_approval INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_agent_task_runs_user_updated
      ON agent_task_runs (user_id, updated_at DESC)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_agent_task_steps_run_order
      ON agent_task_steps (run_id, order_index ASC)
  `);

  const userColumns = (db.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map(
    (c) => c.name
  );
  if (!userColumns.includes("avatar_url")) {
    db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''");
  }
  if (!userColumns.includes("contact")) {
    db.exec("ALTER TABLE users ADD COLUMN contact TEXT NOT NULL DEFAULT ''");
  }
  if (!userColumns.includes("is_admin")) {
    db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0");
  }

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
