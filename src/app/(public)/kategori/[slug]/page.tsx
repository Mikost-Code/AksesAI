import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { ProgramCard } from "@/components/program-card";
import { getCategories } from "@/lib/programs/categories";
import { getDirectory } from "@/lib/programs/queries";
import { directorySearchSchema } from "@/lib/validation/search";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return { title: "Kategori tidak ditemukan", robots: { index: false } };
  return {
    title: `Kategori ${category.name}`,
    description:
      category.description ??
      `Informasi bantuan sosial kategori ${category.name} yang telah diverifikasi.`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();

  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const directory = await getDirectory(
    directorySearchSchema.parse({ kategori: slug }),
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Beranda
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href="/bansos" className="hover:text-foreground">
          Direktori
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-foreground">{category.name}</span>
      </nav>

      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{category.name}</h1>
      {category.description ? (
        <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
      ) : null}

      <p className="mt-4 text-sm text-muted-foreground">
        {directory.configured
          ? `${directory.total} informasi terverifikasi`
          : "Direktori belum terhubung ke sumber data"}
      </p>

      {directory.items.length > 0 ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {directory.items.map((program) => (
            <li key={program.id}>
              <ProgramCard program={program} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="Belum ada informasi di kategori ini"
            description="Bagikan informasi yang Anda temukan dengan sumber yang jelas, atau jelajahi kategori lain di direktori."
            action={{ label: "Buka direktori", href: "/bansos" }}
          />
        </div>
      )}
    </div>
  );
}
