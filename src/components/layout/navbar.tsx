import { Menu } from "lucide-react";
import Link from "next/link";

import { GithubRepoButton } from "@/components/layout/github-repo-button";
import { buttonVariants } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants/labels";

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
 */
export function Navbar({ accountSlot }: { accountSlot?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto grid h-16 max-w-[1200px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg font-bold text-foreground"
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
          >
            AI
          </span>
          {APP_NAME}
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="hidden items-center justify-self-center gap-1 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 justify-self-end">
          <GithubRepoButton />
          {accountSlot ?? (
            <Link
              href="/login"
              className={buttonVariants({ variant: "default", size: "sm" })}
            >
              Masuk
            </Link>
          )}
          <details className="md:hidden">
            <summary
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md hover:bg-surface"
              aria-label="Buka menu navigasi"
            >
              <Menu className="size-5" aria-hidden="true" />
            </summary>
            <div className="absolute inset-x-0 top-16 border-b border-border bg-background p-4 shadow-sm">
              <nav aria-label="Navigasi seluler" className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
