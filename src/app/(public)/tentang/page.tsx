import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  CircleSlash,
  Eye,
  HeartHandshake,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Tentang",
  description:
    "AksesAI adalah direktori info gratis & murah seputar AI berbasis kontribusi komunitas. Kami bukan afiliasi provider AI mana pun dan tidak menjual token.",
};

const VALUE_POINTS = [
  {
    icon: Eye,
    title: "Transparan",
    text: "Setiap entri wajib mencantumkan sumber yang bisa Anda buka dan periksa sendiri.",
  },
  {
    icon: Users,
    title: "Milik komunitas",
    text: "Info dikumpulkan dari kontribusi pengguna, lengkap dengan atribusi kontributornya.",
  },
  {
    icon: BadgeCheck,
    title: "Verifikasi manusia",
    text: "Reviewer memeriksa setiap entri terhadap sumbernya sebelum label Terverifikasi diberikan.",
  },
] as const;

const NOT_DOING = [
  "Menjual token/kredit — kami bukan afiliasi provider AI mana pun.",
  "Menerima bayaran dari provider untuk urutan tampil atau label.",
  "Menjamin kuota gratis atau harga tetap tersedia — promo bisa berubah kapan saja.",
  "Mengumpulkan API key, token akses, NIK, atau nomor rekening.",
  "Meminta biaya apa pun, dalam bentuk apa pun.",
] as const;

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* ── Hero — band hijau hutan ─────────────────────────────────────── */}
      <section className="hero-forest relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sand/80">
              Tentang
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-sand-bright sm:text-4xl">
              Satu pintu untuk info{" "}
              <span className="text-sand">AI gratis &amp; murah</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-sand/80">
              AksesAI membantu Anda menemukan API/token gratis dari provider, free tier,
              harga per token, model open-weight, tool gratis, dan hosting gratis — yang
              bersumber jelas dan dapat diperiksa.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        {/* ── Nilai utama ───────────────────────────────────────────────── */}
        <ul className="animate-stagger grid gap-4 sm:grid-cols-3">
          {VALUE_POINTS.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="rounded-xl border border-border bg-background p-5 shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary [&_svg]:size-5">
                <Icon aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-base font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>

        {/* ── Yang kami lakukan vs tidak ────────────────────────────────── */}
        <div className="animate-stagger mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-background p-5 shadow-[var(--shadow-card)]">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <HeartHandshake className="size-5 text-primary" aria-hidden="true" />
              Yang kami lakukan
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-foreground/90">
              Mengumpulkan info dari kontribusi komunitas dengan aturan sederhana: setiap
              info wajib menyertakan sumber yang dapat dibuka. Reviewer memeriksa info
              tersebut secara manual terhadap sumbernya sebelum ditandai{" "}
              <strong className="font-semibold">Terverifikasi</strong>, lalu riwayat
              perubahannya tersimpan sebagai audit trail yang bisa dilihat publik.
            </p>
            <Link
              href="/info"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Lihat direktori
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </section>

          <section className="rounded-xl border border-border bg-background p-5 shadow-[var(--shadow-card)]">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <CircleSlash className="size-5 text-danger" aria-hidden="true" />
              Yang tidak kami lakukan
            </h2>
            <ul className="mt-2.5 flex flex-col gap-2">
              {NOT_DOING.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger/60"
                  />
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ── Status Terverifikasi ──────────────────────────────────────── */}
        <section className="mt-6 flex items-start gap-4 rounded-xl border border-warning/25 bg-warning-soft p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning [&_svg]:size-5">
            <ShieldCheck aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Apa arti status Terverifikasi</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/90">
              Status Terverifikasi berarti info telah diperiksa oleh reviewer berdasarkan
              sumber yang tersedia pada saat pemeriksaan. Ini <strong>bukan</strong> jaminan
              kuota masih tersedia, <strong>bukan</strong> jaminan harga tidak berubah, dan{" "}
              <strong>bukan</strong> jaminan Anda akan mendapatkan akses. Selalu periksa
              dokumentasi atau halaman resmi provider sebelum mendaftar.
            </p>
          </div>
        </section>

        {/* ── Waspada penipuan ──────────────────────────────────────────── */}
        <section className="mt-4 flex items-start gap-4 rounded-xl border border-danger/25 bg-danger-soft p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger [&_svg]:size-5">
            <ShieldAlert aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Waspada penipuan</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/90">
              Awas pihak yang menjual &quot;token murah&quot; lewat kontak pribadi, meminta
              kode OTP, meminta kredensial akun, atau mengarahkan Anda ke situs tiruan
              provider. Laporkan info mencurigakan melalui tombol laporan pada halaman
              entri — panduan lengkap tersedia di{" "}
              <Link href="/panduan" className="font-medium text-primary hover:underline">
                halaman panduan
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ── Kontak & CTA — band hijau hutan ───────────────────────────── */}
        <div className="hero-forest relative mt-10 overflow-hidden rounded-2xl px-6 py-10 text-center sm:px-12">
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-xl font-semibold text-sand-bright sm:text-2xl">
              Punya info untuk dibagikan?
            </h2>
            <p className="mt-2 text-sm text-sand/80">
              Bantuan, pertanyaan, atau pengelolaan data: lihat{" "}
              <Link
                href="/kebijakan-privasi"
                className="font-medium text-sand-bright underline underline-offset-2 hover:opacity-80"
              >
                kebijakan privasi
              </Link>
              . Untuk kontribusi, cukup masuk dengan GitHub.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className={buttonVariants({ variant: "cream", size: "lg" })}
              >
                Mulai berkontribusi
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/panduan"
                className={buttonVariants({
                  variant: "ghost",
                  size: "lg",
                  className:
                    "border border-sand/40 text-sand hover:bg-white/10 hover:text-sand-bright",
                })}
              >
                Baca panduan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
