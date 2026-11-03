import {
  Archive,
  CheckCircle2,
  Clock,
  FilePen,
  FileText,
  Hourglass,
  PencilLine,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  PROGRAM_STATUS_LABEL,
  type ProgramStatus,
} from "@/lib/constants/labels";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  ProgramStatus,
  {
    variant: "success" | "warning" | "danger" | "neutral" | "outline";
    icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  }
> = {
  verified: { variant: "success", icon: CheckCircle2 },
  pending: { variant: "warning", icon: Hourglass },
  needs_changes: { variant: "warning", icon: PencilLine },
  rejected: { variant: "danger", icon: XCircle },
  expired: { variant: "neutral", icon: Clock },
  draft: { variant: "outline", icon: FilePen },
  archived: { variant: "outline", icon: Archive },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProgramStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon ?? FileText;
  return (
    <Badge variant={config.variant} className={cn("whitespace-nowrap", className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {PROGRAM_STATUS_LABEL[status]}
    </Badge>
  );
}
