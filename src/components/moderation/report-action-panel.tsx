"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Label } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  markReportInReview,
  resolveReport,
  type ModerationAction,
} from "@/app/moderation/actions";

const ACTIONS: Array<{ value: ModerationAction; label: string; needsNote: boolean }> = [
  { value: "dismiss", label: "Abaikan (laporan tidak berdasar)", needsNote: false },
  { value: "resolve", label: "Tandai selesai (data benar)", needsNote: false },
  { value: "reopen_for_review", label: "Tarik program untuk ditinjau ulang", needsNote: true },
  { value: "archive_program", label: "Arsipkan program", needsNote: true },
  { value: "ban_contributor", label: "Blokir kontributor", needsNote: true },
];

/** Panel aksi moderasi satu laporan. Otorisasi & perubahan di Server Action/RPC. */
export function ReportActionPanel({
  reportId,
  status,
}: {
  reportId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<ModerationAction>("dismiss");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const closed = status === "resolved" || status === "dismissed";
  const selected = ACTIONS.find((a) => a.value === action);
  const needsNote = selected?.needsNote ?? false;
  const noteTooShort = needsNote && note.trim().length < 10;

  if (closed) {
    return (
      <p className="text-xs text-muted-foreground">
        Laporan ini sudah diselesaikan dan tidak dapat diubah.
      </p>
    );
  }

  function submit() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await resolveReport(reportId, action, note);
      if (result.ok) {
        setNotice(result.message);
        setNote("");
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  function startReview() {
    setError(null);
    startTransition(async () => {
      const result = await markReportInReview(reportId);
      if (result.ok) {
        setNotice(result.message);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      {notice ? (
        <p role="status" className="rounded-md border border-accent/25 bg-accent-soft p-2 text-xs">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft p-2 text-xs">
          {error}
        </p>
      ) : null}

      {status === "open" ? (
        <Button variant="secondary" size="sm" disabled={pending} onClick={startReview}>
          Tandai sedang ditangani
        </Button>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`action-${reportId}`}>Aksi moderasi</Label>
        <select
          id={`action-${reportId}`}
          value={action}
          onChange={(e) => setAction(e.target.value as ModerationAction)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`note-${reportId}`}>
          Catatan {needsNote ? "(wajib, min. 10 karakter)" : "(opsional)"}
        </Label>
        <Textarea
          id={`note-${reportId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Alasan tindakan, tercatat pada audit log."
        />
        <FieldHint>Catatan tersimpan permanen pada audit log.</FieldHint>
        <FieldError
          message={noteTooShort && note.length > 0 ? "Minimal 10 karakter." : undefined}
        />
      </div>

      <Button size="sm" disabled={pending || noteTooShort} onClick={submit}>
        {pending ? "Memproses…" : "Terapkan aksi"}
      </Button>
    </div>
  );
}
