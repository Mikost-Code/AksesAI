import { SearchX } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center ${className ?? ""}`}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-background text-muted-foreground">
        {icon ?? <SearchX className="size-6" aria-hidden="true" />}
      </span>
      <h3 className="font-heading text-base font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? (
        <Link
          href={action.href}
          className={`${buttonVariants({ size: "sm" })} mt-2`}
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
