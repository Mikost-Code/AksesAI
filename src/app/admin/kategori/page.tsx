import type { Metadata } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";

import { CategoryForm } from "@/components/admin/category-form";
import { CategoryRowEditor } from "@/components/admin/category-row-editor";
import { EmptyState } from "@/components/empty-state";
import { listCategoriesForAdmin } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Kategori", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesForAdmin();
  const activeCount = categories.filter((c) => c.isActive).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Kategori</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {categories.length} kategori · {activeCount} aktif. Kategori nonaktif
          disembunyikan dari halaman publik tetapi kontribusi lama tetap tersimpan.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Tambah kategori</h2>
        <CategoryForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Daftar kategori</h2>
        {categories.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {categories.map((category) => (
              <li key={category.id}>
                <article className="card-accent rounded-xl border border-border bg-background p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{category.name}</h3>
                        <code className="rounded bg-surface px-1.5 py-0.5 text-xs text-muted-foreground">
                          {category.slug}
                        </code>
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            category.isActive
                              ? "bg-accent-soft text-accent"
                              : "bg-surface text-muted-foreground",
                          ].join(" ")}
                        >
                          {category.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      {category.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Urutan {category.sortOrder} · {category.programCount} program ·{" "}
                        <Link
                          href={`/kategori/${category.slug}`}
                          className="text-primary hover:underline"
                        >
                          lihat publik
                        </Link>
                      </p>
                    </div>
                    <CategoryRowEditor
                      category={{
                        id: category.id,
                        name: category.name,
                        slug: category.slug,
                        description: category.description ?? "",
                        isActive: category.isActive,
                        sortOrder: category.sortOrder,
                      }}
                    />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Belum ada kategori"
            description="Buat kategori pertama menggunakan formulir di atas."
            icon={<Settings className="size-6" aria-hidden="true" />}
          />
        )}
      </section>
    </div>
  );
}
