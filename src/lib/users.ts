import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import type { User } from "@/lib/types";

type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  role: string;
  bio: string;
  focus: string;
  created_at: string;
};

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    bio: row.bio,
    focus: JSON.parse(row.focus || "[]"),
    createdAt: row.created_at,
  };
}

export function getUserByUsername(username: string): (User & { passwordHash: string }) | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as UserRow | undefined;
  if (!row) return null;
  return { ...toUser(row), passwordHash: row.password_hash };
}

export function getUserById(id: string): User | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  if (!row) return null;
  return toUser(row);
}

export function createUser(input: {
  username: string;
  passwordHash: string;
  displayName: string;
}): User {
  const db = getDb();
  const id = `user-${randomUUID()}`;
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, username, password_hash, display_name, role, bio, focus, created_at)
     VALUES (?, ?, ?, ?, '', '', '[]', ?)`
  ).run(id, input.username, input.passwordHash, input.displayName, createdAt);
  return {
    id,
    username: input.username,
    displayName: input.displayName,
    role: "",
    bio: "",
    focus: [],
    createdAt,
  };
}

export function updateUser(
  id: string,
  fields: { displayName?: string; role?: string; bio?: string; focus?: string[] }
): User | null {
  const existing = getUserById(id);
  if (!existing) return null;

  const next = {
    displayName: fields.displayName ?? existing.displayName,
    role: fields.role ?? existing.role,
    bio: fields.bio ?? existing.bio,
    focus: fields.focus ?? existing.focus,
  };

  const db = getDb();
  db.prepare(
    "UPDATE users SET display_name = ?, role = ?, bio = ?, focus = ? WHERE id = ?"
  ).run(next.displayName, next.role, next.bio, JSON.stringify(next.focus), id);

  return { ...existing, ...next };
}

export function listUsers(): User[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM users ORDER BY created_at ASC").all() as UserRow[];
  return rows.map(toUser);
}
