import PageHeader from "@/components/PageHeader";
import CheckInBoard from "@/components/CheckInBoard";
import { readData } from "@/lib/store";
import type { CheckIn, TeamMember } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const [members, checkins] = await Promise.all([
    readData<TeamMember[]>("team"),
    readData<CheckIn[]>("checkins"),
  ]);

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Check-in"
        title="每日打卡"
        description="每天上线工作时点一下，互相知道对方在线，也留个工作记录。"
      />
      <CheckInBoard members={members} initialCheckins={checkins} />
    </div>
  );
}
