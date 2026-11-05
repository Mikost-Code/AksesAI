import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  FileSearch,
  Flag,
  Send,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Panduan",
  description:
    "Cara mencari info AI gratis & murah, cara berkontribusi dengan sumber yang baik, dan cara melaporkan info bermasalah di AksesAI.",
};

/** Langkah bernomor — dipakai di kartu "Mencari info" & "Berkontribusi". */
function StepList({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-4 flex flex-col gap-3">
      {items.map((content, index) => (
        <li key={index} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary"
          >
            {index + 1}
          </span>
          <p className="min-w-0 text-sm leading-relaxed text-foreground/90">{content}</p>
        </li>
      ))}
    </ol>
  );
}

function GuideCard({
  icon,
  eyebrow,
  title,
  children,
  className = "",
  id,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`flex scroll-mt-24 flex-col rounded-xl border border-border bg-background p-5 shadow-[var(--shadow-card)] ${className}`}
    >
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary [&_svg]:size-5">
        {icon}
      </span>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function GuidePage() {
  return (
    <div className="flex flex-col">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "var(--gradient-hero)" }}
        />
        <div className="relative mx-auto max-w-[1200px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Panduan
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Pakai AksesAI{" "}
              <span className="text-gradient-brand">dengan benar</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-muted-foreground">
              Empat menit membaca ini membuat Anda pandai mencari info AI gratis,
              berkontribusi yang lolos review, dan terhindar dari penipuan.
            </p>
            <nav
              aria-label="Daftar isi"
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
            >
              {[
                { href: "#mencari", label: "Mencari info" },
                { href: "#berkontribusi", label: "Berkontribusi" },
                { href: "#sumber", label: "Kriteria sumber" },
                { href: "#terlarang", label: "Data terlarang" },
                { href: "#melaporkan", label: "Melaporkan" },
                { href: "#penipuan", label: "Penipuan" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        {/* ── Mencari & berkontribusi ───────────────────────────────────── */}
        <div className="animate-stagger grid gap-4 md:grid-cols-2">
          <GuideCard
            icon={<FileSearch aria-hidden="true" />}
            eyebrow="01 · Untuk semua orang"
            title="Mencari info"
            id="mencari"
          >
            <StepList
              items={[
                <>
                  Buka{" "}
                  <Link href="/info" className="font-medium text-primary hover:underline">
                    direktori
                  </Link>{" "}
                  lalu ketik kata kunci, atau pilih kategori/jenis akses pada filter.
                </>,
                <>
                  Buka halaman entri untuk melihat deskripsi, syarat akses, free tier, harga
                  per token, dan <strong>tautan sumber</strong>.
                </>,
                <>
                  Periksa tautan sumber langsung di dokumentasi atau halaman resmi provider —
                  pastikan domain resmi, bukan tiruan.
                </>,
                <>
                  Perhatikan masa berlaku promo/kuota. Entri yang sudah lewat berlabel{" "}
                  <strong>Kedaluwarsa</strong>.
                </>,
              ]}
            />
          </GuideCard>

          <GuideCard
            icon={<Send aria-hidden="true" />}
            eyebrow="02 · Untuk kontributor"
            title="Berkontribusi"
            id="berkontribusi"
          >
            <StepList
              items={[
                <>
                  Masuk dengan akun GitHub (tombol <strong>Masuk</strong>).
                </>,
                <>Tulis judul yang jelas (bukan clickbait) dan deskripsi yang sesuai sumber.</>,
                <>
                  Sertakan minimal satu sumber yang dapat dibuka — utamakan dokumentasi atau
                  halaman harga resmi provider.
                </>,
                <>
                  Jangan mengarang kuota, harga, atau syarat yang tidak tercantum pada
                  sumber.
                </>,
                <>Kirim untuk ditinjau. Reviewer memeriksa secara manual.</>,
              ]}
            />
          </GuideCard>
        </div>

        {/* ── Kriteria sumber ───────────────────────────────────────────── */}
        <GuideCard
          icon={<FileSearch aria-hidden="true" />}
          eyebrow="03"
          title="Kriteria sumber yang baik"
          id="sumber"
          className="mt-4"
        >
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {[
              "Berasal dari dokumentasi, halaman harga, blog resmi provider, atau repo resmi.",
              "Dapat dibuka publik dan relevan dengan isi kontribusi.",
              "Bukan pesan berantai atau tangkapan layar tanpa sumber primer.",
              "Tidak meminta pembayaran, kode OTP, atau data pribadi.",
            ].map((item) => (
              <li key={item} className="flex gap-2.5 rounded-lg bg-surface p-3 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="leading-relaxed text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        </GuideCard>

        {/* ── Data terlarang ────────────────────────────────────────────── */}
        <section
          id="terlarang"
          className="mt-4 flex scroll-mt-24 items-start gap-4 rounded-xl border border-danger/25 bg-danger-soft p-5"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger [&_svg]:size-5">
            <ShieldAlert aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-danger">
              04 · Terlarang
            </p>
            <h2 className="mt-1 text-lg font-semibold">Data yang tidak boleh ditulis</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/90">
              Jangan pernah memasukkan <strong>API key, token akses, kredensial akun, NIK,
              nomor KK, foto KTP, atau nomor rekening</strong> ke dalam kontribusi, laporan,
              maupun catatan. AksesAI memindai isian dan menolak pengiriman yang terindikasi
              memuat data tersebut.
            </p>
          </div>
        </section>

        {/* ── Melaporkan & penipuan ─────────────────────────────────────── */}
        <div className="animate-stagger mt-4 grid gap-4 md:grid-cols-2">
          <GuideCard
            icon={<Flag aria-hidden="true" />}
            eyebrow="05 · Jaga komunitas"
            title="Melaporkan info bermasalah"
            id="melaporkan"
          >
            <StepList
              items={[
                <>
                  Buka halaman entri dan klik <strong>Laporkan informasi</strong>.
                </>,
                <>
                  Pilih alasan: kuota berubah, sudah tidak gratis, harga tidak sesuai, promo
                  berakhir, tautan mati, tidak akurat, duplikat, dugaan penipuan, atau spam.
                </>,
                <>Jelaskan singkat masalahnya — tanpa perlu menyebut data pribadi.</>,
                <>Moderator akan memeriksa dan menindaklanjuti.</>,
              ]}
            />
          </GuideCard>

          <section
            id="penipuan"
            className="flex scroll-mt-24 flex-col rounded-xl border border-warning/25 bg-warning-soft p-5"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-warning/10 text-warning [&_svg]:size-5">
              <TriangleAlert aria-hidden="true" />
            </span>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-warning">
              06 · Tetap waspada
            </p>
            <h2 className="mt-1 text-lg font-semibold">Ciri penipuan umum</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-foreground/90">
              <li className="flex gap-2">
                <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                Menawarkan &quot;token murah&quot; lewat kontak pribadi.
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                Meminta OTP, kredensial akun, atau pembayaran di luar kanal resmi provider.
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                Mengarahkan ke situs tiruan provider.
              </li>
            </ul>
            <p className="mt-3 text-sm text-foreground/90">
              Jangan bayar. Laporkan dengan kategori{" "}
              <strong>
                <em>Dugaan penipuan</em>
              </strong>
              .
            </p>
          </section>
        </div>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <div className="bg-noise relative mt-10 overflow-hidden rounded-2xl border border-border px-6 py-10 text-center sm:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "var(--gradient-hero)" }}
          />
          <div className="relative">
            <h2 className="text-xl font-semibold sm:text-2xl">Siap mencoba?</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Jelajahi direktori sekarang, atau bagikan info AI gratis &amp; murah yang Anda
              temukan.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link href="/info" className={buttonVariants({ size: "lg" })}>
                Jelajahi direktori
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                Bagikan informasi
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
