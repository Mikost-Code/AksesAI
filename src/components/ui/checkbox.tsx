"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxProps = {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  /** Keterangan tambahan di bawah label. */
  description?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Checkbox bergaya proyek (pengganti `<input type="checkbox">` bawaan browser).
 *
 * Implementasi memakai `<button role="checkbox">` dengan `aria-checked`, bukan
 * input tersembunyi: ia tetap dapat dijangkau keyboard, menampilkan fokus
 * dengan benar, dan tidak menyeret kotak centang bawaan OS ke tampilan.
 */
export function Checkbox({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
}: CheckboxProps) {
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors",
        "focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-primary bg-primary-soft"
          : "border-border bg-background hover:border-primary/40",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
        )}
      >
        {checked ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0">
        <span className="font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
