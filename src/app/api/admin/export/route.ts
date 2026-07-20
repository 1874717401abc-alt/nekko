import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import { listUsers } from "@/lib/users";
import type {
  ActivityEvent,
  CheckIn,
  HeroContent,
  InspirationItem,
  LibraryItem,
  ProgressTask,
  Project,
} from "@/lib/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const [projects, progress, inspiration, library, checkins, activity, heroImages, heroContent] =
    await Promise.all([
      readData<Project[]>("projects"),
      readData<ProgressTask[]>("progress"),
      readData<InspirationItem[]>("inspiration"),
      readData<LibraryItem[]>("library"),
      readData<CheckIn[]>("checkins"),
      readData<ActivityEvent[]>("activity"),
      readData<string[]>("hero"),
      readData<Partial<HeroContent>>("heroContent"),
    ]);

  const exportedAt = new Date().toISOString();
  const payload = {
    exportedAt,
    exportedBy: { id: user.id, displayName: user.displayName },
    users: listUsers(),
    data: {
      projects,
      progress,
      inspiration,
      library,
      checkins,
      activity,
      heroImages,
      heroContent,
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="nekko-export-${exportedAt.slice(0, 10)}.json"`,
    },
  });
}
