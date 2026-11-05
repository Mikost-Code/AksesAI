"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "tema";

/**
 * Toggle mode gelap/terang.
 *
 * Keadaan awal ditentukan skrip anti-FOUC di root layout (sebelum cat air):
 * localStorage bila pernah memilih, atau preferensi sistem. Ikon memakai
 * varian `dark:` sehingga yang tampil selalu benar tanpa state mount —
 * state hanya dipakai untuk label aksesibilitas setelah toggle pertama.
 */
export function ThemeToggle() {
  const [lastChoice, setLastChoice] = useState<boolean | null>(null);

  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "gelap" : "terang");
    } catch {
      // localStorage bisa ditolak (private mode) — mode tetap berganti untuk
      // sesi ini, pilihan hanya tidak tersimpan.
    }
    setLastChoice(next);
  }

  const label =
    lastChoice === null
      ? "Ganti mode terang/gelap"
      : lastChoice
        ? "Nyalakan mode terang"
        : "Nyalakan mode gelap";

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={toggle}
      aria-label={label}
      className="text-muted-foreground hover:text-foreground"
    >
      <Sun className="size-5 dark:hidden" aria-hidden="true" />
      <Moon className="hidden size-5 dark:inline-flex" aria-hidden="true" />
    </Button>
  );
}
