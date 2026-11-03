"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, RotateCcw, ShieldX, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Label } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { REVIEW_REASON_MAX, REVIEW_REASON_MIN } from "@/lib/constants/labels";
import {
  claimProgram,
  rejectProgram,
  requestChanges,
  verifyProgram,
  type ReviewActionResult,
} from "@/app/review/actions";

/**
 * Panel aksi reviewer. Semua otorisasi & transisi status terjadi di Server
 * Action/RPC; komponen ini hanya memicu dan menampilkan hasilnya.
 */
export function ReviewActionPanel({
  programId,
  isOwnContribution,
  claimedByMe,
  claimedByName,
}: {
  programId: string;
  isOwnContribution: boolean;
  claimedByMe: boolean;
  claimedByName: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [intent, setIntent] = useState<"claim" | "verify" | "changes" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<"none" | "changes" | "reject">("none");

  if (isOwnContribution) {
    return (
      <div className="rounded-lg border border-info/20 bg-info-soft p-4 text-sm">
        <p className="font-medium">Ini kontribusi Anda sendiri.</p>
        <p className="mt-1 text-muted-foreground">
          Kontribusi sendiri tidak dapat ditinjau. Minta reviewer lain mengambil alih.
        </p>
      </div>
    );
  }

  function run(
    label: "claim" | "verify" | "changes" | "reject",
    action: () => Promise<ReviewActionResult>,
  ) {
    setError(null);
    setNotice(null);
    setIntent(label);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setNotice(result.message);
        setMode("none");
        setReason("");
        router.refresh();
      } else {
        setError(result.message);
      }
      setIntent(null);
    });
  }

  const busy = pending || intent !== null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
      <h2 className="text-base font-semibold">Keputusan tinjauan</h2>

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

      {claimedByName ? (
        <p className="rounded-md border border-warning/25 bg-warning-soft p-3 text-xs">
          Item ini sedang ditinjau oleh <strong>{claimedByName}</strong>. Klaim akan
          kedaluwarsa otomatis; jika sudah lewat, Anda dapat mengambilnya.
        </p>
      ) : null}

      {!claimedByMe ? (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => run("claim", () => claimProgram(programId))}
        >
          <UserCheck className="size-4" aria-hidden="true" />
          {intent === "claim" ? "Mengambil…" : "Ambil item ini (30 menit)"}
        </Button>
      ) : null}

      {mode === "none" ? (
        <div className="flex flex-col gap-2">
          <Button
            disabled={busy}
            onClick={() => run("verify", () => verifyProgram(programId))}
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {intent === "verify" ? "Memverifikasi…" : "Verifikasi & terbitkan"}
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setMode("changes");
              setError(null);
            }}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Minta revisi
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setMode("reject");
              setError(null);
            }}
            className="text-danger"
          >
            <ShieldX className="size-4" aria-hidden="true" />
            Tolak kontribusi
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <Label htmlFor="review-reason">
            {mode === "changes" ? "Apa yang perlu diperbaiki?" : "Alasan penolakan"}
          </Label>
          <Textarea
            id="review-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={REVIEW_REASON_MAX}
            placeholder={
              mode === "changes"
                ? "Jelaskan bagian yang kurang jelas atau sumber yang bermasalah…"
                : "Jelaskan mengapa kontribusi ini tidak dapat diterima…"
            }
          />
          <FieldHint>
            {reason.length}/{REVIEW_REASON_MAX} karakter (minimal {REVIEW_REASON_MIN}).
            Pesan ini dilihat kontributor.
          </FieldHint>
          <FieldError
            message={
              reason.trim().length > 0 && reason.trim().length < REVIEW_REASON_MIN
                ? `Minimal ${REVIEW_REASON_MIN} karakter.`
                : undefined
            }
          />
          <div className="flex gap-2">
            <Button
              disabled={busy || reason.trim().length < REVIEW_REASON_MIN}
              onClick={() =>
                run(mode === "changes" ? "changes" : "reject", () =>
                  mode === "changes"
                    ? requestChanges(programId, reason)
                    : rejectProgram(programId, reason),
                )
              }
            >
              {intent === "changes" || intent === "reject"
                ? "Mengirim…"
                : mode === "changes"
                  ? "Kirim permintaan revisi"
                  : "Tolak kontribusi"}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setMode("none");
                setError(null);
              }}
            >
              Batal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
