"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { reverifyProgram } from "@/app/review/actions";
import { Button } from "@/components/ui/button";
import { VERIFICATION_STALE_DAYS, daysSince } from "@/lib/utils";

/**
 * Panel cek ulang berkala untuk entri berstatus verified.
 * Bila verifikasi terakhir melewati batas 90 hari, reviewer dapat menandai
 * entri "sudah dicek ulang" — verified_at diperbarui lewat RPC dan badge
 * basi di halaman publik hilang. Riwayat cek ulang tercatat di timeline.
 */
export function ReverifyPanel({
  programId,
  verifiedAt,
  status,
}: {
  programId: string;
  verifiedAt: string | null;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "verified") return null;

  const days = verifiedAt ? daysSince(verifiedAt) : null;
  const stale = days === null || days >= VERIFICATION_STALE_DAYS;

  function reverify() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await reverifyProgram(programId);
      if (result.ok) {
        setNotice(result.message);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <RefreshCw className="size-4 text-primary" aria-hidden="true" />
        Cek ulang berkala
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {days === null
          ? "Belum ada catatan verifikasi."
          : `Terakhir diverifikasi ${days} hari lalu.`}
        {stale
          ? ` Melewati batas ${VERIFICATION_STALE_DAYS} hari — periksa sumber & kuota terbaru, lalu tandai sudah dicek ulang.`
          : " Masih dalam batas berkala."}
      </p>
      {stale ? (
        <Button size="sm" onClick={reverify} disabled={pending} className="mt-2.5">
          <RefreshCw className="size-4" aria-hidden="true" />
          {pending ? "Menyimpan…" : "Tandai sudah dicek ulang"}
        </Button>
      ) : null}
      {notice ? (
        <p role="status" className="mt-2 text-xs text-accent">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
