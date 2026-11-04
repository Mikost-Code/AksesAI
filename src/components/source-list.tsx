import { BookOpen, Code2, ExternalLink, Newspaper, Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SOURCE_TYPE_LABEL } from "@/lib/constants/labels";
import type { ProgramSource } from "@/lib/programs/detail";

const TYPE_ICON = {
  dokumentasi_resmi: BookOpen,
  halaman_harga: Receipt,
  blog_provider: Newspaper,
  repo_resmi: Code2,
  media_tepercaya: Newspaper,
  lainnya: ExternalLink,
} as const;

/**
 * Daftar sumber (UI_UX §6.4). Tautan keluar memakai
 * `rel="noopener noreferrer nofollow ugc"` (SECURITY §5).
 */
export function SourceList({ sources }: { sources: ProgramSource[] }) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tidak tercantum pada sumber.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {sources.map((source) => {
        const Icon = TYPE_ICON[source.type] ?? ExternalLink;
        return (
          <li
            key={source.id}
            className="flex items-start gap-3 rounded-lg border border-border p-4"
          >
            <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{source.title ?? source.domain}</p>
                {source.isPrimary ? <Badge variant="default">Sumber utama</Badge> : null}
                <Badge variant="outline">{SOURCE_TYPE_LABEL[source.type]}</Badge>
              </div>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {source.domain}
              </p>
            </div>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface"
            >
              Buka sumber
              <span className="sr-only"> (membuka tab baru)</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
