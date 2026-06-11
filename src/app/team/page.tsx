import Link from "next/link";
import Avatar from "@/components/Avatar";
import PageHeader from "@/components/PageHeader";
import { HoverCard, StaggerContainer, StaggerItem } from "@/components/motion";
import { getCurrentUser } from "@/lib/auth";
import { listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [members, currentUser] = await Promise.all([listUsers(), getCurrentUser()]);

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Team"
        title="团队"
        description={`${members.length} 位成员，一起把内容做好。`}
      />

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {members.map((member, idx) => (
          <StaggerItem key={member.id}>
            <HoverCard className="rounded-2xl border border-line/70 bg-card p-8 sm:p-10 h-full flex flex-col">
              <div className="flex items-start justify-between gap-4 mb-4">
                <span className="text-[11px] uppercase tracking-[0.3em] text-accent">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                {currentUser?.id === member.id && (
                  <Link
                    href="/profile"
                    className="text-[11px] uppercase tracking-[0.2em] text-accent hover:underline"
                  >
                    编辑我的资料 →
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-4 mb-2">
                <Avatar src={member.avatarUrl || undefined} name={member.displayName} size={56} />
                <h2 className="font-serif-display text-3xl sm:text-4xl text-ink">
                  {member.displayName}
                </h2>
              </div>
              {member.role && <p className="text-sm text-ink-soft mb-6">{member.role}</p>}
              {member.contact && (
                <p className="text-xs text-ink-soft mb-2">联系方式：{member.contact}</p>
              )}
              {member.bio && (
                <p className="text-sm leading-relaxed text-ink mb-8 flex-1 whitespace-pre-wrap">
                  {member.bio}
                </p>
              )}
              {member.focus.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {member.focus.map((f) => (
                    <span
                      key={f}
                      className="text-[11px] px-3 py-1 rounded-full bg-paper-soft text-ink-soft"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </HoverCard>
          </StaggerItem>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-ink-soft">还没有成员，邀请大家来注册吧。</p>
        )}
      </StaggerContainer>
    </div>
  );
}
