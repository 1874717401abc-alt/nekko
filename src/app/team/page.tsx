import Link from "next/link";
import { Settings } from "lucide-react";
import Avatar from "@/components/Avatar";
import PageHeader from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [members, currentUser] = await Promise.all([listUsers(), getCurrentUser()]);

  return (
    <div className="mx-auto min-h-screen max-w-[1540px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-10">
      <PageHeader
        eyebrow="Team"
        title="团队"
        description={`${members.length} 位成员，一起把内容做好。`}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => (
            <section key={member.id} className="flex min-h-44 flex-col rounded-lg border border-line bg-card p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar src={member.avatarUrl || undefined} name={member.displayName} size={48} />
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-ink">{member.displayName}</h2>
                    <p className="mt-0.5 truncate text-xs text-ink-soft">{member.role || "工作室成员"}</p>
                  </div>
                </div>
                {currentUser?.id === member.id && (
                  <Link
                    href="/profile"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-paper-soft hover:text-accent"
                    aria-label="编辑我的资料"
                    title="编辑我的资料"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                )}
              </div>
              {member.contact && (
                <p className="mb-3 text-xs text-ink-soft">{member.contact}</p>
              )}
              {member.bio && (
                <p className="mb-5 flex-1 whitespace-pre-wrap text-sm leading-6 text-ink">
                  {member.bio}
                </p>
              )}
              {member.focus.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-1.5 border-t border-line pt-4">
                  {member.focus.map((f) => (
                    <span
                      key={f}
                      className="rounded bg-paper-soft px-2 py-1 text-[11px] text-ink-soft"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </section>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-ink-soft">还没有成员，邀请大家来注册吧。</p>
        )}
      </div>
    </div>
  );
}
