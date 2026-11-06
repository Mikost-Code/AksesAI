"use client";

import { BellCheck, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  markAllNotificationsAsRead,
  markNotificationsAsRead,
} from "@/app/dashboard/notifikasi/actions";
import { Button } from "@/components/ui/button";

/**
 * Kontrol "tandai dibaca" untuk halaman notifikasi.
 *
 * Server mengirim state yang sudah tertandai; komponen ini hanya memicu aksi
 * lalu `router.refresh()` agar angka lonceng di navbar ikut diperbarui.
 */
export function NotificationActions({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function markAll() {
    if (pending || unreadCount === 0) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await markAllNotificationsAsRead();
      if (result.ok) {
        setMessage(result.message);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={pending || unreadCount === 0}
        onClick={markAll}
      >
        <CheckCheck className="size-4" aria-hidden="true" />
        Tandai semua dibaca
      </Button>
      {message ? (
        <p role="status" className="text-xs text-accent">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Tombol per notifikasi untuk menandai satu item sudah dibaca. */
export function MarkOneRead({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markNotificationsAsRead([id]);
          if (result.ok) router.refresh();
        })
      }
    >
      <BellCheck className="size-4" aria-hidden="true" />
      Tandai dibaca
    </Button>
  );
}
