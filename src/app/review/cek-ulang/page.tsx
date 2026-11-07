import type { Metadata } from "next";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser, hasAnyRole } from "@/lib/auth/session";
import { listStaleForRecheck } from "@/lib/programs/review";
import { formatDateID } from "@/lib/utils";
import { paginationSchema } from "@/lib/validation/staff";

export const metadata: Metadata = { title: "Cek ulang berkala", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Daftar khusus reviewer: entri verified yang verifikasinya basi
 * (> 90 hari). Nilai utama direktori = data segar, jadi entri di sini
 * wajib diperiksa ulang terhadap sumbernya lalu ditandai dicek ulang.
 */
export default async function StaleRecheckPage({
  searchParams,
}: {
  searchParams: Promise<{ halaman?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !hasAnyRole(user, ["reviewer", "admin"])) return null;

  const params = await searchParams;
  const { page } = paginationSchema.parse({ page: params.halaman });

  const { items, total, pageSize } = await listStaleForRecheck({ page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function href(targetPage: number): string {
    return targetPage > 1 ? `/review/cek-ulang?halaman=${targetPage}` : "/review/cek-ulang";
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Cek ulang berkala</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} entri terverifikasi yang belum dicek ulang lebih dari 90 hari —
          urut dari yang paling basi. Periksa sumber &amp; kuota terbaru, lalu
          tandai sudah dicek ulang di panel review.
        </p>
      </div>

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
                      {item.categoryName} · {item.accessTypeLabel} · {item.provider} ·{" "}
                      {item.sourceCount} sumber
                      {item.contributorName ? ` · dari ${item.contributorName}` : ""}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
                    <RefreshCcw className="size-3.5" aria-hidden="true" />
                    {item.daysStale} hari sejak verifikasi
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>Terverifikasi {formatDateID(item.verifiedAt)}</span>
                  <Link
                    href={`/review/${item.id}`}
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
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
          title="Tidak ada yang perlu dicek ulang"
          description="Semua entri terverifikasi masih dalam batas 90 hari. Daftar ini akan terisi otomatis seiring waktu."
          icon={<RefreshCcw className="size-6" aria-hidden="true" />}
        />
      )}

      {totalPages > 1 ? (
        <nav aria-label="Navigasi halaman" className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={href(page - 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Sebelumnya
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link href={href(page + 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Berikutnya
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
