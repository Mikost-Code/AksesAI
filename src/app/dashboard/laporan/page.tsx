import type { Metadata } from "next";
import Link from "next/link";
import { Flag } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { getCurrentUser } from "@/lib/auth/session";
import { listOwnReports } from "@/lib/programs/review";
import { REPORT_REASON_LABEL, REPORT_STATUS_LABEL } from "@/lib/constants/labels";
import { formatDateTimeID } from "@/lib/utils";

export const metadata: Metadata = { title: "Laporan saya", robots: { index: false } };

export default async function MyReportsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const reports = await listOwnReports(user.id);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Laporan saya</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Laporan yang Anda kirim tentang informasi yang keliru atau kedaluwarsa. Tim
          moderator meninjaunya secara manual.
        </p>
      </div>

      {reports.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {reports.map((report) => (
            <li key={report.id}>
              <article className="rounded-lg border border-border bg-background p-4">
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
                      Dikirim {formatDateTimeID(report.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium">
                    {REPORT_STATUS_LABEL[report.status]}
                  </span>
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Belum ada laporan"
          description="Anda belum mengirim laporan. Gunakan tombol laporan pada halaman detail informasi bila menemukan data yang keliru."
          icon={<Flag className="size-6" aria-hidden="true" />}
        />
      )}
    </div>
  );
}
