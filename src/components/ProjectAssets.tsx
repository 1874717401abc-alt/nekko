import Link from "next/link";
import { ArrowUpRight, BookOpen, Lightbulb } from "lucide-react";
import type { InspirationItem, LibraryItem } from "@/lib/types";

const typeLabel: Record<InspirationItem["type"], string> = {
  link: "链接",
  note: "笔记",
  image: "图片",
};

export default function ProjectAssets({
  inspiration,
  library,
}: {
  inspiration: InspirationItem[];
  library: LibraryItem[];
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section aria-labelledby="project-inspiration-heading">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
          <h2 id="project-inspiration-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Lightbulb className="h-4 w-4 text-accent" aria-hidden="true" />
            项目灵感
          </h2>
          <Link href="/inspiration" className="inline-flex items-center gap-1 text-xs text-accent">
            灵感库 <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
        <div className="divide-y divide-line/70 border-y border-line/70">
          {inspiration.map((item) => (
            <div key={item.id} className="py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-accent">{typeLabel[item.type]}</span>
                <p className="text-sm font-medium text-ink">{item.title}</p>
              </div>
              {item.note && <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-soft">{item.note}</p>}
              {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-accent hover:underline">{item.url}</a>}
            </div>
          ))}
          {inspiration.length === 0 && <p className="py-10 text-center text-xs text-ink-soft">暂无关联灵感。</p>}
        </div>
      </section>

      <section aria-labelledby="project-library-heading">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
          <h2 id="project-library-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
            <BookOpen className="h-4 w-4 text-sky-500" aria-hidden="true" />
            项目资料
          </h2>
          <Link href="/library" className="inline-flex items-center gap-1 text-xs text-accent">
            资料库 <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
        <div className="divide-y divide-line/70 border-y border-line/70">
          {library.map((item) => (
            <div key={item.id} className="py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-paper-soft px-2 py-0.5 text-[10px] text-ink-soft">{item.category}</span>
                <a href={item.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-sm font-medium text-ink hover:text-accent">{item.title}</a>
              </div>
              {item.note && <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-soft">{item.note}</p>}
            </div>
          ))}
          {library.length === 0 && <p className="py-10 text-center text-xs text-ink-soft">暂无关联资料。</p>}
        </div>
      </section>
    </div>
  );
}
