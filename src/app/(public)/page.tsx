import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileSearch,
  Search,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientEnv } from "@/lib/env";
import { APP_NAME, DEFAULT_DISCLAIMER_TEXT } from "@/lib/constants/labels";
import { getTopContributors } from "@/lib/programs/seo";
import Image from "next/image";

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

/** Ringkasan jaminan — tiga pilar nilai produk, bukan sekadar dekorasi. */
const TRUST_POINTS = [
  {
    icon: BadgeCheck,
    title: "Sumber resmi",
    text: "Tautan dokumentasi atau halaman harga provider, bukan kabar angin.",
  },
  {
    icon: Users,
    title: "Kontribusi komunitas",
    text: "Info dikirim pengguna, dilengkapi atribusi kontributor.",
  },
  {
    icon: ShieldCheck,
    title: "Verifikasi manual",
    text: "Reviewer manusia memeriksa sebelum label Terverifikasi diberikan.",
  },
] as const;

const POPULAR = [
  { slug: "free-api", label: "Free API & Token" },
  { slug: "free-tier-model", label: "Free Tier Model" },
  { slug: "tool-ai-gratis", label: "Tool AI Gratis" },
] as const;

export const revalidate = 300;

export default async function HomePage() {
  // Sitelink search box untuk hasil Google (rute /info sudah menerima ?q=).
  const site = clientEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: APP_NAME,
    url: `${site}/`,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${site}/info?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const topContributors = await getTopContributors(3);

  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="bg-noise relative overflow-hidden border-b border-border">
        <div aria-hidden="true" className="absolute inset-0 bg-surface" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-grid-soft"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "var(--gradient-hero)" }}
        />
        {/* Cahaya lembut di belakang judul agar hero punya kedalaman */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-8 size-[520px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl"
        />

        <div className="relative mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center animate-[var(--animate-fade-up)]">
            <h1 className="text-[2rem] font-bold leading-[1.12] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.5rem]">
              Info AI gratis &amp; murah,{" "}
              <span className="text-gradient-brand">dengan sumber yang jelas</span>.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {APP_NAME} mengumpulkan API/token gratis, free tier, harga per
              token, model open-weight, tool, dan hosting gratis. Setiap entri
              menyertakan sumber yang bisa Anda periksa sendiri.
            </p>

            <form
              action="/info"
              method="get"
              role="search"
              className="mx-auto mt-9 flex w-full max-w-xl flex-col gap-2 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  name="q"
                  type="search"
                  placeholder="Cari nama provider, model, atau tool…"
                  aria-label="Kata kunci pencarian info AI"
                  className="h-12 rounded-xl pl-10 text-base shadow-[var(--shadow-card)]"
                  maxLength={100}
                />
              </div>
              <button
                type="submit"
                className={buttonVariants({ size: "lg", className: "h-12 rounded-xl px-7" })}
              >
                Cari
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Populer:</span>
              {POPULAR.map(({ slug, label }) => (
                <Link
                  key={slug}
                  href={`/info?kategori=${encodeURIComponent(slug)}`}
                  className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-foreground/80 transition-all duration-150 hover:-translate-y-px hover:border-primary/35 hover:bg-primary-soft hover:text-primary hover:shadow-[var(--shadow-card)]"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Tiga pilar kepercayaan */}
          <ul className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-3 animate-stagger">
            {TRUST_POINTS.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="rounded-xl border border-border bg-background/70 p-4 text-left shadow-[var(--shadow-card)] backdrop-blur-sm transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <p className="mt-2.5 text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Kontributor paling aktif ───────────────────────────────────── */}
      {topContributors.length > 0 ? (
        <section className="mx-auto w-full max-w-[1200px] px-4 pt-12 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold sm:text-xl">
              Kontributor paling aktif
            </h2>
            <Link
              href="/info"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Lihat semua info
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="animate-stagger mt-4 grid gap-3 sm:grid-cols-3">
            {topContributors.map(({ username, avatarUrl, contributionCount }) => (
              <li key={username}>
                <Link
                  href={`/kontributor/${username}`}
                  className="card-accent flex items-center gap-3 rounded-xl border border-border bg-background p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]"
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      width={44}
                      height={44}
                      className="size-11 shrink-0 rounded-full ring-1 ring-border"
                    />
                  ) : (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                      {username.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{username}</p>
                    <p className="text-xs text-muted-foreground">
                      {contributionCount} info terverifikasi
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Disclaimer ─────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1200px] px-4 pt-12 sm:px-6 lg:px-8">
        <div className="flex items-start gap-3 rounded-xl border border-info/20 bg-info-soft p-5 text-sm shadow-[var(--shadow-card)]">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-info" aria-hidden="true" />
          <p className="text-foreground/90">
            <strong className="font-semibold">Catatan penting:</strong>{" "}
            {DEFAULT_DISCLAIMER_TEXT}
          </p>
        </div>
      </section>

      {/* ── Cara kerja ─────────────────────────────────────────────────── */}
      <section className="mt-14 bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Alur kerja
            </p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Cara kerja {APP_NAME}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Empat langkah sederhana, dengan manusia di pusat keputusan.
            </p>
          </div>

          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className="group relative rounded-xl border border-border bg-background p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-heading text-2xl font-bold text-border transition-colors group-hover:text-primary/25"
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

      {/* ── Ajakan bergabung ───────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="bg-noise relative overflow-hidden rounded-2xl border border-border bg-surface px-6 py-12 text-center sm:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "var(--gradient-hero)" }}
          />
          <div className="relative mx-auto max-w-2xl">
            <CheckCircle2 className="mx-auto size-9 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
              Direktori tumbuh dari kontribusi
            </h2>
            <p className="mt-2 text-muted-foreground">
              Ada info API gratis, promo kredit, atau tool AI hemat yang Anda
              pakai? Bagikan beserta tautan resminya — reviewer kami akan
              memeriksa sebelum tayang.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href="/info" className={buttonVariants({ size: "lg" })}>
                Jelajahi direktori
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                Bagikan informasi
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Masuk hanya dengan GitHub — tidak perlu membuat akun baru.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
