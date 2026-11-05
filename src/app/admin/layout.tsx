import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { LogoLockup } from "@/components/brand/logo";
import { AccountNav } from "@/components/layout/account-nav";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { getCurrentUser, hasAnyRole } from "@/lib/auth/session";

/**
 * Layout area admin. Memeriksa role `admin` server-side SEBELUM render.
 * RLS + RPC `grant_role`/`revoke_role`/`upsert_category` dll. menegakkan
 * ulang di database sehingga UI bukan satu-satunya penjaga.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fadmin");

  const canReview = hasAnyRole(user, ["reviewer", "admin"]);
  const canModerate = hasAnyRole(user, ["moderator", "admin"]);
  const isAdmin = hasAnyRole(user, ["admin"]);

  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="surface-glass sticky top-0 z-30 border-b border-border/80">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="AksesAI — beranda"
            className="inline-flex rounded-lg outline-none transition-opacity hover:opacity-90"
          >
            <LogoLockup />
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
          Area administrator. Perubahan role, blokir, dan kategori tercatat pada audit
          log yang tidak dapat diubah.
        </div>
      </footer>
    </div>
  );
}
