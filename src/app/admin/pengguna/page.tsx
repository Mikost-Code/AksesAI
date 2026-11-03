import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { UserActions } from "@/components/admin/user-actions";
import { getCurrentUser } from "@/lib/auth/session";
import { listUsers } from "@/lib/admin/data";
import { APP_ROLE_LABEL } from "@/lib/constants/labels";
import { adminUserSearchSchema } from "@/lib/validation/staff";
import { formatDateID } from "@/lib/utils";

export const metadata: Metadata = { title: "Pengguna & role", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; halaman?: string }>;
}) {
  const current = await getCurrentUser();
  if (!current) return null;

  const params = await searchParams;
  const { page, search } = adminUserSearchSchema.parse({
    page: params.halaman,
    search: params.q,
  });

  const { items, total, pageSize } = await listUsers({ search, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function href(targetPage: number): string {
    const sp = new URLSearchParams();
    if (search) sp.set("q", search);
    if (targetPage > 1) sp.set("halaman", String(targetPage));
    const qs = sp.toString();
    return qs ? `/admin/pengguna?${qs}` : "/admin/pengguna";
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Pengguna & peran</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} pengguna terdaftar. Pemberian role dan blokir dilakukan lewat RPC
          teraudit; admin terakhir tidak dapat dicabut.
        </p>
      </div>

      <form action="/admin/pengguna" method="get" className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Cari username
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="mis. budi"
            className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Search className="size-4" aria-hidden="true" />
          Cari
        </button>
        {search ? (
          <Link
            href="/admin/pengguna"
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm hover:bg-surface"
          >
            Reset
          </Link>
        ) : null}
      </form>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((user) => (
            <li key={user.id}>
              <article className="rounded-lg border border-border bg-background p-4 shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold text-muted-foreground">
                      {user.username.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/kontributor/${user.username}`}
                        className="block truncate font-medium hover:underline"
                      >
                        {user.username}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Bergabung {formatDateID(user.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {user.isBanned ? (
                      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                        Diblokir
                      </span>
                    ) : null}
                    {user.roles.includes("admin") ? (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
                        {APP_ROLE_LABEL.admin}
                      </span>
                    ) : null}
                  </div>
                </div>

                <UserActions
                  userId={user.id}
                  username={user.username}
                  roles={user.roles}
                  isBanned={user.isBanned}
                  isSelf={user.id === current.id}
                />
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Tidak ada pengguna"
          description={
            search
              ? `Tidak ada pengguna dengan username mengandung "${search}".`
              : "Belum ada pengguna terdaftar."
          }
          icon={<Users className="size-6" aria-hidden="true" />}
        />
      )}

      {totalPages > 1 ? (
        <nav aria-label="Navigasi halaman" className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={href(page - 1)}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
              >
                Sebelumnya
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={href(page + 1)}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
              >
                Berikutnya
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
