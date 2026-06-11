import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/users";
import type { User } from "@/lib/types";

export {
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE,
  GUEST_COOKIE,
  GUEST_COOKIE_MAX_AGE,
  createSessionToken,
  verifySessionToken,
} from "@/lib/session";

import { SESSION_COOKIE, GUEST_COOKIE, verifySessionToken } from "@/lib/session";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function verifyInviteCode(code: string): boolean {
  const expected = process.env.TEAM_INVITE_CODE ?? "";
  return expected.length > 0 && code === expected;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (!session) return null;
  return getUserById(session.uid);
}

export async function isGuest(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_COOKIE)?.value === "1";
}
