import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    getDb().prepare("SELECT 1 AS ok").get();
    return NextResponse.json({ status: "ok", database: "ok" });
  } catch (error) {
    console.error("[api/health] Database health check failed", error);
    return NextResponse.json(
      { status: "error", database: "unavailable" },
      { status: 503 }
    );
  }
}
