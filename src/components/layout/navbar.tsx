import { Menu } from "lucide-react";
import Link from "next/link";

import { LogoLockup } from "@/components/brand/logo";
import { GitHubIcon } from "@/components/icons/github-icon";
import { GithubRepoButton } from "@/components/layout/github-repo-button";
import { NavLinks } from "@/components/layout/nav-links";
import { buttonVariants } from "@/components/ui/button";

export const NAV_LINKS = [
  { href: "/info", label: "Direktori" },
  { href: "/panduan", label: "Panduan" },
  { href: "/tentang", label: "Tentang" },
] as const;

/**
 * Navbar publik.
 *
 * Sengaja TIDAK membaca sesi di server agar halaman publik tetap dapat
 * dirender statis/ISR (PRD §7 Performa). Tombol akun di sisi kanan adalah
 * Server Component terpisah (`<AccountNav />`) — atau, jika disusun dalam
 * layout dinamis, dapat memakai pola suspense di masa depan.
 *
 * Efek "kaca" saat menggulir ditangani `NavLinks`/CSS: header memakai
 * `surface-glass` sehingga konten di belakangnya tetap terbaca tanpa
 * memicu re-render React (murni CSS `position: sticky`).
 */
export function Navbar({ accountSlot }: { accountSlot?: React.ReactNode }) {
  return (
    <header className="surface-glass sticky top-0 z-40 border-b border-border/80 transition-shadow duration-300">
      <div className="mx-auto grid h-16 max-w-[1200px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="AksesAI — beranda"
          className="group -ml-1 rounded-lg px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 transition-transform duration-200 hover:scale-[1.01]"
        >
          <LogoLockup className="transition-opacity group-hover:opacity-90" />
        </Link>

        <NavLinks links={NAV_LINKS} className="hidden md:flex" />

        <div className="flex items-center gap-2 justify-self-end">
          <GithubRepoButton className="hidden sm:inline-flex" />
          {accountSlot ?? (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              Masuk
            </Link>
          )}
          <details className="group/menu md:hidden">
            <summary
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md transition-colors hover:bg-surface [&::-webkit-details-marker]:hidden"
              aria-label="Buka menu navigasi"
            >
              <Menu className="size-5" aria-hidden="true" />
            </summary>
            <div className="absolute inset-x-0 top-16 origin-top border-b border-border bg-background p-4 shadow-[var(--shadow-elevated)] animate-[var(--animate-menu-in)]">
              <nav aria-label="Navigasi seluler" className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="select-none rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-surface hover:text-foreground focus-visible:inset-ring-2 focus-visible:inset-ring-primary/40"
                  >
                    {link.label}
                  </Link>
                ))}
                <a
                  href="https://github.com/zann06/AksesAI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-2 border-t border-border px-3 pt-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:hidden"
                >
                  <GitHubIcon className="size-4" aria-hidden="true" />
                  Lihat source di GitHub
                </a>
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
