"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Eye, PencilLine, Send, Undo2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { ProgramStatus } from "@/lib/constants/labels";
import { submitProgram, withdrawProgram } from "@/app/dashboard/kontribusi/actions";

/**
 * Tombol aksi per baris kontribusi.
 * Panggilan RPC terjadi di Server Action; komponen ini hanya memicu & menampilkan
 * hasil. Tidak ada logika otorisasi di sisi klien.
 */
export function ContributionRowActions({
  programId,
  status,
  publicSlug,
}: {
  programId: string;
  status: ProgramStatus;
  publicSlug: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canEdit = status === "draft" || status === "needs_changes";
  const canSubmit = status === "draft" || status === "needs_changes";
  const canWithdraw = status === "pending";

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.message ?? "Aksi gagal.");
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
      {canEdit ? (
        <Link
          href={`/dashboard/kontribusi/${programId}`}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          <PencilLine className="size-4" aria-hidden={true} />
          Edit
        </Link>
      ) : null}

      {canSubmit ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(() => submitProgram(programId))}
        >
          <Send className="size-4" aria-hidden={true} />
          {pending ? "Mengirim…" : "Kirim untuk ditinjau"}
        </Button>
      ) : null}

      {canWithdraw ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => withdrawProgram(programId))}
        >
          <Undo2 className="size-4" aria-hidden={true} />
          {pending ? "Menarik…" : "Tarik ke draf"}
        </Button>
      ) : null}

      {publicSlug ? (
        <Link
          href={`/info/${publicSlug}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <Eye className="size-4" aria-hidden={true} />
          Lihat halaman publik
        </Link>
      ) : null}

      {status === "rejected" ? (
        <p className="text-xs text-muted-foreground">
          Kontribusi ditolak tidak dapat dikirim ulang. Buat kontribusi baru dengan
          sumber yang lebih baik.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="w-full text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
