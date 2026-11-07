import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ContributionForm } from "@/components/dashboard/contribution-form";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getCategories } from "@/lib/programs/categories";
import {
  EDITABLE_STATUSES,
  findDuplicateCandidates,
  getEditableProgram,
} from "@/lib/programs/own-programs";

export const metadata: Metadata = {
  title: "Edit kontribusi",
  robots: { index: false },
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditContributionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fdashboard%2Fkontribusi");

  const [program, categories] = await Promise.all([
    getEditableProgram(id, user.id),
    getCategories(),
  ]);
  if (!program) notFound();

  const editable = EDITABLE_STATUSES.includes(program.status);

  // Peringatan duplikat hanya relevan saat bisa diedit.
  const duplicates = editable
    ? await findDuplicateCandidates(
        program.title,
        // Sumber program ini sendiri tidak perlu dibandingkan dengan dirinya.
        [],
      )
    : [];

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/dashboard/kontribusi" className="hover:text-foreground">
          Kontribusi saya
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="line-clamp-1 text-foreground">{program.title}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Edit kontribusi</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Perubahan tersimpan sebagai draf. Kirim ulang setelah selesai agar
            reviewer dapat meninjau versi terbaru.
          </p>
        </div>
        <StatusBadge status={program.status} />
      </div>

      {!editable ? (
        <div className="rounded-lg border border-info/20 bg-info-soft p-4 text-sm">
          <p className="font-medium">
            Kontribusi berstatus ini tidak dapat diubah lagi.
          </p>
          <p className="mt-1 text-muted-foreground">
            Informasi yang sudah dikirim sedang/sudah ditinjau. Bila ada koreksi
            penting, gunakan tombol laporan pada halaman publik agar moderator dapat
            memeriksa.
          </p>
          <Link href="/dashboard/kontribusi" className="mt-2 inline-block text-primary underline">
            Kembali ke daftar
          </Link>
        </div>
      ) : (
        <ContributionForm
          mode="edit"
          programId={program.id}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          duplicates={duplicates}
          initialValues={{
            title: program.title,
            description: program.description,
            categoryId: program.categoryId,
            accessType: program.accessType,
            provider: program.provider,
            freeTier: program.freeTier ?? "",
            freeTierAvailable: program.freeTierAvailable,
            requiresCard: program.requiresCard,
            priceInputPerMtok: program.priceInputPerMtok?.toString() ?? "",
            priceOutputPerMtok: program.priceOutputPerMtok?.toString() ?? "",
            rateLimitRpm: program.rateLimitRpm?.toString() ?? "",
            contextWindow: program.contextWindow?.toString() ?? "",
            requirements: program.requirements ?? "",
            integrationNotes: program.integrationNotes ?? "",
            promoStart: program.promoStart ?? "",
            promoEnd: program.promoEnd ?? "",
            contributorNote: program.contributorNote ?? "",
            sources:
              program.sources.length > 0
                ? program.sources.map((s) => ({
                    url: s.url,
                    title: s.title ?? "",
                    type: s.type,
                    isPrimary: s.isPrimary,
                  }))
                : [{ url: "", title: "", type: "dokumentasi_resmi", isPrimary: true }],
          }}
        />
      )}
    </div>
  );
}
