"use client";

import { Bell, BellRing } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleProgramWatch } from "@/app/(public)/info/[slug]/watch-actions";
import { Button } from "@/components/ui/button";

/**
 * Tombol "ingatkan saya saat promo berakhir".
 *
 * Hanya dirender untuk entri yang memiliki `promoEnd` — mengingatkan sesuatu
 * yang tidak punya tanggal berakhir hanya akan menghasilkan notifikasi kosong.
 * Untuk tamu, tombol mengarah ke halaman login alih-alih memanggil action yang
 * pasti gagal: satu klik lebih baik daripada satu pesan galat.
 */
export function WatchlistButton({
  programId,
  initialWatching,
  isLoggedIn,
}: {
  programId: string;
  initialWatching: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [watching, setWatching] = useState(initialWatching);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={() =>
          router.push(
            `/login?next=${encodeURIComponent(`/info/${window.location.pathname.split("/").pop() ?? ""}`)}`,
          )
        }
      >
        <Bell className="size-4" aria-hidden="true" />
        Ingatkan saya sebelum berakhir
      </Button>
    );
  }

  function toggle() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await toggleProgramWatch(programId);
      if (result.ok) {
        setWatching(result.watching);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div>
      <Button
        variant={watching ? "default" : "secondary"}
        size="sm"
        className="w-full"
        disabled={pending}
        aria-pressed={watching}
        onClick={toggle}
      >
        {watching ? (
          <BellRing className="size-4" aria-hidden="true" />
        ) : (
          <Bell className="size-4" aria-hidden="true" />
        )}
        {watching ? "Pengingat aktif" : "Ingatkan saya sebelum berakhir"}
      </Button>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {watching
          ? "Kami kirim notifikasi di dasbor sebelum masa promo habis."
          : "Dapatkan notifikasi di dasbor beberapa hari sebelum promo berakhir."}
      </p>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
