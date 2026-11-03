"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORY_DESCRIPTION_MAX,
  CATEGORY_NAME_MAX,
  CATEGORY_NAME_MIN,
} from "@/lib/constants/labels";
import { saveCategory, type AdminResult } from "@/app/admin/actions";

export type CategoryFormValues = {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Ubah nama menjadi slug dasar (huruf kecil, tanda hubung). */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, CATEGORY_NAME_MAX);
}

const EMPTY: CategoryFormValues = {
  id: null,
  name: "",
  slug: "",
  description: "",
  isActive: true,
  sortOrder: 0,
};

/**
 * Form buat/ubah kategori. Validasi bentuk ada di sini (UX) dan diulang di
 * Server Action; RPC menangani otorisasi, audit, dan konflik slug.
 */
export function CategoryForm({
  initial,
  onDone,
}: {
  initial?: CategoryFormValues;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<CategoryFormValues>(initial ?? EMPTY);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.id));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const nameError =
    values.name.trim().length > 0 &&
    (values.name.trim().length < CATEGORY_NAME_MIN ||
      values.name.trim().length > CATEGORY_NAME_MAX)
      ? `Nama ${CATEGORY_NAME_MIN}–${CATEGORY_NAME_MAX} karakter.`
      : undefined;
  const slugError =
    values.slug.length > 0 && !SLUG_PATTERN.test(values.slug)
      ? "Hanya huruf kecil, angka, dan tanda hubung."
      : undefined;
  const canSubmit =
    values.name.trim().length >= CATEGORY_NAME_MIN &&
    SLUG_PATTERN.test(values.slug) &&
    values.description.length <= CATEGORY_DESCRIPTION_MAX &&
    !pending;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result: AdminResult = await saveCategory(values);
      if (result.ok) {
        if (!values.id) {
          setValues(EMPTY);
          setSlugTouched(false);
        }
        router.refresh();
        onDone?.();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
      {error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft p-2 text-xs">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`name-${values.id ?? "new"}`}>Nama</Label>
          <Input
            id={`name-${values.id ?? "new"}`}
            value={values.name}
            maxLength={CATEGORY_NAME_MAX}
            onChange={(e) => {
              set("name", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
          />
          <FieldError message={nameError} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`slug-${values.id ?? "new"}`}>Slug</Label>
          <Input
            id={`slug-${values.id ?? "new"}`}
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
            }}
          />
          <FieldError message={slugError} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`desc-${values.id ?? "new"}`}>Deskripsi (opsional)</Label>
        <Textarea
          id={`desc-${values.id ?? "new"}`}
          value={values.description}
          rows={2}
          maxLength={CATEGORY_DESCRIPTION_MAX}
          onChange={(e) => set("description", e.target.value)}
        />
        <FieldHint>
          {values.description.length}/{CATEGORY_DESCRIPTION_MAX} karakter.
        </FieldHint>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`sort-${values.id ?? "new"}`}>Urutan</Label>
          <Input
            id={`sort-${values.id ?? "new"}`}
            type="number"
            className="w-24"
            value={values.sortOrder}
            onChange={(e) => set("sortOrder", Number.parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="size-4 rounded border-input"
          />
          Aktif (tampil di publik)
        </label>
      </div>

      <div className="flex gap-2">
        <Button size="sm" disabled={!canSubmit} onClick={submit}>
          {values.id ? (
            <Save className="size-4" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          {pending ? "Menyimpan…" : values.id ? "Simpan perubahan" : "Buat kategori"}
        </Button>
        {onDone ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={onDone}>
            <X className="size-4" aria-hidden="true" />
            Batal
          </Button>
        ) : null}
      </div>
    </div>
  );
}
