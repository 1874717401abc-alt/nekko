import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runContentRadar } from "@/lib/contentRadar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function canRunRadar(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const cronSecret = process.env.RADAR_CRON_SECRET;
  if (cronSecret && token && token === cronSecret) {
    return true;
  }

  const user = await getCurrentUser();
  return Boolean(user?.isAdmin);
}

export async function POST(req: NextRequest) {
  if (!(await canRunRadar(req))) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const requestedLimit =
    body && typeof body === "object" && "limit" in body && typeof body.limit === "number"
      ? body.limit
      : 6;
  const limit = Math.max(1, Math.min(Math.round(requestedLimit), 10));
  const result = await runContentRadar(limit);

  return NextResponse.json(result);
}
