import * as React from "react";

import { cn } from "@/lib/utils";

export function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label
      className={cn("text-sm font-medium leading-none text-foreground", className)}
      {...props}
    >
      {children}
      {required ? (
        <span className="ml-1 text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

export function FieldHint({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)} {...props} />
  );
}

export function FieldError({
  id,
  message,
}: {
  id?: string;
  message?: string | null;
}) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs font-medium text-danger">
      {message}
    </p>
  );
}
