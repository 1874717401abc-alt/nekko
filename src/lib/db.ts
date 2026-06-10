import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "nekko.db");

const RESOURCES = ["inspiration", "library", "progress", "team", "checkins"] as const;

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

  seedFromJsonFiles(db);

  return db;
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
