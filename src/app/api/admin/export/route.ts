import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listAllDataItems, listTrashItems, readData } from "@/lib/store";
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

  const [activity, heroImages, heroContent] =
    await Promise.all([
      readData<ActivityEvent[]>("activity"),
      readData<string[]>("hero"),
      readData<Partial<HeroContent>>("heroContent"),
    ]);

  const exportedAt = new Date().toISOString();
  const payload = {
    exportedAt,
    exportedBy: { id: user.id, displayName: user.displayName },
    users: listUsers(),
    trash: listTrashItems(),
    data: {
      projects: listAllDataItems<Project>("projects"),
      progress: listAllDataItems<ProgressTask>("progress"),
      inspiration: listAllDataItems<InspirationItem>("inspiration"),
      library: listAllDataItems<LibraryItem>("library"),
      checkins: listAllDataItems<CheckIn>("checkins"),
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
