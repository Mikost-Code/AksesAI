import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Download, Search, Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { RoleBadge } from "@/components/admin/role-badge";
import { UserActions } from "@/components/admin/user-actions";
import { UserModerationHistory } from "@/components/admin/user-moderation-history";
import {
  FilterSelect,
  filterSelectClassName,
} from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser, hasAnyRole, isSuperAdmin } from "@/lib/auth/session";
import { listUserModerationHistory, listUsers } from "@/lib/admin/data";
import { adminUserSearchSchema } from "@/lib/validation/staff";
import { formatDateID } from "@/lib/utils";

export const metadata: Metadata = { title: "Pengguna & role", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; halaman?: string; peran?: string; blokir?: string }>;
}) {
  const current = await getCurrentUser();
  if (!current) return null;

  const params = await searchParams;
  const { page, search, peran, blokir } = adminUserSearchSchema.parse({
    page: params.halaman,
    search: params.q,
    peran: params.peran,
    blokir: params.blokir,
  });

  const { items, total, pageSize, contributions } = await listUsers({
    search,
    page,
    role: peran,
    banned: blokir === "diblokir" ? true : undefined,
  });

  // Riwayat moderasi hanya berguna untuk akun yang pernah ditindak. Memuatnya
  // untuk SEMUA pengguna berarti 50 query tambahan per halaman; dibatasi ke
  // pengguna yang sedang diblokir atau yang punya role staf (kandidat paling
  // sering ditindak). Pengguna biasa tanpa riwayat tidak perlu query.
  const historyCandidates = items.filter(
    (user) => user.isBanned || user.roles.some((role) => role !== "member"),
  );
  const historyEntries = await Promise.all(
    historyCandidates.map(async (user) => [
      user.id,
      await listUserModerationHistory(user.id, 10),
    ] as const),
  );
  const moderationHistory = new Map(historyEntries);

  const canManageRoles = isSuperAdmin(current);
  const canBan = hasAnyRole(current, ["moderator", "admin"]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function href(targetPage: number): string {
    const sp = new URLSearchParams();
    if (search) sp.set("q", search);
    if (peran !== "semua") sp.set("peran", peran);
    if (blokir === "diblokir") sp.set("blokir", "diblokir");
    if (targetPage > 1) sp.set("halaman", String(targetPage));
    const qs = sp.toString();
    return qs ? `/admin/pengguna?${qs}` : "/admin/pengguna";
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pengguna &amp; peran</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} pengguna terdaftar. Semua perubahan role &amp; blokir tercatat pada audit
            log yang tidak dapat diubah.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManageRoles ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-soft px-3 py-1 text-xs font-medium text-violet">
              Anda pemilik — dapat mengelola role
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Pengelolaan role hanya oleh pemilik (Super Admin)
            </span>
          )}
          <a
            href="/api/admin/export?tipe=pengguna"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </a>
        </div>
      </div>

      <form action="/admin/pengguna" method="get" className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Cari username
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="mis. budi"
            className="h-10 w-56"
            maxLength={100}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="peran" className="text-xs font-medium text-muted-foreground">
            Peran
          </label>
          <FilterSelect
            id="peran"
            name="peran"
            label="Peran"
            value={peran}
            className={filterSelectClassName}
            options={[
              { value: "semua", label: "Semua peran" },
              { value: "member", label: "Anggota" },
              { value: "reviewer", label: "Reviewer" },
              { value: "moderator", label: "Moderator" },
              { value: "admin", label: "Admin" },
              { value: "super_admin", label: "Super Admin" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="blokir" className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <FilterSelect
            id="blokir"
            name="blokir"
            label="Status"
            value={blokir}
            className={filterSelectClassName}
            options={[
              { value: "semua", label: "Semua status" },
              { value: "diblokir", label: "Diblokir" },
            ]}
          />
        </div>
        <button type="submit" className={buttonVariants({ size: "default" })}>
          <Search className="size-4" aria-hidden="true" />
          Terapkan
        </button>
        {search || peran !== "semua" || blokir !== "semua" ? (
          <Link href="/admin/pengguna" className={buttonVariants({ variant: "secondary" })}>
            Reset
          </Link>
        ) : null}
      </form>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((user) => {
            const staffRoles = user.roles.filter((r) => r !== "member");
            return (
              <li key={user.id}>
                <article className="card-accent rounded-xl border border-border bg-background p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      {user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="size-10 shrink-0 rounded-full ring-1 ring-border"
                        />
                      ) : (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold text-muted-foreground ring-1 ring-border">
                          {user.username.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/kontributor/${user.username}`}
                          className="block truncate font-medium hover:text-primary hover:underline"
                        >
                          {user.username}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Bergabung {formatDateID(user.createdAt)}
                          {contributions[user.id] ? (
                            <>
                              {" · "}
                              <span className="font-medium text-foreground/80">
                                {contributions[user.id]} kontribusi
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {user.isBanned ? (
                        <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                          Diblokir
                        </span>
                      ) : null}
                      {staffRoles.length > 0 ? (
                        staffRoles.map((role) => (
                          <RoleBadge key={role} role={role} />
                        ))
                      ) : (
                        <RoleBadge role="member" />
                      )}
                    </div>
                  </div>

                  <UserActions
                    userId={user.id}
                    username={user.username}
                    roles={user.roles}
                    isBanned={user.isBanned}
                    isSelf={user.id === current.id}
                    canManageRoles={canManageRoles}
                    canBan={canBan}
                  />

                  <UserModerationHistory entries={moderationHistory.get(user.id) ?? []} />
                </article>
              </li>
            );
          })}
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
              <Link href={href(page - 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Sebelumnya
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link href={href(page + 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Berikutnya
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
