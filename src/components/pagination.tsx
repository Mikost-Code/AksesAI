"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/** Pagination berbasis query string (`?halaman=N`). */
export function Pagination({
  page,
  pageCount,
}: {
  page: number;
  pageCount: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  if (pageCount <= 1) return null;

  function hrefFor(target: number) {
    const merged = new URLSearchParams(params.toString());
    if (target <= 1) merged.delete("halaman");
    else merged.set("halaman", String(target));
    return `${pathname}${merged.toString() ? `?${merged.toString()}` : ""}`;
  }

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );

  return (
    <nav aria-label="Navigasi halaman" className="flex flex-wrap items-center justify-center gap-1">
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-surface"
        >
          Sebelumnya
        </Link>
      ) : null}

      {pages.map((p, index) => {
        const prev = pages[index - 1];
        const gap = prev !== undefined && p - prev > 1;
        return (
          <span key={p} className="flex items-center gap-1">
            {gap ? <span className="px-1 text-muted-foreground">…</span> : null}
            <Link
              href={hrefFor(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "min-w-10 rounded-md border px-3 py-2 text-center text-sm",
                p === page
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-surface",
              )}
            >
              {p}
            </Link>
          </span>
        );
      })}

      {page < pageCount ? (
        <Link
          href={hrefFor(page + 1)}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-surface"
        >
          Berikutnya
        </Link>
      ) : null}
    </nav>
  );
}
