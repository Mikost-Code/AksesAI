import type { Metadata } from "next";
import { Suspense } from "react";

import { DirectoryFilters } from "@/components/directory-filters";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { ProgramCard } from "@/components/program-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategories } from "@/lib/programs/categories";
import { getDirectory } from "@/lib/programs/queries";
import { parseDirectorySearch } from "@/lib/validation/search";

export const metadata: Metadata = {
  title: "Direktori bansos",
  description:
    "Cari dan filter informasi bantuan sosial terverifikasi berdasarkan kategori, wilayah, dan status.",
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

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Direktori bantuan sosial</h1>
        <p className="max-w-2xl text-muted-foreground">
          Setiap informasi menyertakan sumber yang dapat diperiksa. Status
          Terverifikasi berarti telah diperiksa reviewer, bukan jaminan
          pemerintah.
        </p>
      </div>

      <div className="mt-6">
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <DirectoryFilters
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          />
        </Suspense>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
        <p aria-live="polite">
          {directory.configured
            ? directory.total > 0
              ? `${directory.total} informasi ditemukan`
              : "Belum ada informasi yang cocok"
            : "Direktori belum terhubung ke sumber data"}
        </p>
      </div>

      {directory.items.length > 0 ? (
        <>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {directory.items.map((program) => (
              <li key={program.id}>
                <ProgramCard program={program} />
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Suspense fallback={null}>
              <Pagination page={directory.page} pageCount={directory.pageCount} />
            </Suspense>
          </div>
        </>
      ) : (
        <div className="mt-4">
          <EmptyState
            title={
              directory.configured
                ? "Belum ada informasi yang cocok"
                : "Direktori belum tersedia"
            }
            description={
              directory.configured
                ? "Coba ubah kata kunci atau filter, atau bagikan informasi yang Anda temukan dengan sumber yang jelas."
                : "Data program belum dikonfigurasi pada lingkungan ini. Halaman tetap dapat diakses dan akan menampilkan informasi setelah administrator menghubungkan database."
            }
            action={{ label: "Bagikan informasi", href: "/login" }}
          />
        </div>
      )}
    </div>
  );
}
