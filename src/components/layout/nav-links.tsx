"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Tautan navigasi utama dengan indikator halaman aktif.
 *
 * Indikator aktif memakai `aria-current="page"` (bukan warna saja) dan
 * underline halus yang beranimasi — memberi umpan balik posisi tanpa
 * memindahkan layout.
 */
export function NavLinks({
  links,
  className,
}: {
  links: ReadonlyArray<{ href: string; label: string }>;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn("items-center justify-self-center gap-1", className)}
    >
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
              "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200",
              active
                ? "text-foreground after:scale-x-100"
                : "text-muted-foreground hover:bg-surface hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
