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
  avatar_url: string;
  contact: string;
  is_admin: number;
  created_at: string;
};

function getOwnerId(db: ReturnType<typeof getDb>): string | null {
  const row = db
    .prepare("SELECT id FROM users ORDER BY created_at ASC, rowid ASC LIMIT 1")
    .get() as { id: string } | undefined;
  return row?.id ?? null;
}

function toUser(row: UserRow, ownerId: string | null): User {
  const isOwner = row.id === ownerId;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    bio: row.bio,
    focus: JSON.parse(row.focus || "[]"),
    avatarUrl: row.avatar_url || "",
    contact: row.contact || "",
    createdAt: row.created_at,
    isAdmin: !!row.is_admin || isOwner,
    isOwner,
  };
}

export function getUserByUsername(username: string): (User & { passwordHash: string }) | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as UserRow | undefined;
  if (!row) return null;
  return { ...toUser(row, getOwnerId(db)), passwordHash: row.password_hash };
}

export function getUserById(id: string): User | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  if (!row) return null;
  return toUser(row, getOwnerId(db));
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
  const isOwner = getOwnerId(db) === id;
  return {
    id,
    username: input.username,
    displayName: input.displayName,
    role: "",
    bio: "",
    focus: [],
    avatarUrl: "",
    contact: "",
    createdAt,
    isAdmin: isOwner,
    isOwner,
  };
}

export function updateUser(
  id: string,
  fields: {
    displayName?: string;
    role?: string;
    bio?: string;
    focus?: string[];
    contact?: string;
  }
): User | null {
  const existing = getUserById(id);
  if (!existing) return null;

  const next = {
    displayName: fields.displayName ?? existing.displayName,
    role: fields.role ?? existing.role,
    bio: fields.bio ?? existing.bio,
    focus: fields.focus ?? existing.focus,
    contact: fields.contact ?? existing.contact,
  };

  const db = getDb();
  db.prepare(
    "UPDATE users SET display_name = ?, role = ?, bio = ?, focus = ?, contact = ? WHERE id = ?"
  ).run(next.displayName, next.role, next.bio, JSON.stringify(next.focus), next.contact, id);

  return { ...existing, ...next };
}

export function updateUserAvatar(id: string, avatarUrl: string): User | null {
  const existing = getUserById(id);
  if (!existing) return null;

  const db = getDb();
  db.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").run(avatarUrl, id);

  return { ...existing, avatarUrl };
}

export function listUsers(): User[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM users ORDER BY created_at ASC").all() as UserRow[];
  const ownerId = getOwnerId(db);
  return rows.map((row) => toUser(row, ownerId));
}

export function setUserAdmin(id: string, isAdmin: boolean): User | null {
  const db = getDb();
  db.prepare("UPDATE users SET is_admin = ? WHERE id = ?").run(isAdmin ? 1 : 0, id);
  return getUserById(id);
}
