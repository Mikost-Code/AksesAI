import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  CircleAlert,
  Clock,
  Download,
  FileText,
  Inbox,
  Settings,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getAdminStats } from "@/lib/admin/data";
import { PROGRAM_STATUS_LABEL, APP_ROLE_LABEL } from "@/lib/constants/labels";
import { formatDateTimeID } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  hint,
  icon,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const body = (
    <div className="card-accent flex h-full flex-col gap-1 rounded-xl border border-border bg-background p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary [&_svg]:size-4">
          {icon}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 font-heading text-2xl font-bold text-foreground">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
  return href ? (
    <Link
      href={href}
      className="rounded-xl outline-none transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/45"
    >
      {body}
    </Link>
  ) : (
    body
  );
}

export default async function AdminHomePage() {
  const stats = await getAdminStats();

  const statusOrder = [
    "pending",
    "needs_changes",
    "verified",
    "expired",
    "rejected",
    "draft",
    "archived",
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ringkasan admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gambaran operasional platform. Aksi sensitif (role, blokir, kategori) tercatat
            pada audit log yang tidak dapat diubah.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/export?tipe=program"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <Download className="size-4" aria-hidden="true" />
            Export program
          </a>
          <a
            href="/api/admin/export?tipe=pengguna"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <Download className="size-4" aria-hidden="true" />
            Export pengguna
          </a>
        </div>
      </div>

      <section
        aria-label="Statistik utama"
        className="animate-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Menunggu review"
          value={stats.pendingReview}
          hint="Antrean tinjauan aktif"
          icon={<Inbox className="size-4" aria-hidden="true" />}
          href="/review"
        />
        <StatCard
          label="Laporan terbuka"
          value={stats.openReports}
          hint="Perlu tindakan moderasi"
          icon={<CircleAlert className="size-4" aria-hidden="true" />}
          href="/moderation/reports"
        />
        <StatCard
          label="Total program"
          value={stats.totalPrograms}
          hint="Semua status"
          icon={<FileText className="size-4" aria-hidden="true" />}
        />
        <StatCard
          label="Pengguna"
          value={stats.totalUsers}
          hint={stats.bannedUsers > 0 ? `${stats.bannedUsers} diblokir` : "Tidak ada blokir"}
          icon={<Users className="size-4" aria-hidden="true" />}
          href="/admin/pengguna"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-background p-5">
          <h2 className="text-base font-semibold">Program per status</h2>
          <dl className="mt-3 flex flex-col gap-2">
            {statusOrder.map((status) => {
              const value = stats.byStatus[status] ?? 0;
              const pct =
                stats.totalPrograms > 0
                  ? Math.round((value / stats.totalPrograms) * 100)
                  : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <dt className="w-32 shrink-0 text-sm text-muted-foreground">
                    {PROGRAM_STATUS_LABEL[status]}
                  </dt>
                  <dd className="flex flex-1 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface"
                    >
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-12 text-right text-sm font-medium tabular-nums">
                      {value}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-background p-5">
          <h2 className="text-base font-semibold">Peran & kategori</h2>
          <dl className="mt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">Pengguna (member)</dt>
              <dd className="font-medium tabular-nums">{stats.roleCounts.member}</dd>
            </div>
            <div className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">{APP_ROLE_LABEL.reviewer}</dt>
              <dd className="font-medium tabular-nums">{stats.roleCounts.reviewer}</dd>
            </div>
            <div className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">{APP_ROLE_LABEL.moderator}</dt>
              <dd className="font-medium tabular-nums">{stats.roleCounts.moderator}</dd>
            </div>
            <div className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">{APP_ROLE_LABEL.admin}</dt>
              <dd className="font-medium tabular-nums">{stats.roleCounts.admin}</dd>
            </div>
            <div className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">{APP_ROLE_LABEL.super_admin}</dt>
              <dd className="font-medium tabular-nums">{stats.roleCounts.super_admin}</dd>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
              <dt className="text-muted-foreground">Total kategori</dt>
              <dd className="flex items-center gap-2 font-medium tabular-nums">
                {stats.totalCategories}
                <Link
                  href="/admin/kategori"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Settings className="size-3.5" aria-hidden="true" />
                  Kelola
                </Link>
              </dd>
            </div>
          </dl>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" />
            Cron terakhir:{" "}
            {stats.lastCronRun ? formatDateTimeID(stats.lastCronRun) : "belum pernah berjalan"}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-background p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Entri baru per minggu</h2>
            <span className="text-xs text-muted-foreground">8 minggu terakhir</span>
          </div>
          <div className="mt-4 flex items-end gap-2" aria-hidden="true">
            {(() => {
              const max = Math.max(1, ...stats.weeklyContributions);
              return stats.weeklyContributions.map((count, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                    {count}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-primary/85 transition-colors hover:bg-primary"
                    style={{
                      height: `${Math.max(4, (count / max) * 72)}px`,
                      opacity: count > 0 ? 1 : 0.25,
                    }}
                  />
                </div>
              ));
            })()}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Total {stats.weeklyContributions.reduce((a, b) => a + b, 0)} entri baru dalam 8
            minggu terakhir (semua status).
          </p>
        </section>
      </div>

      <section className="rounded-lg border border-info/20 bg-info-soft p-4 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <Activity className="size-4" aria-hidden="true" />
          Pengingat operasional
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Periksa antrean review setiap hari agar kontribusi tidak menumpuk.</li>
          <li>Tangani laporan komunitas berdasarkan prioritas alasan.</li>
          <li>Jangan pernah menaruh API key, token, atau kredensial di dalam konten.</li>
          <li>
            Mengatur role hanya oleh pemilik (Super Admin); pertahankan minimal satu
            admin aktif selain pemilik untuk kesiapan operasional.
          </li>
        </ul>
      </section>
    </div>
  );
}
