import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "flex gap-3 rounded-lg border p-4 text-sm [&_svg]:mt-0.5 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        info: "border-info/20 bg-info-soft text-foreground [&_svg]:text-info",
        warning:
          "border-warning/25 bg-warning-soft text-foreground [&_svg]:text-warning",
        danger: "border-danger/25 bg-danger-soft text-foreground [&_svg]:text-danger",
        success:
          "border-accent/25 bg-accent-soft text-foreground [&_svg]:text-accent",
        neutral: "border-border bg-surface text-foreground [&_svg]:text-muted-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type AlertProps = React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants>;

export function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div role="status" className={cn(alertVariants({ variant }), className)} {...props} />
  );
}

export function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("font-semibold", className)} {...props} />;
}

export function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-sm leading-relaxed text-foreground/85", className)}
      {...props}
    />
  );
}
