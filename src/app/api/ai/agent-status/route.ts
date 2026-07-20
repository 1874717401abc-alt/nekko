import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAgentStatus } from "@/lib/aiAgent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const status = await getAgentStatus();
  return NextResponse.json({ status });
}
