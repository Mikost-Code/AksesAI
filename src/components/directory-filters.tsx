"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { Search } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { ACCESS_FILTER_OPTIONS, FREE_TIER_FILTER_OPTIONS } from "@/lib/constants/labels";

export type CategoryOption = { slug: string; name: string };

const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: "verified", label: "Terverifikasi" },
  { value: "expired", label: "Kedaluwarsa" },
  { value: "semua", label: "Semua status" },
];

const SORT_OPTIONS: readonly SelectOption[] = [
  { value: "terbaru", label: "Terbaru" },
  { value: "relevansi", label: "Relevansi" },
];

/**
 * Filter direktori AksesAI. State disimpan di query string agar dapat dibagikan
 * (PRD FR-DIR-5) — semua perubahan memicu navigasi.
 */
export function DirectoryFilters({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function update(next: Record<string, string | null>) {
    const merged = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) merged.delete(key);
      else merged.set(key, value);
    }
    merged.delete("halaman");
    router.push(`/info${merged.toString() ? `?${merged.toString()}` : ""}`);
  }

  const kategori = params.get("kategori") ?? "";
  const akses = params.get("akses") ?? "semua";
  const gratis = params.get("gratis") ?? "semua";
  const status = params.get("status") ?? "verified";
  const urut = params.get("urut") ?? "terbaru";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        update({ q: q.trim() || null });
      }}
      className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4 shadow-[var(--shadow-card)]"
      role="search"
      aria-label="Filter direktori info AI"
    >
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          name="q"
          type="search"
          placeholder="Cari provider, model, atau kuota gratis…"
          aria-label="Kata kunci"
          maxLength={100}
          className="pl-9"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-kategori" className="text-xs font-medium text-muted-foreground">
            Kategori
          </label>
          <Select
            id="filter-kategori"
            label="Kategori"
            value={kategori}
            options={[{ value: "", label: "Semua kategori" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]}
            onValueChange={(v) => update({ kategori: v || null })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-akses" className="text-xs font-medium text-muted-foreground">
            Jenis akses
          </label>
          <Select
            id="filter-akses"
            label="Jenis akses"
            value={akses}
            options={ACCESS_FILTER_OPTIONS}
            onValueChange={(v) => update({ akses: v === "semua" ? null : v })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-gratis" className="text-xs font-medium text-muted-foreground">
            Ketersediaan
          </label>
          <Select
            id="filter-gratis"
            label="Ketersediaan"
            value={gratis}
            options={FREE_TIER_FILTER_OPTIONS}
            onValueChange={(v) => update({ gratis: v === "semua" ? null : v })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-status" className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <Select
            id="filter-status"
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            onValueChange={(v) => update({ status: v })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-urut" className="text-xs font-medium text-muted-foreground">
            Urutkan
          </label>
          <Select
            id="filter-urut"
            label="Urutkan"
            value={urut}
            options={SORT_OPTIONS}
            onValueChange={(v) => update({ urut: v })}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="submit" className={buttonVariants({ size: "sm" })}>
          Terapkan
        </button>
        <Link href="/info" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Reset
        </Link>
      </div>
    </form>
  );
}
