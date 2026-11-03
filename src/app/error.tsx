"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log detail ke browser console server-side tidak tersedia di klien;
    // pesan ke pengguna disengaja tanpa stack trace.
    console.error("[app] Terjadi kesalahan:", error.digest ?? "no-digest");
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-bold sm:text-3xl">Terjadi kesalahan</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Kami tidak dapat memuat halaman ini. Silakan coba lagi. Jika masalah
        berlanjut, kembali ke beranda.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()}>Coba lagi</Button>
        <Link href="/" className="text-sm text-primary underline">
          Beranda
        </Link>
      </div>
    </div>
  );
}
