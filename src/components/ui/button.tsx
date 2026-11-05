import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Varian tombol.
 *
 * - `default`: gradien teal→jade dengan bayangan lembut. Mikro-interaksi
 *   (translateY + brightness) memberi rasa "tertekan" saat hover/klik.
 * - Semua varian memakai `transition-[transform,box-shadow,background-color]`
 *   dengan easing keluar yang cepat agar tidak terasa lag.
 * - Fokus memakai ring, bukan hanya outline, agar terlihat di atas gradien.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-[transform,box-shadow,background-color,color,opacity] duration-150 ease-out",
    "active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    "outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(11,22,35,0.16)] hover:bg-primary-hover hover:shadow-[var(--shadow-glow)] active:bg-primary-active",
        secondary:
          "border border-border bg-background text-foreground shadow-[var(--shadow-card)] hover:border-border-strong hover:bg-surface hover:shadow-[var(--shadow-card-hover)]",
        ghost: "text-foreground hover:bg-muted",
        subtle: "bg-primary-soft text-primary hover:bg-primary-soft-hover",
        cream:
          "bg-sand text-forest shadow-[var(--shadow-card)] hover:bg-sand-bright hover:shadow-[var(--shadow-card-hover)] active:bg-[#ddd0b4]",
        destructive:
          "bg-danger text-white shadow-[0_1px_2px_rgba(11,22,35,0.16)] hover:bg-danger/90 hover:shadow-[0_8px_20px_-8px_rgba(180,35,24,0.6)]",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover",
      },
      size: {
        default: "h-10 rounded-lg px-4 text-sm",
        sm: "h-9 rounded-lg px-3 text-sm",
        lg: "h-11 rounded-xl px-6 text-base",
        icon: "size-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
