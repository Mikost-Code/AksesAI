import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { ReviewActionPanel } from "@/components/review/review-action-panel";
import { ProgramExpiryPanel } from "@/components/review/program-expiry-panel";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser, hasAnyRole } from "@/lib/auth/session";
import { getReviewDetail } from "@/lib/programs/review";
import { ACCESS_TYPE_LABEL, SOURCE_TYPE_LABEL, type SourceType } from "@/lib/constants/labels";
import { formatDateTimeID } from "@/lib/utils";

export const metadata: Metadata = { title: "Panel review", robots: { index: false } };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const user = await getCurrentUser();
  if (!user || !hasAnyRole(user, ["reviewer", "admin"])) return null;

  const detail = await getReviewDetail(id);
  if (!detail) notFound();

  const claimedActive = detail.claimActive;
  const claimedByMe = claimedActive && detail.claimedBy === user.id;

  const field = (label: string, value: string | null) => (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value?.trim() ? value : "—"}</dd>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/review" className="hover:text-foreground">
          Antrean review
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="line-clamp-1 text-foreground">{detail.title}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{detail.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail.categoryName} · {ACCESS_TYPE_LABEL[detail.accessType]} · {detail.provider}
          </p>
        </div>
        <StatusBadge status={detail.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <section className="rounded-lg border border-border bg-background p-5">
            <h2 className="text-base font-semibold">Deskripsi</h2>
            <p className="mt-2 whitespace-pre-line text-sm">{detail.description}</p>
          </section>

          {detail.requirements ? (
            <section className="rounded-lg border border-border bg-background p-5">
              <h2 className="text-base font-semibold">Syarat mengakses</h2>
              <p className="mt-2 whitespace-pre-line text-sm">{detail.requirements}</p>
            </section>
          ) : null}

          <section className="rounded-lg border border-border bg-background p-5">
            <h2 className="text-base font-semibold">Info penawaran</h2>
            <dl className="mt-2 grid gap-4 sm:grid-cols-2">
              {field("Provider", detail.provider)}
              {field("Jenis akses", ACCESS_TYPE_LABEL[detail.accessType])}
              {field(
                "Kuota gratis",
                detail.freeTierAvailable
                  ? (detail.freeTier ?? "Ada free tier (besaran tidak diisi)")
                  : "Tidak ada free tier",
              )}
              {field("Perlu kartu kredit", detail.requiresCard ? "Ya" : "Tidak")}
              {field(
                "Harga input / 1jt token",
                detail.priceInputPerMtok === null ? null : `$${detail.priceInputPerMtok}`,
              )}
              {field(
                "Harga output / 1jt token",
                detail.priceOutputPerMtok === null ? null : `$${detail.priceOutputPerMtok}`,
              )}
              {field("Rate limit (RPM)", detail.rateLimitRpm?.toString() ?? null)}
              {field("Konteks (token)", detail.contextWindow?.toString() ?? null)}
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-background p-5">
            <h2 className="text-base font-semibold">Sumber</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {detail.sources.map((source, i) => (
                <li key={`${source.url}-${i}`} className="flex flex-wrap items-center gap-2 text-sm">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 break-all text-primary underline"
                  >
                    {source.title ?? source.url}
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                  </a>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted-foreground">
                    {SOURCE_TYPE_LABEL[source.type as SourceType] ?? source.type}
                  </span>
                  {source.isPrimary ? (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
                      Utama
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Buka setiap tautan dan pastikan isinya sesuai sebelum memutuskan. Jangan
              menerbitkan tautan yang tidak dapat diakses.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-background p-5">
            <h2 className="text-base font-semibold">Detail</h2>
            <dl className="mt-2 grid gap-4 sm:grid-cols-2">
              {field("Kontributor", detail.contributorName)}
              {field("Dikirim", formatDateTimeID(detail.createdAt))}
              {field("Mulai promo", detail.promoStart)}
              {field("Berakhir promo", detail.promoEnd)}
              {field("Status", detail.status)}
            </dl>
            {detail.contributorNote ? (
              <div className="mt-4 rounded-md border border-border bg-surface p-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Catatan kontributor
                </p>
                <p className="mt-1 whitespace-pre-line">{detail.contributorNote}</p>
              </div>
            ) : null}
          </section>

          {detail.history.length > 0 ? (
            <section className="rounded-lg border border-border bg-background p-5">
              <h2 className="text-base font-semibold">Riwayat</h2>
              <ol className="mt-2 flex flex-col gap-2 text-sm">
                {detail.history.map((h, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{h.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTimeID(h.createdAt)}
                      {h.actorName ? ` · ${h.actorName}` : ""}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-3">
          {/* Panel keputusan hanya untuk item yang masih dalam tinjauan.
              Tanpa penjagaan ini, membuka entri terverifikasi dari halaman
              Program akan menampilkan tombol Verifikasi/Tolak yang tidak
              berlaku — dan RPC-nya memang akan menolak. */}
          {detail.status === "pending" || detail.status === "needs_changes" ? (
            <ReviewActionPanel
              programId={detail.id}
              isOwnContribution={detail.contributorId === user.id}
              claimedByMe={claimedByMe}
              claimedByName={claimedActive && !claimedByMe ? "reviewer lain" : null}
            />
          ) : null}
          {detail.status === "verified" || detail.status === "expired" ? (
            <ProgramExpiryPanel
              programId={detail.id}
              status={detail.status}
              promoEnd={detail.promoEnd}
            />
          ) : null}
          <div className="rounded-lg border border-border bg-background p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Checklist</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Sumber resmi provider &amp; dapat dibuka</li>
              <li>Kuota gratis sesuai halaman resmi</li>
              <li>Harga/rate limit tidak salah kutip</li>
              <li>Masa promo masih berlaku</li>
              <li>Tidak memuat API key atau data pribadi</li>
              <li>Tidak duplikat dengan entri lain</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
