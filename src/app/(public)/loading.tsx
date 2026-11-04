import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kerangka memuat generik untuk halaman konten publik
 * (tentang, panduan, kebijakan privasi, kategori, kontributor).
 */
export default function ContentLoading() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-9 w-80 max-w-full" />
      <div className="mt-6 max-w-3xl space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
