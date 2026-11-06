"use client";

import { cn } from "@/lib/utils";

type RadioCardProps = {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  className?: string;
};

/**
 * Kartu pilihan tunggal (pengganti `<input type="radio">` bawaan browser).
 *
 * Memakai `role="radio"` + `aria-checked`, mengikuti pola yang sama dengan
 * `Checkbox`: keyboard-friendly dan tampilannya sepenuhnya milik proyek.
 */
export function RadioCard({
  name,
  value,
  checked,
  onSelect,
  title,
  description,
  className,
}: RadioCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-name={name}
      data-value={value}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors",
        "focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40",
        checked
          ? "border-primary bg-primary-soft"
          : "border-border bg-background hover:border-primary/40",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
          checked ? "border-primary" : "border-input",
        )}
      >
        {checked ? <span className="size-2 rounded-full bg-primary" /> : null}
      </span>
      <span className="min-w-0">
        <span className="font-medium">{title}</span>
        {description ? (
          <span className="mt-0.5 block text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
