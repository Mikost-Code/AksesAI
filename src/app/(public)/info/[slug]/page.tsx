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
import { clientEnv } from "@/lib/env";

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

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Beranda
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href="/info" className="hover:text-foreground">
          Direktori
        </Link>
        <span aria-hidden="true"> / </span>
        <Link
          href={`/kategori/${program.categorySlug}`}
          className="hover:text-foreground"
        >
          {program.categoryName}
        </Link>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={program.status} />
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
              {program.categoryName}
            </span>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">
              {ACCESS_TYPE_LABEL[program.accessType]}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
            {program.title}
          </h1>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-xs text-muted-foreground">Provider</dt>
                <dd className="text-sm font-medium">{program.provider}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Gift className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-xs text-muted-foreground">Kuota gratis</dt>
                <dd className="text-sm font-medium">
                  {program.freeTierAvailable
                    ? (program.freeTier?.trim() ?? "Ada free tier (besaran tidak tercantum)")
                    : "Tidak ada free tier"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CreditCard className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-xs text-muted-foreground">Kartu kredit</dt>
                <dd className="text-sm font-medium">
                  {program.requiresCard ? "Diperlukan untuk mendaftar" : "Tidak diperlukan"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Layers className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-xs text-muted-foreground">Ukuran konteks</dt>
                <dd className="text-sm font-medium">
                  {formatNumber(program.contextWindow, " token")}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Gauge className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-xs text-muted-foreground">Rate limit</dt>
                <dd className="text-sm font-medium">
                  {formatNumber(program.rateLimitRpm, " request/menit")}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-xs text-muted-foreground">Masa berlaku promo</dt>
                <dd className="text-sm font-medium">
                  {program.promoStart || program.promoEnd
                    ? `${formatDateID(program.promoStart) ?? "—"} s.d. ${formatDateID(program.promoEnd) ?? "—"}`
                    : "Tidak tercantum pada sumber"}
                </dd>
              </div>
            </div>
          </dl>

          <Alert variant="info" className="mt-6">
            <ShieldAlert aria-hidden="true" />
            <AlertTitle>Tentang status Terverifikasi</AlertTitle>
            <AlertDescription>{DEFAULT_DISCLAIMER_TEXT}</AlertDescription>
          </Alert>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Harga per token</h2>
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Input</dt>
                <dd className="font-medium">{formatPrice(program.priceInputPerMtok)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Output</dt>
                <dd className="font-medium">{formatPrice(program.priceOutputPerMtok)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              Harga dapat berubah kapan saja. Selalu periksa halaman harga resmi provider.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Deskripsi</h2>
            <p className="mt-2 whitespace-pre-line text-foreground/90">
              {program.description}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Syarat mengakses</h2>
            <p className="mt-2 whitespace-pre-line text-foreground/90">
              {program.requirements?.trim()
                ? program.requirements
                : "Tidak tercantum pada sumber."}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Sumber informasi</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Periksa langsung pada sumber resmi untuk memastikan info masih berlaku.
            </p>
            <div className="mt-3">
              <SourceList sources={program.sources} />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Riwayat pembaruan</h2>
            {program.history.length > 0 ? (
              <ol className="mt-3 flex flex-col gap-2 border-l border-border pl-4">
                {program.history.map((entry, index) => (
                  <li key={`${entry.action}-${entry.createdAt}-${index}`} className="relative text-sm">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[21px] top-2 size-2 rounded-full bg-primary"
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
          <Card>
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
                  className="size-10 rounded-full"
                />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-full bg-muted font-semibold">
                  {program.contributor.username.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <Link
                  href={`/kontributor/${program.contributor.username}`}
                  className="font-medium hover:underline"
                >
                  {program.contributor.username}
                </Link>
                {program.contributor.bio ? (
                  <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
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

          <Card>
            <CardContent className="pt-5">
              <ReportButton programId={program.id} programTitle={program.title} />
              <p className="mt-2 text-xs text-muted-foreground">
                Laporkan jika kuota berubah, sudah tidak gratis, harga salah, atau
                tautan mati. Jangan sertakan data pribadi.
              </p>
            </CardContent>
          </Card>

          <p className="rounded-lg border border-border bg-surface p-3 text-xs text-muted-foreground">
            {PLATFORM_DISCLAIMER_SHORT}
          </p>
        </aside>
      </div>
    </div>
  );
}
