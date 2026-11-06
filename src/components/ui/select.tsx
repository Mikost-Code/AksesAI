"use client";

import { Check, ChevronDown } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";

import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

type SelectProps = {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onValueChange: (value: string) => void;
  id?: string;
  className?: string;
  /**
   * Render daftar opsi langsung di tempat (tanpa Portal ke `<body>`).
   *
   * WAJIB `false` bila dropdown berada di dalam `<dialog>` modal: dialog modal
   * hidup di *top layer*, sedangkan apa pun yang dipindahkan ke `<body>`
   * (termasuk portal Radix) selalu digambar DI BAWAH dialog — daftar opsi
   * tampak tidak muncul dan tidak bisa diklik. Di dalam dialog, `position:
   * absolute` sudah cukup karena dialog sendiri tidak memotongnya.
   */
  portal?: boolean;
};

/**
 * Dropdown berbasis Radix Select (pengganti `<select>` bawaan browser).
 *
 * Radix menangani hal-hal yang sulit dibuat manual dengan benar:
 * - positioning otomatis (flip atas/bawah, collision dengan viewport)
 * - dirender lewat Portal sehingga tidak terpotong `overflow` container
 * - manajemen fokus, navigasi keyboard, dan `aria-*` lengkap
 * - typeahead (ketik huruf untuk melompat ke opsi)
 *
 * Tampilan memakai token desain proyek (globals.css) agar konsisten.
 */
export function Select({
  label,
  value,
  options,
  onValueChange,
  id,
  className,
  portal = true,
}: SelectProps) {
  const content = (
    <SelectPrimitive.Content
      position="popper"
      sideOffset={6}
      className={cn(
        "relative z-[60] max-h-64 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-background shadow-[var(--shadow-popover)]",
        // Tanpa animasi masuk. `--animate-popover-fade-in` tidak dipakai: di
        // dalam `<dialog>` (lihat prop `portal`), animasi `opacity` membuat
        // Chrome menganggap elemen belum terlihat dan `elementFromPoint`
        // mengembalikan elemen lain — daftar opsi jadi tidak bisa diklik.
      )}
    >
      <SelectPrimitive.Viewport className="p-1">
        {options.map((option) => (
          <SelectPrimitive.Item
            key={option.value}
            value={option.value}
            className={cn(
              "relative flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-sm text-muted-foreground outline-none transition-colors",
              "data-[highlighted]:bg-surface data-[highlighted]:text-foreground",
              "data-[state=checked]:font-medium data-[state=checked]:text-foreground",
            )}
          >
            <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
            <SelectPrimitive.ItemIndicator>
              <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
            </SelectPrimitive.ItemIndicator>
          </SelectPrimitive.Item>
        ))}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  );

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={label}
        className={cn(
          "group flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm outline-none transition-colors",
          "hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
          "data-[state=open]:border-primary disabled:cursor-not-allowed disabled:opacity-50",
          "[&>span]:truncate",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={label} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      {portal ? (
        <SelectPrimitive.Portal>{content}</SelectPrimitive.Portal>
      ) : (
        content
      )}
    </SelectPrimitive.Root>
  );
}
