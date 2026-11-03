import type { Metadata } from "next";
import Link from "next/link";
import { Flag } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ReportActionPanel } from "@/components/moderation/report-action-panel";
import { getCurrentUser, hasAnyRole } from "@/lib/auth/session";
import { listReports } from "@/lib/programs/review";
import {
  REPORT_REASONS,
  REPORT_REASON_LABEL,
  REPORT_REASON_PRIORITY,
  REPORT_STATUSES,
  REPORT_STATUS_LABEL,
  type ReportReason,
  type ReportStatus,
} from "@/lib/constants/labels";
import { formatDateTimeID } from "@/lib/utils";

export const metadata: Metadata = { title: "Laporan", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function ModerationReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; alasan?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !hasAnyRole(user, ["moderator", "admin"])) return null;

  const params = await searchParams;
  const status = (REPORT_STATUSES as readonly string[]).includes(params.status ?? "")
    ? (params.status as ReportStatus)
    : "semua";
  const reason = (REPORT_REASONS as readonly string[]).includes(params.alasan ?? "")
    ? (params.alasan as ReportReason)
    : "semua";

  const reports = await listReports({
    status: status as ReportStatus | "semua",
    reason: reason as ReportReason | "semua",
    priority: REPORT_REASON_PRIORITY,
  });

  const openCount = reports.filter((r) => r.status === "open" || r.status === "in_review").length;

  function buildHref(nextStatus: string, nextReason: string): string {
    const sp = new URLSearchParams();
    if (nextStatus !== "semua") sp.set("status", nextStatus);
    if (nextReason !== "semua") sp.set("alasan", nextReason);
    const qs = sp.toString();
    return qs ? `/moderation/reports?${qs}` : "/moderation/reports";
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Laporan komunitas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {openCount} laporan terbuka · diurutkan berdasarkan prioritas alasan, lalu yang
          paling lama. Identitas pelapor tetap anonim bagi publik.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <nav aria-label="Filter status" className="flex flex-wrap gap-2">
          {(["semua", ...REPORT_STATUSES] as const).map((value) => {
            const active = status === value;
            return (
              <Link
                key={value}
                href={buildHref(value, reason)}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  active
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {value === "semua" ? "Semua status" : REPORT_STATUS_LABEL[value as ReportStatus]}
              </Link>
            );
          })}
        </nav>

        <nav aria-label="Filter alasan" className="flex flex-wrap gap-2">
          {(["semua", ...REPORT_REASONS] as const).map((value) => {
            const active = reason === value;
            return (
              <Link
                key={value}
                href={buildHref(status, value)}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  active
                    ? "border-info bg-info-soft text-info"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {value === "semua" ? "Semua alasan" : REPORT_REASON_LABEL[value as ReportReason]}
              </Link>
            );
          })}
        </nav>
      </div>

      {reports.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {reports.map((report) => (
            <li key={report.id}>
              <article className="rounded-lg border border-border bg-background p-4 shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {REPORT_REASON_LABEL[report.reason]}
                    </p>
                    <Link
                      href={report.programSlug ? `/bansos/${report.programSlug}` : "#"}
                      className="mt-0.5 block font-medium hover:underline"
                    >
                      {report.programTitle}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Status program: {report.programStatus} · dilaporkan{" "}
                      {formatDateTimeID(report.createdAt)}
                      {report.reporterName ? ` oleh ${report.reporterName}` : " (anonim)"}
                    </p>
                  </div>
                  <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium">
                    {REPORT_STATUS_LABEL[report.status]}
                  </span>
                </div>

                <p className="mt-2 whitespace-pre-line rounded-md bg-surface p-3 text-sm">
                  {report.description}
                </p>

                <ReportActionPanel reportId={report.id} status={report.status} />
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Tidak ada laporan"
          description="Belum ada laporan komunitas pada filter ini."
          icon={<Flag className="size-6" aria-hidden="true" />}
        />
      )}
    </div>
  );
}
