"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Label } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  REPORT_DESCRIPTION_MAX,
  REPORT_DESCRIPTION_MIN,
  REPORT_REASONS,
  REPORT_REASON_LABEL,
  SENSITIVE_DATA_WARNING,
} from "@/lib/constants/labels";

type TurnstileWidget = {
  sitekey: string;
  theme?: "light" | "dark" | "auto";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: TurnstileWidget) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function TurnstileField({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function renderWidget() {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "light",
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else if (!document.getElementById("turnstile-script")) {
      const script = document.createElement("script");
      script.id = "turnstile-script";
      script.src = TURNSTILE_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else {
      const timer = window.setInterval(() => {
        if (window.turnstile) {
          window.clearInterval(timer);
          renderWidget();
        }
      }, 200);
      return () => window.clearInterval(timer);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onToken]);

  return <div ref={containerRef} className="min-h-[65px]" />;
}

export function ReportDialog({
  open,
  onClose,
  programId,
  programTitle,
}: {
  open: boolean;
  onClose: () => void;
  programId: string;
  programTitle: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<string>("tidak_akurat");
  const [description, setDescription] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = description.trim();
    if (trimmed.length < REPORT_DESCRIPTION_MIN) {
      setError(`Jelaskan masalahnya minimal ${REPORT_DESCRIPTION_MIN} karakter.`);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/reports", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            programId,
            reason,
            description: trimmed,
            turnstileToken: token ?? undefined,
          }),
        });

        if (response.status === 429) {
          setError("Terlalu banyak laporan. Coba lagi nanti.");
          return;
        }
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          setError(body?.error ?? "Laporan gagal dikirim. Silakan coba lagi.");
          return;
        }
        setSuccess(true);
      } catch {
        setError("Koneksi gagal. Periksa jaringan Anda dan coba lagi.");
      }
    });
  }

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="report-dialog-title"
      /*
       * `m-auto` WAJIB: `showModal()` memusatkan dialog lewat `margin: auto`
       * pada UA stylesheet, tetapi reset Tailwind (`* { margin: 0 }`)
       * membuangnya sehingga dialog jatuh ke posisi statis (menempel kiri).
       * `max-h` + `overflow-y-auto` menjaga dialog tetap dapat digulir pada
       * layar pendek (ponsel landscape, zoom 200%).
       */
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(560px,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-border bg-background p-0 shadow-xl backdrop:bg-black/40"
      onClose={onClose}
    >
      <div className="p-5">
        <h2 id="report-dialog-title" className="text-lg font-semibold">
          Laporkan informasi
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          &ldquo;{programTitle}&rdquo;
        </p>

        {success ? (
          <div className="mt-5 rounded-lg border border-accent/25 bg-accent-soft p-4 text-sm">
            <p className="font-medium">Terima kasih, laporan Anda terkirim.</p>
            <p className="mt-1 text-muted-foreground">
              Moderator akan memeriksa laporan ini. Kami tidak mengirim
              notifikasi via email demi privasi.
            </p>
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={onClose}>
                Tutup
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
            <p className="rounded-md border border-warning/25 bg-warning-soft p-3 text-xs">
              {SENSITIVE_DATA_WARNING}
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-reason" required>
                Alasan laporan
              </Label>
              <Select
                id="report-reason"
                label="Alasan laporan"
                value={reason}
                onValueChange={setReason}
                options={REPORT_REASONS.map((value) => ({
                  value,
                  label: REPORT_REASON_LABEL[value],
                }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-description" required>
                Penjelasan
              </Label>
              <Textarea
                id="report-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                minLength={REPORT_DESCRIPTION_MIN}
                maxLength={REPORT_DESCRIPTION_MAX}
                required
                aria-describedby="report-description-hint report-error"
                aria-invalid={Boolean(error)}
                placeholder="Jelaskan singkat masalahnya, misalnya tautan sumber tidak dapat dibuka."
              />
              <FieldHint id="report-description-hint">
                {description.length}/{REPORT_DESCRIPTION_MAX} karakter (minimal{" "}
                {REPORT_DESCRIPTION_MIN})
              </FieldHint>
            </div>

            {turnstileSiteKey ? (
              <TurnstileField siteKey={turnstileSiteKey} onToken={setToken} />
            ) : null}

            <FieldError id="report-error" message={error} />

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Mengirim…" : "Kirim laporan"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
