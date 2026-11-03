import type { Metadata } from "next";
import Link from "next/link";

import { ContributionForm, EMPTY_CONTRIBUTION } from "@/components/dashboard/contribution-form";
import { getCategories } from "@/lib/programs/categories";

export const metadata: Metadata = {
  title: "Bagikan informasi",
  robots: { index: false },
};

export default async function NewContributionPage() {
  const categories = await getCategories();

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/dashboard/kontribusi" className="hover:text-foreground">
          Kontribusi saya
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-foreground">Baru</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold">Bagikan informasi bantuan sosial</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Tulis informasi yang Anda temukan dari sumber resmi. Reviewer akan
          memeriksa manual sebelum diterbitkan. Anda dapat menyimpan sebagai draf
          lebih dulu.
        </p>
      </div>

      <ContributionForm
        mode="create"
        programId={null}
        initialValues={EMPTY_CONTRIBUTION}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
