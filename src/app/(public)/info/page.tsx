import type { Metadata } from "next";
import { Suspense } from "react";

import { DirectoryFilters } from "@/components/directory-filters";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { ProgramCard } from "@/components/program-card";
import { Skeleton } from "@/components/ui/skeleton";
import { clientEnv } from "@/lib/env";
import { serializeJsonLd } from "@/lib/security/json-ld";
import { PAGE_SIZE, PLATFORM_DISCLAIMER_SHORT } from "@/lib/constants/labels";
import { getCategories } from "@/lib/programs/categories";
import { getDirectory } from "@/lib/programs/queries";
import { parseDirectorySearch } from "@/lib/validation/search";

export const metadata: Metadata = {
  title: "Direktori info AI gratis & murah",
  description:
    "Cari dan filter info AI gratis/murah: API & token gratis, free tier, harga per token, model open-weight, tool gratis, dan hosting gratis.",
};

export const revalidate = 300;

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = parseDirectorySearch(params);

  const [directory, categories] = await Promise.all([
    getDirectory(search),
    getCategories(),
  ]);

  // Structured data ItemList untuk rich result hasil pencarian Google.
  const site = clientEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: directory.items.map((item, index) => ({
      "@type": "ListItem",
      position: (directory.page - 1) * PAGE_SIZE + index + 1,
      name: item.title,
      url: `${site}/info/${item.slug}`,
    })),
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }}
      />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Direktori info AI gratis &amp; murah
        </h1>
        <p className="max-w-2xl leading-relaxed text-muted-foreground">
          Kumpulan info API/token gratis, free tier, harga per token, model
          open-weight, tool gratis, dan hosting gratis — dikontribusikan komunitas
          dan diperiksa reviewer berdasarkan sumber resmi provider.
        </p>
      </div>

      <div className="mt-6">
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
          <DirectoryFilters
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          />
        </Suspense>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
        <p aria-live="polite" className="text-sm font-medium text-foreground">
          {directory.configured
            ? directory.total > 0
              ? `${directory.total} info ditemukan`
              : "Tidak ada hasil"
            : "Direktori belum terhubung ke sumber data"}
        </p>
        <p className="text-xs text-muted-foreground">{PLATFORM_DISCLAIMER_SHORT}</p>
      </div>

      {directory.items.length > 0 ? (
        <>
          <ul className="animate-stagger mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {directory.items.map((program) => (
              <li key={program.id}>
                <ProgramCard program={program} />
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Suspense fallback={null}>
              <Pagination page={directory.page} pageCount={directory.pageCount} />
            </Suspense>
          </div>
        </>
      ) : (
        <div className="mt-6">
          <EmptyState
            title={
              directory.configured
                ? "Belum ada info yang cocok"
                : "Direktori belum tersedia"
            }
            description={
              directory.configured
                ? "Coba ubah kata kunci atau filter, atau bagikan info gratis/murah yang Anda temukan beserta tautan resminya."
                : "Data belum dikonfigurasi pada lingkungan ini. Halaman tetap dapat diakses dan akan menampilkan info setelah administrator menghubungkan database."
            }
            action={{ label: "Bagikan info AI", href: "/login" }}
          />
        </div>
      )}
    </div>
  );
}
