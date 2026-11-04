import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME, DEFAULT_DISCLAIMER_TEXT } from "@/lib/constants/labels";

export const metadata = {
  title: "Temukan info AI gratis & murah yang bersumber jelas",
  description:
    "AksesAI adalah direktori info AI gratis dan murah dari kontribusi komunitas: API/token gratis, free tier, harga per token, model open-weight, tool gratis, dan hosting gratis. Setiap info menyertakan sumber resmi yang diperiksa reviewer.",
};

const STEPS = [
  {
    icon: FileSearch,
    title: "Temukan",
    text: "Cari info berdasarkan nama provider, jenis akses, kategori, atau ketersediaan gratis.",
  },
  {
    icon: Search,
    title: "Periksa sumber",
    text: "Setiap info menyertakan tautan dokumentasi atau halaman harga resmi provider.",
  },
  {
    icon: Send,
    title: "Bagikan",
    text: "Punya info promo? Masuk dengan GitHub dan kirimkan beserta tautan resminya.",
  },
  {
    icon: ShieldCheck,
    title: "Diverifikasi manusia",
    text: "Reviewer memeriksa manual sebelum info berlabel Terverifikasi.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-border bg-surface">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-grid-soft"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "var(--gradient-hero)" }}
        />
        <div className="relative mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center animate-[var(--animate-fade-up)]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-center text-xs font-medium text-primary sm:text-sm">
              <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Direktori info gratis &amp; murah seputar AI</span>
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.4rem]">
              Temukan info AI gratis &amp; murah{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                yang bersumber jelas
              </span>
              .
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {APP_NAME} mengumpulkan info API/token gratis, free tier, harga
              per token, model open-weight, tool, dan hosting gratis dari
              kontribusi komunitas. Setiap entri menyertakan sumber yang dapat
              diperiksa dan diverifikasi manual oleh reviewer, bukan otomatis.
            </p>

            <form
              action="/info"
              method="get"
              role="search"
              className="mx-auto mt-9 flex w-full max-w-xl flex-col gap-2 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search
                  className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  name="q"
                  type="search"
                  placeholder="Cari nama provider, model, atau tool…"
                  aria-label="Kata kunci pencarian info AI"
                  className="h-11 pl-10 shadow-[var(--shadow-card)]"
                  maxLength={100}
                />
              </div>
              <button type="submit" className={buttonVariants({ size: "lg" })}>
                Cari
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Populer:</span>
              {[
                { slug: "free-api", label: "Free API & Token" },
                { slug: "free-tier-model", label: "Free Tier Model" },
                { slug: "tool-ai-gratis", label: "Tool AI Gratis" },
              ].map(({ slug, label }) => (
                <Link
                  key={slug}
                  href={`/info?kategori=${encodeURIComponent(slug)}`}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 pt-12 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-info/20 bg-info-soft p-5 text-sm shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-info" aria-hidden="true" />
            <p className="text-foreground/90">
              <strong className="font-semibold">Catatan penting:</strong>{" "}
              {DEFAULT_DISCLAIMER_TEXT}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">
            Cara kerja {APP_NAME}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
            Empat langkah sederhana, dengan manusia di pusat keputusan.
          </p>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className="group relative rounded-xl border border-border bg-background p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-heading text-2xl font-bold text-border"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 py-16 text-center sm:px-6 lg:px-8">
        <CheckCircle2 className="mx-auto size-10 text-primary" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-semibold">
          Direktori sedang diisi oleh kontributor
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Belum ada info yang dipublikasikan saat ini. Anda dapat melihat
          direktori lengkap atau mulai membagikan info AI gratis &amp; murah
          yang Anda temukan dengan sumber yang jelas.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/info" className={buttonVariants({ size: "lg" })}>
            Buka direktori
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            Bagikan informasi
          </Link>
        </div>
      </section>
    </div>
  );
}
