"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { Search } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROVINCES } from "@/lib/constants/labels";

export type CategoryOption = { slug: string; name: string };

/**
 * Filter direktori. State disimpan di query string agar dapat dibagikan
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
    router.push(`/bansos${merged.toString() ? `?${merged.toString()}` : ""}`);
  }

  const kategori = params.get("kategori") ?? "";
  const provinsi = params.get("provinsi") ?? "";
  const kota = params.get("kota") ?? "";
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
      aria-label="Filter direktori bansos"
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
          placeholder="Cari judul, deskripsi, atau penyelenggara…"
          aria-label="Kata kunci"
          maxLength={100}
          className="pl-9"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-kategori" className="text-xs font-medium text-muted-foreground">
            Kategori
          </label>
          <select
            id="filter-kategori"
            value={kategori}
            onChange={(event) => update({ kategori: event.target.value || null })}
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-provinsi" className="text-xs font-medium text-muted-foreground">
            Provinsi
          </label>
          <select
            id="filter-provinsi"
            value={provinsi}
            onChange={(event) => update({ provinsi: event.target.value || null })}
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Semua provinsi</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-status" className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <select
            id="filter-status"
            value={status}
            onChange={(event) => update({ status: event.target.value })}
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="verified">Terverifikasi</option>
            <option value="expired">Kedaluwarsa</option>
            <option value="semua">Semua</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-urut" className="text-xs font-medium text-muted-foreground">
            Urutkan
          </label>
          <select
            id="filter-urut"
            value={urut}
            onChange={(event) => update({ urut: event.target.value })}
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="terbaru">Terbaru</option>
            <option value="relevansi">Relevansi</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-kota" className="text-xs font-medium text-muted-foreground">
            Kabupaten/Kota (opsional)
          </label>
          <Input
            id="filter-kota"
            value={kota}
            onChange={(event) => update({ kota: event.target.value || null })}
            placeholder="Mis. Kota Bandung"
            maxLength={80}
          />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className={buttonVariants({ size: "sm" })}>
            Terapkan
          </button>
          <Link
            href="/bansos"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Reset
          </Link>
        </div>
      </div>
    </form>
  );
}
