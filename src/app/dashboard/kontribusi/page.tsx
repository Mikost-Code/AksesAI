import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { ContributionRowActions } from "@/components/dashboard/contribution-row-actions";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { listOwnPrograms } from "@/lib/programs/own-programs";
import { PROGRAM_STATUS_LABEL, type ProgramStatus } from "@/lib/constants/labels";
import { formatDateID } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kontribusi saya",
  robots: { index: false },
};

const FILTERS = [
  "semua",
  "draft",
  "pending",
  "needs_changes",
  "verified",
  "rejected",
  "expired",
] as const;

type Filter = (typeof FILTERS)[number];

export default async function MyContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const params = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(params.status ?? "")
    ? (params.status as Filter)
    : "semua";

  const all = await listOwnPrograms(user.id);
  const programs =
    filter === "semua" ? all : all.filter((p) => p.status === (filter as ProgramStatus));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kontribusi saya</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {all.length} informasi · draf dan informasi dalam peninjauan hanya
            terlihat oleh Anda dan staf.
          </p>
        </div>
        <Link href="/dashboard/kontribusi/baru" className={buttonVariants({ size: "sm" })}>
          <FilePlus2 className="size-4" aria-hidden={true} />
          Bagikan informasi
        </Link>
      </div>

      <nav aria-label="Filter status" className="flex flex-wrap gap-2">
        {FILTERS.map((value) => {
          const active = filter === value;
          const count =
            value === "semua"
              ? all.length
              : all.filter((p) => p.status === (value as ProgramStatus)).length;
          return (
            <Link
              key={value}
              href={value === "semua" ? "/dashboard/kontribusi" : `?status=${value}`}
              aria-current={active ? "page" : undefined}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium",
                active
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {value === "semua" ? "Semua" : PROGRAM_STATUS_LABEL[value as ProgramStatus]} ({count})
            </Link>
          );
        })}
      </nav>

      {programs.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {programs.map((program) => (
            <li key={program.id}>
              <article className="rounded-lg border border-border bg-background p-4 shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/kontribusi/${program.id}`}
                      className="font-medium hover:underline"
                    >
                      {program.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {program.categoryName} · {program.accessTypeLabel} · {program.sourceCount}{" "}
                      sumber · diperbarui {formatDateID(program.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge status={program.status} />
                </div>

                {program.reviewNote ? (
                  <div className="mt-3 rounded-md border border-warning/25 bg-warning-soft p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-warning">
                      Catatan reviewer
                    </p>
                    <p className="mt-1 whitespace-pre-line">{program.reviewNote}</p>
                  </div>
                ) : null}

                <ContributionRowActions
                  programId={program.id}
                  status={program.status}
                  publicSlug={program.status === "verified" || program.status === "expired" ? program.slug : null}
                />
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={filter === "semua" ? "Belum ada kontribusi" : "Tidak ada kontribusi pada status ini"}
          description="Bagikan pengumuman resmi yang Anda temukan, lengkap dengan tautan sumbernya."
          action={{ label: "Bagikan informasi", href: "/dashboard/kontribusi/baru" }}
        />
      )}
    </div>
  );
}
