import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { AccountNav } from "@/components/layout/account-nav";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { getCurrentUser, hasAnyRole } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/constants/labels";

/**
 * Layout area moderasi (moderator/admin). Pemeriksaan role server-side
 * sebelum render; RLS/RPC menegakkan ulang di database.
 */
export default async function ModerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fmoderation%2Freports");

  const canReview = hasAnyRole(user, ["reviewer", "admin"]);
  const canModerate = hasAnyRole(user, ["moderator", "admin"]);
  const isAdmin = hasAnyRole(user, ["admin"]);

  if (!canModerate) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-lg font-bold text-foreground"
          >
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
            >
              BW
            </span>
            {APP_NAME}
          </Link>
          <AccountNav />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
        <DashboardNav canReview={canReview} canModerate={canModerate} isAdmin={isAdmin} />
        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-[1200px] items-center gap-2 px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Area moderasi. Semua tindakan tercatat pada audit log yang tidak dapat diubah.
        </div>
      </footer>
    </div>
  );
}
