import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import CheckInBoard from "@/components/CheckInBoard";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import type { CheckIn } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const [currentUser, checkins] = await Promise.all([
    getCurrentUser(),
    readData<CheckIn[]>("checkins"),
  ]);

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Check-in"
        title="每日打卡"
        description="每天上线工作时点一下，留个工作记录，也能看到大家的打卡情况。"
      />
      <CheckInBoard currentUser={currentUser} initialCheckins={checkins} />
    </div>
  );
}
