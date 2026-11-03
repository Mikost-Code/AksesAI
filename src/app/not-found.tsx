import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Halaman yang Anda cari mungkin sudah dipindahkan, diarsipkan, atau tidak
        pernah ada. Coba kembali ke direktori untuk menemukan informasi lain.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/bansos" className={buttonVariants()}>
          Buka direktori
        </Link>
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
