import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Cog,
  FileText,
  Flag,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import {
  AUDIT_CATEGORIES,
  listAuditLogs,
} from "@/lib/admin/data";
import { formatDateTimeID } from "@/lib/utils";
import { paginationSchema } from "@/lib/validation/staff";

export const metadata: Metadata = { title: "Audit log", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Label ramah untuk aksi audit yang paling umum. */
const ACTION_LABEL: Record<string, string> = {
  "role.grant": "Role diberikan",
  "role.revoke": "Role dicabut",
  "user.ban": "Pengguna diblokir",
  "user.unban": "Blokir dibuka",
  "program.verify": "Program diverifikasi",
  "program.reject": "Program ditolak",
  "program.archive": "Program diarsipkan",
  "program.reopen": "Program dibuka kembali",
  "program.expire": "Program ditandai kedaluwarsa",
  "report.dismiss": "Laporan diabaikan",
  "report.resolve": "Laporan diselesaikan",
  "report.in_review": "Laporan mulai ditangani",
  "category.create": "Kategori dibuat",
  "category.update": "Kategori diperbarui",
  "setting.update": "Pengaturan diubah",
  "cron.expire_due": "Cron kedaluwarsa berjalan",
  "cron.cleanup": "Cron pembersihan berjalan",
};

const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  role: ShieldCheck,
  user: Users,
  program: FileText,
  report: Flag,
  category: Settings,
  setting: Cog,
  cron: Activity,
};

/** Ringkasan metadata jsonb jadi teks singkat yang mudah dipindai. */
function describeMetadata(metadata: Record<string, unknown>): string | null {
  const parts = Object.entries(metadata)
    .filter(([key]) => key !== "program_id")
    .map(([key, value]) => `${key}: ${String(value)}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ halaman?: string; kategori?: string }>;
}) {
  const params = await searchParams;
  const page = paginationSchema.parse({ page: params.halaman }).page;
  const category =
    params.kategori && AUDIT_CATEGORIES.includes(params.kategori as (typeof AUDIT_CATEGORIES)[number])
      ? params.kategori
      : undefined;

  const { items, total, pageSize } = await listAuditLogs({ page, category });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function href(targetPage: number, targetCategory?: string): string {
    const sp = new URLSearchParams();
    if (targetCategory) sp.set("kategori", targetCategory);
    if (targetPage > 1) sp.set("halaman", String(targetPage));
    const qs = sp.toString();
    return qs ? `/admin/audit?${qs}` : "/admin/audit";
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} catatan permanen. Semua perubahan role, blokir, kategori, dan
          moderasi tercatat di sini — tidak dapat diubah maupun dihapus.
        </p>
      </div>

      {/* Filter kategori */}
      <nav aria-label="Filter kategori audit" className="flex flex-wrap items-center gap-2">
        <Link
          href={href(1)}
          aria-current={category ? undefined : "true"}
          className={
            category
              ? "rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
              : "rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
          }
        >
          Semua
        </Link>
        {AUDIT_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={href(1, cat)}
            aria-current={category === cat ? "true" : undefined}
            className={
              category === cat
                ? "rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
                : "rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
            }
          >
            {cat}
          </Link>
        ))}
      </nav>

      {items.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {items.map((entry) => {
            const prefix = entry.action.split(".")[0] ?? "";
            const Icon = CATEGORY_ICON[prefix] ?? ScrollText;
            const label = ACTION_LABEL[entry.action] ?? entry.action;
            const metaText = describeMetadata(entry.metadata);
            return (
              <li key={entry.id}>
                <article className="flex flex-col gap-1.5 rounded-xl border border-border bg-background p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-start sm:gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="font-medium">{label}</p>
                      <code className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        {entry.action}
                      </code>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {entry.actorUsername ? (
                        <>
                          oleh{" "}
                          <Link
                            href={`/kontributor/${entry.actorUsername}`}
                            className="font-medium text-foreground/80 hover:text-primary hover:underline"
                          >
                            {entry.actorUsername}
                          </Link>
                          {" · "}
                        </>
                      ) : (
                        "sistem · "
                      )}
                      {entry.targetType}
                      {entry.targetId ? ` · ${entry.targetId.slice(0, 8)}…` : ""}
                      {" · "}
                      {formatDateTimeID(entry.createdAt)}
                    </p>
                    {entry.reason ? (
                      <p className="mt-1 text-sm text-foreground/85">{entry.reason}</p>
                    ) : null}
                    {metaText ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{metaText}</p>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState
          title="Belum ada catatan"
          description={
            category
              ? `Belum ada aksi kategori "${category}" yang tercatat.`
              : "Audit log akan terisi seiring aktivitas staf dan cron."
          }
          icon={<ScrollText className="size-6" aria-hidden="true" />}
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
                href={href(page - 1, category)}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Sebelumnya
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={href(page + 1, category)}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
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
