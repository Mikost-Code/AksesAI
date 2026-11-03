"use client";

import { Flag } from "lucide-react";
import { useState } from "react";

import { ReportDialog } from "@/components/report/report-dialog";
import { buttonVariants } from "@/components/ui/button";

export function ReportButton({
  programId,
  programTitle,
}: {
  programId: string;
  programTitle: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${buttonVariants({ variant: "secondary" })} w-full`}
      >
        <Flag className="size-4" aria-hidden="true" />
        Laporkan informasi
      </button>
      <ReportDialog
        open={open}
        onClose={() => setOpen(false)}
        programId={programId}
        programTitle={programTitle}
      />
    </>
  );
}
