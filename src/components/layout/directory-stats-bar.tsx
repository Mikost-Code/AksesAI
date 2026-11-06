import { Link2, ShieldCheck, Users, XCircle } from "lucide-react";

import type { DirectoryStats } from "@/lib/programs/seo";
import { cn } from "@/lib/utils";

/**
 * Pita angka ringkas direktori.
 *
 * Konsep sengaja dibedakan dari referensi (papan "bansos"): di sana angkanya
 * memisahkan "masih aktif" vs "arsip kedaluwarsa" sebagai dua kartu terpisah.
 * Di sini angka digabung dalam SATU pita bergaris pemisah, dengan urutan
 * mengikuti alur berpikir pembaca: seberapa banyak isinya → seberapa bisa
 * dipercaya (sumber) → siapa yang mengisi. Entri kedaluwarsa tetap ditampilkan
 * karena justru itu bukti kami tidak menyembunyikan promo yang sudah mati.
 *
 * Angka nol tidak pernah ditampilkan kecuali memang bermakna: `stats` bernilai
 * null saat query gagal, dan seluruh pita disembunyikan.
 */
export function DirectoryStatsBar({
  stats,
  className,
}: {
  stats: DirectoryStats | null;
  className?: string;
}) {
  if (!stats) return null;

  const items = [
    {
      icon: ShieldCheck,
      value: stats.aktif,
      label: "Info aktif",
      hint: "Entri yang sudah diverifikasi reviewer",
    },
    {
      icon: XCircle,
      value: stats.kedaluwarsa,
      label: "Arsip kedaluwarsa",
      hint: "Tetap disimpan sebagai catatan, tidak dihapus",
    },
    {
      icon: Link2,
      value: stats.sumber,
      label: "Sumber resmi",
      hint: "Tautan provider yang bisa Anda periksa sendiri",
    },
    {
      icon: Users,
      value: stats.kontributor,
      label: "Kontributor",
      hint: "Pengguna GitHub yang menyumbang entri",
    },
  ];

  /*
   * Sel berangka nol dibuang, bukan ditampilkan sebagai "0".
   *
   * "0 arsip kedaluwarsa" terbaca sebagai fakta yang membanggakan padahal
   * artinya cuma "belum ada entri yang lewat masa berlaku" — dan saat direktori
   * masih kecil, sel nol justru melemahkan empat angka lain yang benar-benar
   * mengesankan. Aturan yang sama dipakai badge GitHub: jangan pernah
   * menampilkan 0 sebagai informasi.
   */
  const visible = items.filter((item) => item.value > 0);
  if (visible.length === 0) return null;

  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-sand/20 bg-white/10",
        className,
      )}
      // Kolom mengikuti jumlah sel yang benar-benar tampil agar tidak ada
      // ruang kosong menggantung saat salah satu angka nol.
      style={{
        gridTemplateColumns: `repeat(${Math.min(visible.length, 4)}, minmax(0, 1fr))`,
      }}
    >
      {visible.map(({ icon: Icon, value, label, hint }) => (
        <div
          key={label}
          // `gap-px` + latar induk menghasilkan garis pemisah tipis tanpa
          // perlu menata border per sel (rapi di semua breakpoint).
          className="flex flex-col items-center bg-forest-deep/40 px-3 py-4 text-center"
        >
          <dt className="order-2 mt-1 text-[11px] font-medium leading-tight text-sand/75">
            {label}
          </dt>
          <dd className="order-1 flex items-center gap-1.5 font-heading text-xl font-bold tabular-nums text-sand-bright sm:text-2xl">
            <Icon className="size-4 shrink-0 text-sand/60" aria-hidden="true" />
            {value.toLocaleString("id-ID")}
            <span className="sr-only"> {hint}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
