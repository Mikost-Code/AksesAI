import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, ShieldAlert, UserRound } from "lucide-react";

import { ReportButton } from "@/components/report/report-button";
import { SourceList } from "@/components/source-list";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getProgramDetail } from "@/lib/programs/detail";
import { DEFAULT_DISCLAIMER_TEXT, PLATFORM_DISCLAIMER_SHORT } from "@/lib/constants/labels";
import { formatDateID, formatDateTimeID } from "@/lib/utils";
import { clientEnv } from "@/lib/env";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const HISTORY_LABEL: Record<string, string> = {
  create: "Informasi dibuat",
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

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) return { title: "Informasi tidak ditemukan" };

  const program = await getProgramDetail(slug);
  if (!program) return { title: "Informasi tidak ditemukan", robots: { index: false } };

  const site = clientEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const description = program.description.replace(/\s+/g, " ").slice(0, 160);
  return {
    title: program.title,
    description,
    alternates: { canonical: `${site}/bansos/${program.slug}` },
    openGraph: {
      type: "article",
      title: program.title,
      description,
      url: `${site}/bansos/${program.slug}`,
    },
  };
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();

  const program = await getProgramDetail(slug);
  if (!program) notFound();

  const coverage =
    program.regionScope === "nasional"
      ? "Nasional"
      : [program.city, program.province].filter(Boolean).join(", ");

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Beranda
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href="/bansos" className="hover:text-foreground">
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
          </div>

          <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
            {program.title}
          </h1>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-xs text-muted-foreground">Penyelenggara</dt>
                <dd className="text-sm font-medium">{program.organizer}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-xs text-muted-foreground">Wilayah</dt>
                <dd className="text-sm font-medium">{coverage || program.regionLabel}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-xs text-muted-foreground">Tanggal publikasi</dt>
                <dd className="text-sm font-medium">
                  {formatDateID(program.publishedAt) ?? "Tidak tercantum pada sumber"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="text-xs text-muted-foreground">Jadwal</dt>
                <dd className="text-sm font-medium">
                  {program.startDate || program.endDate
                    ? `${formatDateID(program.startDate) ?? "—"} s.d. ${formatDateID(program.endDate) ?? "—"}`
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
            <h2 className="text-xl font-semibold">Deskripsi</h2>
            <p className="mt-2 whitespace-pre-line text-foreground/90">
              {program.description}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Persyaratan</h2>
            <p className="mt-2 whitespace-pre-line text-foreground/90">
              {program.requirements?.trim()
                ? program.requirements
                : "Tidak tercantum pada sumber."}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Sumber informasi</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Periksa langsung pada sumber resmi untuk memastikan informasi masih
              berlaku.
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
              <ShieldAlert aria-hidden="true" />
              <AlertTitle>Informasi ini sudah kedaluwarsa</AlertTitle>
              <AlertDescription>
                Tanggal berakhir program ini telah lewat. Informasi dipertahankan
                untuk referensi, tetapi bantuan mungkin sudah tidak tersedia.
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
                Laporkan jika informasi tidak akurat, kedaluwarsa, atau
                mencurigakan. Jangan sertakan data pribadi.
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
