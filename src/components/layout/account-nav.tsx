import { LogIn, LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser, hasAnyRole } from "@/lib/auth/session";

/**
 * Status akun di navbar (Server Component).
 * Menampilkan tombol Masuk untuk tamu, atau tautan Dasbor + Keluar untuk
 * pengguna yang login. Role dibaca dari database (bukan dari klaim klien).
 */
export async function AccountNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className={buttonVariants({ variant: "default", size: "sm" })}
      >
        <LogIn className="size-4" aria-hidden="true" />
        Masuk
      </Link>
    );
  }

  const isStaff = hasAnyRole(user, ["reviewer", "moderator", "admin"]);

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "secondary", size: "sm" })}
      >
        <LayoutDashboard className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Dasbor</span>
      </Link>
      {isStaff ? (
        <Link
          href={
            hasAnyRole(user, ["admin"])
              ? "/admin"
              : hasAnyRole(user, ["moderator"])
                ? "/moderation/reports"
                : "/review"
          }
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Area staf
        </Link>
      ) : null}
      <SignOutButton />
      <span className="sr-only">Masuk sebagai {user.githubUsername}</span>
    </div>
  );
}
