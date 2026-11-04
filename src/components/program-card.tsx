import { CalendarClock, CreditCard, Gift, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import type { AccessType, ProgramStatus } from "@/lib/constants/labels";
import { formatDateID } from "@/lib/utils";

export type ProgramCardData = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  categoryName: string;
  accessType: AccessType;
  accessTypeLabel: string;
  provider: string;
  freeTier: string | null;
  freeTierAvailable: boolean;
  requiresCard: boolean;
  priceInput: number | null;
  priceOutput: number | null;
  status: ProgramStatus;
  promoEnd: string | null;
  contributorUsername: string;
  contributorAvatar: string | null;
};

function priceLabel(input: number | null, output: number | null): string | null {
  if (input === null && output === null) return null;
  const fmt = (v: number | null) => (v === null ? "—" : v === 0 ? "gratis" : `$${v.toFixed(2)}`);
  return `In ${fmt(input)} · Out ${fmt(output)} / 1jt token`;
}

/**
 * Kartu entri info AI (UI_UX §6.1). Seluruh kartu dapat diklik melalui
 * pseudo-element pada link judul — satu target fokus per kartu.
 */
export function ProgramCard({ program }: { program: ProgramCardData }) {
  const promoEnd = formatDateID(program.promoEnd);
  const pricing = priceLabel(program.priceInput, program.priceOutput);

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-elevated)] focus-within:border-primary/30 focus-within:shadow-[var(--shadow-elevated)]">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
          {program.categoryName}
        </span>
        <StatusBadge status={program.status} />
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            {program.accessTypeLabel}
          </span>
          {program.freeTierAvailable ? (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
              Ada free tier
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              Berbayar
            </span>
          )}
          {program.requiresCard ? (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] text-warning">
              Perlu kartu
            </span>
          ) : null}
        </div>

        <h3 className="font-heading text-lg font-semibold leading-snug">
          <Link
            href={`/info/${program.slug}`}
            className="line-clamp-2 outline-none transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-primary"
          >
            {program.title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {program.summary}
        </p>

        <dl className="mt-auto flex flex-col gap-1.5 rounded-lg bg-surface p-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 shrink-0 text-primary/70" aria-hidden="true" />
            <dt className="sr-only">Provider</dt>
            <dd className="line-clamp-1">{program.provider}</dd>
          </div>
          {program.freeTierAvailable && program.freeTier ? (
            <div className="flex items-center gap-1.5">
              <Gift className="size-4 shrink-0 text-accent" aria-hidden="true" />
              <dt className="sr-only">Kuota gratis</dt>
              <dd className="line-clamp-1">{program.freeTier}</dd>
            </div>
          ) : null}
          {pricing ? (
            <div className="flex items-center gap-1.5">
              <CreditCard className="size-4 shrink-0" aria-hidden="true" />
              <dt className="sr-only">Harga per token</dt>
              <dd className="line-clamp-1">{pricing}</dd>
            </div>
          ) : null}
          {promoEnd ? (
            <div className="flex items-center gap-1.5">
              <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
              <dt className="sr-only">Promo berakhir</dt>
              <dd>Promo s.d. {promoEnd}</dd>
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
