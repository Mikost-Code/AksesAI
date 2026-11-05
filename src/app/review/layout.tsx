import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { LogoLockup } from "@/components/brand/logo";
import { AccountNav } from "@/components/layout/account-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { getCurrentUser, hasAnyRole } from "@/lib/auth/session";
import { getStaffBadgeCounts } from "@/lib/admin/data";

/**
 * Layout area staf (reviewer/moderator/admin).
 *
 * Pemeriksaan role dilakukan server-side SEBELUM merender apa pun.
 * `proxy.ts` hanya melakukan redirect awal; akses sesungguhnya ditentukan
 * di sini, lalu ditegakkan lagi oleh RLS/RPC di database.
 */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Freview");

  const canReview = hasAnyRole(user, ["reviewer", "admin"]);
  const canModerate = hasAnyRole(user, ["moderator", "admin"]);
  const isAdmin = hasAnyRole(user, ["admin"]);

  // Badge antrean di sidebar: dihitung di server agar tanpa request klien.
  const badgeCounts =
    canReview || canModerate
      ? await getStaffBadgeCounts(canModerate)
      : { pendingReview: 0, openReports: 0 };

  // Anggota biasa tidak boleh masuk area staf sama sekali.
  if (!canReview && !canModerate) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="surface-glass sticky top-0 z-30 border-b border-border/80">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="AksesAI — beranda"
            className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 transition-opacity hover:opacity-90"
          >
            <LogoLockup />
          </Link>
          <ThemeToggle />
          <AccountNav />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
        <DashboardNav canReview={canReview} canModerate={canModerate} isAdmin={isAdmin} pendingReview={badgeCounts.pendingReview} openReports={badgeCounts.openReports} />
        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-[1200px] items-center gap-2 px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <ShieldAlert className="size-3.5" aria-hidden="true" />
          Area staf. Tindakan tercatat pada audit log yang tidak dapat diubah.
        </div>
      </footer>
    </div>
  );
}
