"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldHint, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { markExpired, setPromoEnd } from "@/app/review/actions";

/**
 * Kendali masa berlaku program yang SUDAH terbit (verified) atau sudah
 * kedaluwarsa. Dipisahkan dari `ReviewActionPanel` karena panel itu hanya
 * untuk keputusan tinjauan (pending → verified/rejected), sedangkan di sini
 * staf mengoreksi tanggal atau menutup masa berlaku lebih awal.
 *
 * Semua keputusan otorisasi tetap di RPC; komponen ini hanya memicu.
 */
export function ProgramExpiryPanel({
  programId,
  status,
  promoEnd,
}: {
  programId: string;
  status: "verified" | "expired";
  promoEnd: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tanggal, setTanggal] = useState(promoEnd ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [konfirmasi, setKonfirmasi] = useState(false);

  const busy = pending;
  const berubah = tanggal !== (promoEnd ?? "");

  function simpan() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const hasil = await setPromoEnd(programId, tanggal);
      if (hasil.ok) {
        setNotice(hasil.message);
        router.refresh();
      } else {
        setError(hasil.message);
      }
    });
  }

  function tandaiKedaluwarsa() {
    setError(null);
    setNotice(null);
    setKonfirmasi(false);
    startTransition(async () => {
      const hasil = await markExpired(programId);
      if (hasil.ok) {
        setNotice(hasil.message);
        router.refresh();
      } else {
        setError(hasil.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
      <div className="flex items-start gap-2">
        <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <h2 className="text-base font-semibold">Masa berlaku</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Program berakhir otomatis pada 08.00 WIB sehari setelah tanggal ini.
            Kosongkan bila tidak ada batas waktu.
          </p>
        </div>
      </div>

      {notice ? (
        <p role="status" className="rounded-md border border-accent/25 bg-accent-soft p-3 text-sm">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft p-3 text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="promo-end">Berakhir pada</Label>
        <Input
          id="promo-end"
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          disabled={busy}
        />
        <FieldHint>Tanggal ini dipakai cron harian untuk menandai kedaluwarsa.</FieldHint>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={simpan} disabled={busy || !berubah}>
          {pending ? "Menyimpan…" : "Simpan tanggal"}
        </Button>
        {promoEnd ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setTanggal("");
              setError(null);
              setNotice(null);
              startTransition(async () => {
                const hasil = await setPromoEnd(programId, "");
                if (hasil.ok) {
                  setNotice(hasil.message);
                  router.refresh();
                } else {
                  setError(hasil.message);
                }
              });
            }}
          >
            Hapus batas waktu
          </Button>
        ) : null}
      </div>

      {status === "verified" ? (
        <div className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Program ini masih tampil publik. Tandai kedaluwarsa bila penawaran sudah
            tidak berlaku, agar tidak menyesatkan pengunjung.
          </p>
          {konfirmasi ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Tandai sebagai kedaluwarsa?</span>
              <Button
                size="sm"
                variant="secondary"
                className="text-danger"
                onClick={tandaiKedaluwarsa}
                disabled={busy}
              >
                <Clock className="size-4" aria-hidden="true" />
                {pending ? "Memproses…" : "Ya, tandai"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setKonfirmasi(false)} disabled={busy}>
                Batal
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              className="self-start text-danger"
              onClick={() => setKonfirmasi(true)}
              disabled={busy}
            >
              <Clock className="size-4" aria-hidden="true" />
              Tandai kedaluwarsa
            </Button>
          )}
        </div>
      ) : (
        <p className="rounded-md border border-border bg-surface p-3 text-xs text-muted-foreground">
          Program ini sudah kedaluwarsa dan tidak tampil pada direktori default.
          Perbaiki tanggal di atas lalu buka kembali lewat alur laporan bila penawaran
          ternyata masih berlaku.
        </p>
      )}
    </div>
  );
}
