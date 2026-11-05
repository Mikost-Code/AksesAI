import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CreditCard,
  Gauge,
  Gift,
  Layers,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { ReportButton } from "@/components/report/report-button";
import { ProgramFeedback } from "@/components/program-feedback";
import { ShareButtons } from "@/components/share-buttons";
import { SourceList } from "@/components/source-list";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getProgramDetail } from "@/lib/programs/detail";
import {
  ACCESS_TYPE_LABEL,
  DEFAULT_DISCLAIMER_TEXT,
  PLATFORM_DISCLAIMER_SHORT,
} from "@/lib/constants/labels";
import { formatDateID, formatDateTimeID } from "@/lib/utils";
import { clientEnv, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAnonClient } from "@/lib/supabase/server";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const HISTORY_LABEL: Record<string, string> = {
  create: "Info dibuat",
  edit: "Diperbarui oleh kontributor",
  submit: "Diajukan untuk ditinjau",
  withdraw: "Ditarik kembali ke draf",
  request_changes: "Diminta revisi oleh reviewer",
  verify: "Diverifikasi oleh reviewer",
  reject: "Ditolak oleh reviewer",
  expire: "Ditandai kedaluwarsa",
  archive: "Diarsipkan",
  reviewer_edit: "Dikoreksi oleh reviewer",
  reopen: "Dibuka kembali untuk ditinjau",
};

/** Format harga USD per 1 juta token; null bila tidak diketahui. */
function formatPrice(value: number | null): string {
  if (value === null) return "Tidak tercantum";
  if (value === 0) return "Gratis";
  return `$${value.toFixed(2)} / 1jt token`;
}

function formatNumber(value: number | null, suffix = ""): string {
  if (value === null) return "Tidak tercantum";
  return `${value.toLocaleString("id-ID")}${suffix}`;
}

type PageProps = { params: Promise<{ slug: string }> };

