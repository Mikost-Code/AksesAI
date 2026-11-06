import Link from "next/link";

import { AccountMenu } from "@/components/layout/account-menu";
import { GitHubIcon } from "@/components/icons/github-icon";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser, hasAnyRole } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications";

/**
 * Status akun di navbar (Server Component).
 *
 * Tamu  : tombol "Masuk" berikon GitHub.
 * Login : satu menu akun (avatar + dropdown) berisi ringkasan, kontribusi,
 *         notifikasi, area staf sesuai role, profil GitHub, dan keluar.
 *
 * Sebelumnya pengguna login melihat lonceng + Dasbor + Area staf + Keluar
 * berjajar di navbar. Empat kontrol itu memakan ~260px sehingga logo dan menu
 * utama berdesakan pada layar 1024–1280px, sementara "Area staf" terpotong di
 * ponsel. Satu menu akun menyelesaikan keduanya tanpa mengurangi fitur.
 *
 * Role dibaca dari database (bukan klaim klien).
 */
export async function AccountNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/login"
        // Ikon GitHub, bukan ikon panah masuk: satu-satunya cara masuk memang
        // OAuth GitHub, jadi ikonnya sekaligus memberi tahu apa yang akan
        // terjadi saat tombol ditekan.
        className={buttonVariants({ variant: "default", size: "sm" })}
      >
        <GitHubIcon className="size-4" aria-hidden="true" />
        Masuk
      </Link>
    );
  }

  const unread = await getUnreadNotificationCount(user.id);

  return (
    <AccountMenu
      user={{
        githubUsername: user.githubUsername,
        avatarUrl: user.avatarUrl,
        isAdmin: hasAnyRole(user, ["admin"]),
        isModerator: hasAnyRole(user, ["moderator"]),
        isReviewer: hasAnyRole(user, ["reviewer"]),
        unread,
      }}
    />
  );
}
