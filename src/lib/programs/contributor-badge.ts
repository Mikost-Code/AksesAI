/**
 * Jenjang kontributor (gamifikasi ringan).
 *
 * Modul ini sengaja BEBAS dari `server-only` dan dari akses database: ia murni
 * fungsi atas satu angka sehingga dapat diuji unit dan dipakai ulang (mis.
 * badge di profil publik & ringkasan dasbor).
 *
 * Aturan: jenjang dihitung dari jumlah kontribusi TERVERIFIKASI, bukan total
 * kiriman. Kontribusi yang masih menunggu tinjauan tidak boleh "menaikkan
 * pangkat" — itu akan memberi insentif pada kuantitas, bukan kualitas.
 */

export type ContributorBadgeKey = "baru" | "kontributor" | "terpercaya" | "pakar";

export type ContributorBadge = {
  key: ContributorBadgeKey;
  label: string;
  /** Ambang yang sudah dicapai jenjang ini. */
  threshold: number;
  /** Ambang jenjang berikutnya; `null` bila sudah jenjang tertinggi. */
  nextThreshold: number | null;
};

/** Level dari tertinggi ke terendah — `findIndex` bergantung pada urutan ini. */
const CONTRIBUTOR_LEVELS: ReadonlyArray<{
  key: ContributorBadgeKey;
  label: string;
  threshold: number;
}> = [
  { key: "pakar", label: "Pakar kontributor", threshold: 25 },
  { key: "terpercaya", label: "Kontributor terpercaya", threshold: 10 },
  { key: "kontributor", label: "Kontributor aktif", threshold: 3 },
  { key: "baru", label: "Kontributor baru", threshold: 0 },
];

/**
 * Menentukan jenjang & jarak ke jenjang berikutnya.
 *
 * Nilai negatif / NaN diperlakukan sebagai 0 (pengguna baru) agar label tidak
 * pernah kosong hanya karena data aneh.
 */
export function resolveContributorBadge(totalVerified: number): ContributorBadge {
  const safe = Number.isFinite(totalVerified) ? Math.max(0, Math.trunc(totalVerified)) : 0;
  const index = CONTRIBUTOR_LEVELS.findIndex((level) => safe >= level.threshold);
  const position = index === -1 ? CONTRIBUTOR_LEVELS.length - 1 : index;
  const current = CONTRIBUTOR_LEVELS[position]!;
  const next = position > 0 ? CONTRIBUTOR_LEVELS[position - 1] : undefined;
  return {
    key: current.key,
    label: current.label,
    threshold: current.threshold,
    nextThreshold: next?.threshold ?? null,
  };
}

/** Jumlah kontribusi terverifikasi yang masih dibutuhkan untuk jenjang berikutnya. */
export function contributionsToNextLevel(totalVerified: number): number | null {
  const badge = resolveContributorBadge(totalVerified);
  if (badge.nextThreshold === null) return null;
  const safe = Math.max(0, Math.trunc(totalVerified));
  return Math.max(0, badge.nextThreshold - safe);
}
