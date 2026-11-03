import { CalendarClock, MapPin, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import type { ProgramStatus } from "@/lib/constants/labels";
import { formatDateID } from "@/lib/utils";

export type ProgramCardData = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  categoryName: string;
  regionLabel: string;
  organizer: string;
  status: ProgramStatus;
  endDate: string | null;
  contributorUsername: string;
  contributorAvatar: string | null;
};

/**
 * Kartu program (UI_UX §6.1). Seluruh kartu dapat diklik melalui pseudo-element
 * pada link judul — satu target fokus per kartu.
 */
export function ProgramCard({ program }: { program: ProgramCardData }) {
  const endDate = formatDateID(program.endDate);

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden transition-shadow duration-150 hover:shadow-[var(--shadow-card-hover)] focus-within:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
          {program.categoryName}
        </span>
        <StatusBadge status={program.status} />
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5">
        <h3 className="font-heading text-lg font-semibold leading-snug">
          <Link
            href={`/bansos/${program.slug}`}
            className="line-clamp-2 outline-none after:absolute after:inset-0 after:content-['']"
          >
            {program.title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {program.summary}
        </p>

        <dl className="mt-auto flex flex-col gap-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <UserRound className="size-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Penyelenggara</dt>
            <dd className="line-clamp-1">{program.organizer}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Wilayah</dt>
            <dd className="line-clamp-1">{program.regionLabel}</dd>
          </div>
          {endDate ? (
            <div className="flex items-center gap-1.5">
              <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
              <dt className="sr-only">Tanggal berakhir</dt>
              <dd>Tutup: {endDate}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
        {program.contributorAvatar ? (
          <Image
            src={program.contributorAvatar}
            alt=""
            width={20}
            height={20}
            className="size-5 rounded-full"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px]"
          >
            {program.contributorUsername.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span>Dibagikan oleh {program.contributorUsername}</span>
      </div>
    </Card>
  );
}
