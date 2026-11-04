import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kerangka memuat (skeleton) halaman direktori.
 *
 * Next.js menampilkan ini seketika saat navigasi ke `/info` sehingga pengguna
 * melihat struktur halaman alih-alih layar kosong selama data diambil.
 */
export default function DirectoryLoading() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-2/3 max-w-xl" />
      </div>

      <Skeleton className="mt-6 h-44 w-full rounded-xl" />

      <div className="mt-6 flex items-center justify-between border-b border-border pb-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-52" />
      </div>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-border bg-background p-5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="mt-2 h-24 w-full rounded-lg" />
          </li>
        ))}
      </ul>
    </div>
  );
}