/** Agregat feedback (RPC security definer — baris per pemilih tidak terekspos). */
async function fetchFeedbackCounts(programId: string): Promise<{
  helpful: number;
  notHelpful: number;
}> {
  if (!isSupabaseConfigured()) return { helpful: 0, notHelpful: 0 };
  try {
    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase.rpc("get_program_feedback", {
      p_program_id: programId,
    });
    if (error) throw new Error(error.message);
    const counts = (data ?? {}) as { helpful?: number; notHelpful?: number };
    return { helpful: counts.helpful ?? 0, notHelpful: counts.notHelpful ?? 0 };
  } catch (error) {
    console.error(
      "[detail] Feedback gagal:",
      error instanceof Error ? error.message : "unknown",
    );
    return { helpful: 0, notHelpful: 0 };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) return { title: "Info tidak ditemukan" };

  const program = await getProgramDetail(slug);
  if (!program) return { title: "Info tidak ditemukan", robots: { index: false } };

  const site = clientEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const description = program.description.replace(/\s+/g, " ").slice(0, 160);
  return {
    title: program.title,
    description,
    alternates: { canonical: `${site}/info/${program.slug}` },
    openGraph: {
      type: "article",
      title: program.title,
      description,
      url: `${site}/info/${program.slug}`,
    },
  };
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();

  const program = await getProgramDetail(slug);
  if (!program) notFound();

  const feedback = await fetchFeedbackCounts(program.id);
  const site = clientEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const pageUrl = `${site}/info/${program.slug}`;
  const pageDescription = program.description.replace(/\s+/g, " ").slice(0, 300);

  // Structured data: breadcrumb + halaman entri (rich result Google).
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: `${site}/` },
          { "@type": "ListItem", position: 2, name: "Direktori", item: `${site}/info` },
          {
            "@type": "ListItem",
            position: 3,
            name: program.categoryName,
            item: `${site}/kategori/${program.categorySlug}`,
          },
          { "@type": "ListItem", position: 4, name: program.title },
        ],
      },
      {
        "@type": "WebPage",
        name: program.title,
        description: pageDescription,
        url: pageUrl,
        dateModified: program.verifiedAt ?? undefined,
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="transition-colors hover:text-foreground">
              Beranda
            </Link>
          </li>
          <li aria-hidden="true" className="text-border">/</li>
          <li>
            <Link href="/info" className="transition-colors hover:text-foreground">
              Direktori
            </Link>
          </li>
          <li aria-hidden="true" className="text-border">/</li>
          <li>
            <Link
              href={`/kategori/${program.categorySlug}`}
              className="transition-colors hover:text-foreground"
            >
              {program.categoryName}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={program.status} />
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
              {program.categoryName}
            </span>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">
              {ACCESS_TYPE_LABEL[program.accessType]}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-[2rem]">
            {program.title}
          </h1>

          <dl className="mt-6 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
            {[
              { icon: Sparkles, label: "Provider", value: program.provider, tone: "primary" },
              {
                icon: Gift,
                label: "Kuota gratis",
                value: program.freeTierAvailable
                  ? (program.freeTier?.trim() ?? "Ada free tier (besaran tidak tercantum)")
                  : "Tidak ada free tier",
                tone: "accent",
              },
              {
                icon: CreditCard,
                label: "Kartu kredit",
                value: program.requiresCard ? "Diperlukan untuk mendaftar" : "Tidak diperlukan",
                tone: "muted",
              },
              {
                icon: Layers,
                label: "Ukuran konteks",
                value: formatNumber(program.contextWindow, " token"),
                tone: "muted",
              },
              {
                icon: Gauge,
                label: "Rate limit",
                value: formatNumber(program.rateLimitRpm, " request/menit"),
                tone: "muted",
              },
              {
                icon: CalendarDays,
                label: "Masa berlaku promo",
                value:
                  program.promoStart || program.promoEnd
                    ? `${formatDateID(program.promoStart) ?? "—"} s.d. ${formatDateID(program.promoEnd) ?? "—"}`
                    : "Tidak tercantum pada sumber",
                tone: "muted",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-2.5 bg-background p-4">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-muted-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="text-sm font-medium leading-snug">{item.value}</dd>
                  </div>
                </div>
              );
            })}
          </dl>

          <Alert variant="info" className="mt-6">
            <ShieldAlert aria-hidden="true" />
            <AlertTitle>Tentang status Terverifikasi</AlertTitle>
            <AlertDescription>{DEFAULT_DISCLAIMER_TEXT}</AlertDescription>
          </Alert>

          <section className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight">Harga per token</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Input", value: formatPrice(program.priceInputPerMtok) },
                { label: "Output", value: formatPrice(program.priceOutputPerMtok) },
              ].map((price) => (
                <div
                  key={price.label}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <p className="text-xs text-muted-foreground">{price.label}</p>
                  <p className="mt-0.5 font-heading text-lg font-semibold tabular-nums">
                    {price.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Harga dapat berubah kapan saja. Selalu periksa halaman harga resmi provider.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight">Deskripsi</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground/90">
              {program.description}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight">Syarat mengakses</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground/90">
              {program.requirements?.trim()
                ? program.requirements
                : "Tidak tercantum pada sumber."}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight">Sumber informasi</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Periksa langsung pada sumber resmi untuk memastikan info masih berlaku.
            </p>
            <div className="mt-3">
              <SourceList sources={program.sources} />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight">Riwayat pembaruan</h2>
            {program.history.length > 0 ? (
              <ol className="mt-3 flex flex-col gap-4 border-l-2 border-border pl-5">
                {program.history.map((entry, index) => (
                  <li key={`${entry.action}-${entry.createdAt}-${index}`} className="relative text-sm">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[26px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary"
                    />
                    <p className="font-medium">
                      {HISTORY_LABEL[entry.action] ?? entry.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTimeID(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Belum ada pembaruan tercatat.
              </p>
            )}
          </section>

          {program.status === "expired" ? (
            <Alert variant="warning" className="mt-8">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Info ini kemungkinan sudah tidak berlaku</AlertTitle>
              <AlertDescription>
                Masa promo atau kuota gratis untuk entri ini telah lewat. Info
                dipertahankan untuk referensi, tetapi akses gratis mungkin sudah
                tidak tersedia.
              </AlertDescription>
            </Alert>
          ) : null}
        </article>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="rounded-xl shadow-[var(--shadow-card)]">
            <CardContent className="flex flex-col gap-5 pt-5">
              <ShareButtons url={pageUrl} title={program.title} />
              <Separator />
              <ProgramFeedback
                programId={program.id}
                initialHelpful={feedback.helpful}
                initialNotHelpful={feedback.notHelpful}
              />
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="text-base">Dibagikan oleh</CardTitle>
            </CardHeader>
            <CardContent className="flex items-start gap-3">
              {program.contributor.avatar ? (
                <Image
                  src={program.contributor.avatar}
                  alt={`Avatar ${program.contributor.username}`}
                  width={40}
                  height={40}
                  className="size-10 rounded-full ring-2 ring-border"
                />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                  {program.contributor.username.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <Link
                  href={`/kontributor/${program.contributor.username}`}
                  className="font-medium transition-colors hover:text-primary hover:underline"
                >
                  {program.contributor.username}
                </Link>
                {program.contributor.bio ? (
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {program.contributor.bio}
                  </p>
                ) : null}
              </div>
            </CardContent>
            <Separator />
            <CardContent className="pt-4 text-sm">
              <p className="text-xs text-muted-foreground">Diperiksa oleh</p>
              <p className="font-medium">
                {program.reviewerUsername ?? "Belum ada reviewer tercatat"}
              </p>
              {program.verifiedAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Diverifikasi {formatDateID(program.verifiedAt)}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-[var(--shadow-card)]">
            <CardContent className="pt-5">
              <ReportButton programId={program.id} programTitle={program.title} />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Laporkan jika kuota berubah, sudah tidak gratis, harga salah, atau
                tautan mati. Jangan sertakan data pribadi.
              </p>
            </CardContent>
          </Card>

          <p className="rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed text-muted-foreground">
            {PLATFORM_DISCLAIMER_SHORT}
          </p>
        </aside>
      </div>
    </div>
  );
}
