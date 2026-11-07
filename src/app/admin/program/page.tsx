import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { FilterSelect, filterSelectClassName } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import {
  getManagedStats,
  listManagedPrograms,
  type ManagedFilter,
} from "@/lib/programs/manage";
import { managedProgramSearchSchema } from "@/lib/validation/staff";
import { formatDateID, formatDateTimeID } from "@/lib/utils";

export const metadata: Metadata = { title: "Program & masa berlaku", robots: { index: false } };
export const dynamic = "force-dynamic";

const FILTER_LABEL: Record<ManagedFilter, string> = {
  verified: "Terverifikasi",
  expired: "Kedaluwarsa",
  semua: "Terverifikasi + kedaluwarsa",
};

/** Selisih hari dari hari ini (UTC, sama dengan `current_date` cron di DB). */
function daysFromToday(dateIso: string, todayIso: string): number {
  const target = Date.parse(`${dateIso}T00:00:00Z`);
  const today = Date.parse(`${todayIso}T00:00:00Z`);
  return Math.round((target - today) / 86_400_000);
}

export default async function AdminProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; halaman?: string; status?: string }>;
}) {
  const params = await searchParams;
  const { page, search, status } = managedProgramSearchSchema.parse({
    page: params.halaman,
    search: params.q,
    status: params.status,
  });

  const [{ items, total, pageSize }, stats] = await Promise.all([
    listManagedPrograms({ filter: status, search, page }),
    getManagedStats(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const todayIso = new Date().toISOString().slice(0, 10);

  function href(targetPage: number): string {
    const sp = new URLSearchParams();
    if (search) sp.set("q", search);
    if (status !== "verified") sp.set("status", status);
    if (targetPage > 1) sp.set("halaman", String(targetPage));
    const qs = sp.toString();
    return qs ? `/admin/program?${qs}` : "/admin/program";
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Program &amp; masa berlaku</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats.verified} terverifikasi · {stats.expired} kedaluwarsa
          {stats.expiringSoon > 0
            ? ` · ${stats.expiringSoon} berakhir dalam 7 hari`
            : ""}
          . Program berakhir otomatis setiap 08.00 WIB sehari setelah tanggalnya;
          koreksi manual di sini bila tanggalnya salah.
        </p>
      </div>

      <form action="/admin/program" method="get" className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Cari judul
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="mis. Gemini"
            className="h-10 w-56"
            maxLength={100}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <FilterSelect
            id="status"
            name="status"
            label="Status"
            value={status}
            className={filterSelectClassName}
            options={[
              { value: "verified", label: "Terverifikasi" },
              { value: "expired", label: "Kedaluwarsa" },
              { value: "semua", label: "Semua" },
            ]}
          />
        </div>
        <button type="submit" className={buttonVariants({ size: "default" })}>
          <Search className="size-4" aria-hidden="true" />
          Terapkan
        </button>
        {search || status !== "verified" ? (
          <Link href="/admin/program" className={buttonVariants({ variant: "secondary" })}>
            Reset
          </Link>
        ) : null}
      </form>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((program) => {
            const sisaHari = program.promoEnd
              ? daysFromToday(program.promoEnd, todayIso)
              : null;
            return (
              <li key={program.id}>
                <article className="card-accent flex flex-col gap-2 rounded-xl border border-border bg-background p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/review/${program.id}`}
                        className="block truncate font-medium hover:text-primary hover:underline"
                      >
                        {program.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {program.provider?.trim() ? program.provider : "Tanpa provider"}
                        {" · "}
                        {program.categoryName}
                        {" · oleh "}
                        {program.contributorName}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <StatusBadge status={program.status} />
                      <Link
                        href={`/review/${program.id}`}
                        className={buttonVariants({ variant: "secondary", size: "sm" })}
                      >
                        <CalendarClock className="size-4" aria-hidden="true" />
                        Kelola
                      </Link>
                    </div>
                  </div>

                  <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <dt>Berakhir:</dt>
                      <dd
                        className={
                          sisaHari !== null && sisaHari < 0 && program.status === "verified"
                            ? "font-medium text-danger"
                            : "font-medium text-foreground/80"
                        }
                      >
                        {program.promoEnd ? formatDateID(program.promoEnd) : "Tanpa batas"}
                      </dd>
                    </div>
                    {sisaHari !== null ? (
                      <div className="flex items-center gap-1.5">
                        <dt>Sisa:</dt>
                        <dd>
                          {sisaHari > 0
                            ? `${sisaHari} hari lagi`
                            : sisaHari === 0
                              ? "berakhir hari ini"
                              : `${Math.abs(sisaHari)} hari lewat`}
                        </dd>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-1.5">
                      <dt>Diperbarui:</dt>
                      <dd>{formatDateTimeID(program.updatedAt)}</dd>
                    </div>
                  </dl>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title={search ? "Tidak ada program yang cocok" : "Belum ada program"}
          description={
            search
              ? `Tidak ada judul mengandung "${search}" pada filter ${FILTER_LABEL[status].toLowerCase()}.`
              : "Program yang sudah terverifikasi akan tampil di sini."
          }
          icon={<CalendarClock className="size-6" aria-hidden="true" />}
        />
      )}

      {totalPages > 1 ? (
        <nav aria-label="Navigasi halaman" className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Halaman {page} dari {totalPages} · {total} program
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

      <p className="text-xs text-muted-foreground">
        Halaman ini hanya menampilkan entri yang sudah tayang. Antrean tinjauan ada di{" "}
        <Link href="/review" className="text-primary underline underline-offset-4">
          Antrean review
        </Link>
        .
      </p>
    </div>
  );
}
