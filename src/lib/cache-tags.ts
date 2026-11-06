import "server-only";

import { revalidateTag } from "next/cache";

/**
 * Tag cache untuk data direktori (dipakai `unstable_cache`).
 *
 * Mengapa modul terpisah: `revalidatePath` TIDAK menghapus entri
 * `unstable_cache` — path dan tag adalah dua ruang cache berbeda (lihat docs
 * Next 16 "revalidatePath → Relationship with revalidateTag"). Sebelum modul
 * ini, aksi reviewer/admin hanya memanggil `revalidatePath`, sehingga halaman
 * yang belum dikunjungi ulang terus menyajikan daftar program lama hingga TTL
 * 300 detik habis. Akibat praktis: kontributor memverifikasi entri, membuka
 * direktori, dan entri itu BELUM tampil.
 *
 * Semua penulisan yang memengaruhi direktori WAJIB memanggil
 * `revalidateDirectory()` supaya path dan tag selalu diperbarui bersamaan.
 *
 * Catatan Next 16: `revalidateTag` menandai data sebagai *stale*. Argumen kedua
 * `{ expire: 0 }` dipakai agar tidak ada konten basi yang disajikan setelah
 * aksi staf — untuk moderasi/verifikasi, kebenaran data lebih penting daripada
 * kecepatan respons.
 */

/** Tag untuk seluruh daftar/agregat program publik. */
export const TAG_PROGRAMS_PUBLIC = "programs:public";

/** Tag untuk satu entri detail: `programTag(slug)`. */
export function programTag(slug: string): string {
  return `program:${slug}`;
}

/** Tag untuk daftar kategori (dipakai navigasi & filter). */
export const TAG_CATEGORIES = "categories";

/** Tag untuk halaman/profil kontributor publik. */
export const TAG_PROFILES = "profiles";

/** Revalidasi segera (tanpa menyajikan konten basi). */
const IMMEDIATE = { expire: 0 } as const;

/**
 * Menyegarkan seluruh cache data direktori.
 *
 * `slug` diisi bila aksi menyentuh satu entri tertentu sehingga cache detail
 * `program:${slug}` ikut dibuang. Statistik profil publik selalu disegarkan
 * karena verifikasi/penolakan mengubah jumlah kontribusi terverifikasi.
 */
export function revalidateDirectory(slug?: string | null): void {
  revalidateTag(TAG_PROGRAMS_PUBLIC, IMMEDIATE);
  revalidateTag(TAG_PROFILES, IMMEDIATE);
  if (slug) revalidateTag(programTag(slug), IMMEDIATE);
}

/** Menyegarkan cache kategori (dipakai aksi admin kategori). */
export function revalidateCategoryCache(): void {
  revalidateTag(TAG_CATEGORIES, IMMEDIATE);
  revalidateTag(TAG_PROGRAMS_PUBLIC, IMMEDIATE);
}
