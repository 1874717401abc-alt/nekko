import PageHeader from "@/components/PageHeader";
import { HoverCard, StaggerContainer, StaggerItem } from "@/components/motion";
import { readData } from "@/lib/store";
import type { TeamMember } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const members = await readData<TeamMember[]>("team");

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-5xl mx-auto">
      <PageHeader eyebrow="Team" title="团队" description="两个人，分工明确，互相补位。" />

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {members.map((member, idx) => (
          <StaggerItem key={member.id}>
            <HoverCard className="rounded-2xl border border-line/70 bg-card p-8 sm:p-10 h-full flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.3em] text-accent mb-4">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <h2 className="font-serif-display text-3xl sm:text-4xl text-ink mb-2">
                {member.name}
              </h2>
              <p className="text-sm text-ink-soft mb-6">{member.role}</p>
              <p className="text-sm leading-relaxed text-ink mb-8 flex-1">{member.bio}</p>
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
            </HoverCard>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}
