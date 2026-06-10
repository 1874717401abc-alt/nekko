import PageHeader from "@/components/PageHeader";
import LibraryList from "@/components/LibraryList";
import { readData } from "@/lib/store";
import type { LibraryItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const items = await readData<LibraryItem[]>("library");

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Library"
        title="资料库"
        description="视频成片、文档、素材的链接合集，按类别整理，随取随用。"
      />
      <LibraryList initialItems={items} />
    </div>
  );
}
