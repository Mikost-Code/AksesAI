"use client";

import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

type DateFieldProps = {
  id?: string;
  /** Nilai ISO `YYYY-MM-DD`, atau string kosong. */
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  className?: string;
};

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function parseISO(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatID(value: string): string {
  const date = parseISO(value);
  if (!date) return "";
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * Input tanggal dengan tampilan milik proyek.
 *
 * `<input type="date">` tidak dipakai karena picker-nya dirender oleh browser
 * (tampil berbeda di tiap OS dan tidak bisa ditata). Di sini input tetap
 * berupa teks, tetapi dibungkus label tombol yang membuka picker bawaan lewat
 * `showPicker()` — satu-satunya jalan memakai pemilih tanggal native — sambil
 * menampilkan teks tanggal dalam format Indonesia.
 *
 * Pengguna tetap dapat mengetik tanggal secara manual (`YYYY-MM-DD`), sehingga
 * kontrol ini tidak pernah menjadi jalan buntu bila `showPicker()` tidak
 * didukung.
 */
export function DateField({
  id,
  value,
  onChange,
  label,
  invalid,
  describedBy,
  disabled,
  className,
}: DateFieldProps) {
  const display = formatID(value);

  return (
    <div
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm transition-colors",
        "focus-within:border-primary focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-primary/40",
        invalid && "border-danger",
        disabled && "opacity-50",
        className,
      )}
    >
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="YYYY-MM-DD"
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent uppercase outline-none placeholder:normal-case placeholder:text-muted-foreground/80"
      />
      {display ? (
        <span className="shrink-0 text-xs text-muted-foreground" aria-hidden="true">
          {display}
        </span>
      ) : null}
      <label
        className="relative shrink-0 cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground"
        title={`Pilih tanggal ${label}`}
      >
        <CalendarDays className="size-4" aria-hidden="true" />
        <span className="sr-only">Pilih tanggal {label}</span>
        {/*
          Picker dibuka lewat `showPicker()`; input-nya sendiri dibuat transparan
          dan menutupi ikon agar klik tetap mengenai kontrol native.
        */}
        <input
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onClick={(event) => {
            const input = event.currentTarget;
            if (input.showPicker) {
              try {
                input.showPicker();
              } catch {
                // Browser menolak (mis. belum ada interaksi pengguna): jatuh ke
                // perilaku bawaan klik.
              }
            }
          }}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
