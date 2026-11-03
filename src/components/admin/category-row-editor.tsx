"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { CategoryForm, type CategoryFormValues } from "@/components/admin/category-form";

/** Tombol "Ubah" yang membuka form edit di tempat untuk satu kategori. */
export function CategoryRowEditor({ category }: { category: CategoryFormValues }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <CategoryForm initial={category} onDone={() => setEditing(false)} />;
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface"
    >
      <Pencil className="size-3.5" aria-hidden="true" />
      Ubah
    </button>
  );
}
