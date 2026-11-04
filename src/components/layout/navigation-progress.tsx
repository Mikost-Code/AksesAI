"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Indikator progres navigasi (bar tipis di bagian paling atas).
 *
 * Next.js App Router tidak menyediakan event "mulai navigasi" resmi. Karena itu
 * kita mendeteksi klik pada tautan internal lewat listener global (fase
 * capture), lalu menampilkan bar sampai URL berubah.
 *
 * Komponen ini ringan: tanpa dependensi, dan hanya me-render bar ketika
 * navigasi benar-benar sedang berjalan. Animasi dimatikan otomatis bila
 * pengguna memilih `prefers-reduced-motion` (lihat globals.css).
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [state, setState] = useState<{ active: boolean; value: number }>({
    active: false,
    value: 0,
  });

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const navigating = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Mulai animasi saat tautan internal diklik.
  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const current = `${window.location.pathname}${window.location.search}`;
      if (href === current) return;

      clearTimers();
      navigating.current = true;
      setState({ active: true, value: 15 });

      // Naikkan progres bertahap; berhenti di 90% sampai navigasi selesai.
      [
        { at: 120, value: 40 },
        { at: 350, value: 65 },
        { at: 800, value: 82 },
        { at: 1600, value: 90 },
      ].forEach(({ at, value }) => {
        timers.current.push(
          setTimeout(() => {
            setState((s) => (s.active ? { active: true, value: Math.max(s.value, value) } : s));
          }, at),
        );
      });
    }

    document.addEventListener("click", onDocumentClick, true);
    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      clearTimers();
    };
  }, [clearTimers]);

  // URL berubah → navigasi selesai, selesaikan bar lalu sembunyikan.
  useEffect(() => {
    if (!navigating.current) return;
    navigating.current = false;
    clearTimers();

    setState({ active: true, value: 100 });

    timers.current.push(
      setTimeout(() => {
        setState({ active: false, value: 0 });
      }, 320),
    );
  }, [pathname, searchParams, clearTimers]);

  if (!state.active) return null;

  return (
    <div
      aria-hidden="true"
      data-navigation-progress="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
    >
      <div
        className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_8px_rgba(15,118,110,0.55)] transition-[width] duration-300 ease-out"
        style={{ width: `${state.value}%` }}
      />
    </div>
  );
}
