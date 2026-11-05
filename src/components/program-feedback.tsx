"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { submitProgramFeedback } from "@/app/(public)/info/[slug]/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Feedback ringan "apakah info ini berguna?" — satu suara per pengunjung
 * (anonim pun bisa; identitas hanya hash di server). Suara dapat diubah:
 * klik tombol lawan akan memperbarui pilihan, klik tombol yang sama tak
 * mengubah apa pun.
 */
export function ProgramFeedback({
  programId,
  initialHelpful,
  initialNotHelpful,
}: {
  programId: string;
  initialHelpful: number;
  initialNotHelpful: number;
}) {
  const router = useRouter();
  const [helpful, setHelpful] = useState(initialHelpful);
  const [notHelpful, setNotHelpful] = useState(initialNotHelpful);
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function vote(choice: "up" | "down") {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await submitProgramFeedback(
        programId,
        choice === "up",
      );
      if (result.ok) {
        setHelpful(result.helpful);
        setNotHelpful(result.notHelpful);
        setVoted(choice);
        // Revalidasi halaman (cache 5 menit) agar angka terkini tersimpan.
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground">
        Apakah info ini berguna untuk Anda?
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <Button
          size="sm"
          variant={voted === "up" ? "default" : "secondary"}
          disabled={pending}
          aria-pressed={voted === "up"}
          onClick={() => vote("up")}
        >
          <ThumbsUp className="size-4" aria-hidden="true" />
          Berguna
          <span className="tabular-nums opacity-80">{helpful}</span>
        </Button>
        <Button
          size="sm"
          variant={voted === "down" ? "default" : "ghost"}
          className={cn(voted === "down" && "bg-danger text-white hover:bg-danger/90")}
          disabled={pending}
          aria-pressed={voted === "down"}
          onClick={() => vote("down")}
        >
          <ThumbsDown className="size-4" aria-hidden="true" />
          <span className="sr-only">Tidak berguna</span>
          <span className="tabular-nums opacity-80" aria-hidden="true">
            {notHelpful}
          </span>
        </Button>
      </div>
      {voted ? (
        <p role="status" className="mt-2 text-xs text-accent">
          Terima kasih — umpan balik Anda tercatat.
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
