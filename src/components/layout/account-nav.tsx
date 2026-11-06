import { Bell, LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { GitHubIcon } from "@/components/icons/github-icon";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser, hasAnyRole } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { cn } from "@/lib/utils";

/**
 * Status akun di navbar (Server Component).
 * Menampilkan tombol Masuk untuk tamu, atau lonceng notifikasi + tautan Dasbor
 * + Keluar untuk pengguna yang login. Role dibaca dari database (bukan dari
 * klaim klien).
 *
 * Lonceng sengaja hanya tautan + angka, tanpa dropdown: membuka dropdown
 * berarti memuat daftar notifikasi di setiap halaman publik. Satu permintaan
 * `head: true` yang murah (indeks parsial) memberi angka, sedangkan detail
 * dibuka di `/dashboard/notifikasi`.
 */
export async function AccountNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/login"
        // Ikon GitHub, bukan ikon panah masuk: satu-satunya cara masuk memang
        // OAuth GitHub, jadi ikonnya sekaligus memberi tahu apa yang akan
        // terjadi saat tombol ditekan. Referensi: tombol "Masuk" pada desain
        // acuan memakai ikon di sisi kiri teks.
        className={buttonVariants({ variant: "default", size: "sm" })}
      >
        <GitHubIcon className="size-4" aria-hidden="true" />
        Masuk
      </Link>
    );
  }

  const isStaff = hasAnyRole(user, ["reviewer", "moderator", "admin"]);
  const unread = await getUnreadNotificationCount(user.id);

  return (
    <div className="flex items-center gap-2">
      {/* Toggle tema TIDAK di sini: sudah ada di navbar publik & header area
          internal — muncul di dua tempat bila AccountNav dipakai accountSlot. */}
      <Link
        href="/dashboard/notifikasi"
        aria-label={
          unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"
        }
        title="Notifikasi"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "relative",
        )}
      >
        <Bell className="size-4" aria-hidden="true" />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white tabular-nums"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Link>
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
