import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Inbox, UserCheck } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { getCurrentUser, hasAnyRole } from "@/lib/auth/session";
import { listReviewQueue, QUEUE_PAGE_SIZE } from "@/lib/programs/review";
import { paginationSchema } from "@/lib/validation/staff";
import { formatDateTimeID } from "@/lib/utils";

export const metadata: Metadata = { title: "Antrean review", robots: { index: false } };

const CLAIM_FILTERS = [
  { value: "semua", label: "Semua" },
  { value: "bebas", label: "Belum diklaim" },
  { value: "saya", label: "Diklaim saya" },
] as const;

function waitingLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam`;
  return `${Math.floor(hours / 24)} hari`;
}

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ klaim?: string; halaman?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !hasAnyRole(user, ["reviewer", "admin"])) return null;

  const params = await searchParams;
  const claimed = (CLAIM_FILTERS.some((f) => f.value === params.klaim)
    ? params.klaim
    : "semua") as "semua" | "bebas" | "saya";
  const { page } = paginationSchema.parse({ page: params.halaman });

  const { items, total } = await listReviewQueue({
    reviewerId: user.id,
    claimed,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / QUEUE_PAGE_SIZE));

  function buildHref(nextClaim: string, nextPage: number): string {
    const sp = new URLSearchParams();
    if (nextClaim !== "semua") sp.set("klaim", nextClaim);
    if (nextPage > 1) sp.set("halaman", String(nextPage));
    const qs = sp.toString();
    return qs ? `/review?${qs}` : "/review";
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Antrean review</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} kontribusi menunggu tinjauan · diurutkan dari yang paling lama
          menunggu. Anda tidak dapat meninjau kontribusi sendiri.
        </p>
      </div>

      <nav aria-label="Filter klaim" className="flex flex-wrap gap-2">
        {CLAIM_FILTERS.map((f) => {
          const active = claimed === f.value;
          return (
            <Link
              key={f.value}
              href={buildHref(f.value, 1)}
              aria-current={active ? "page" : undefined}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium",
                active
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <article className="rounded-lg border border-border bg-background p-4 shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/review/${item.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.categoryName} · {item.accessTypeLabel} · {item.provider}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Dari {item.contributorName} · {item.sourceCount} sumber · masuk{" "}
                      {formatDateTimeID(item.submittedAt)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {waitingLabel(item.waitingMinutes)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
                  {item.claimedByMe ? (
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      <UserCheck className="size-3.5" aria-hidden="true" />
                      Anda mengklaim · sisa {item.claimedExpiresInMinutes} menit
                    </span>
                  ) : item.claimedByName ? (
                    <span className="text-muted-foreground">
                      Sedang ditinjau {item.claimedByName} · sisa{" "}
                      {item.claimedExpiresInMinutes} menit
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Belum diklaim</span>
                  )}
                  <Link
                    href={`/review/${item.id}`}
                    className="ml-auto rounded-md border border-border px-3 py-1.5 font-medium hover:bg-surface"
                  >
                    Buka panel review
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Antrean kosong"
          description="Tidak ada kontribusi yang menunggu tinjauan pada filter ini. Antrean aktif kembali saat ada kiriman baru."
          icon={<Inbox className="size-6" aria-hidden="true" />}
        />
      )}

      {totalPages > 1 ? (
        <nav aria-label="Navigasi halaman" className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={buildHref(claimed, page - 1)}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
              >
                Sebelumnya
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={buildHref(claimed, page + 1)}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
              >
                Berikutnya
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
