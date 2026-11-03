import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  CircleAlert,
  Clock,
  FileText,
  Inbox,
  Settings,
  Users,
} from "lucide-react";

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
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-background p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="rounded-lg transition-shadow hover:shadow-md">
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
      <div>
        <h1 className="text-2xl font-bold">Ringkasan admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gambaran operasional platform. Aksi sensitif (role, blokir, kategori) tercatat
          pada audit log yang tidak dapat diubah.
        </p>
      </div>

      <section aria-label="Statistik utama" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      <section className="rounded-lg border border-info/20 bg-info-soft p-4 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <Activity className="size-4" aria-hidden="true" />
          Pengingat operasional
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Periksa antrean review setiap hari agar kontribusi tidak menumpuk.</li>
          <li>Tangani laporan komunitas berdasarkan prioritas alasan.</li>
          <li>Jangan pernah menambahkan data pribadi penerima bantuan ke platform.</li>
          <li>Selalu pertahankan minimal satu admin aktif di luar akun Anda.</li>
        </ul>
      </section>
    </div>
  );
}
