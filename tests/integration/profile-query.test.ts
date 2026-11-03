import { beforeAll, describe, expect, it } from "vitest";

import { anonClient, createTestUser, isLocalSupabaseUp, type TestUser } from "../rls/helpers";

/**
 * Regresi: query profil + role yang dipakai `getCurrentUser()`.
 *
 * Bug nyata yang pernah terjadi: PostgREST menolak embed `user_roles(role)`
 * karena `user_roles` punya DUA foreign key ke `profiles` (user_id & assigned_by)
 * sehingga relasinya ambigu. Akibatnya `getCurrentUser()` mengembalikan null
 * untuk SEMUA pengguna dan seluruh area login tidak dapat diakses.
 *
 * Tes ini menembak query yang sama lewat PostgREST nyata (bukan mock) supaya
 * ambiguitas relasi langsung ketahuan.
 */
describe("Regresi — query profil & role pengguna", () => {
  let up = false;
  let user: TestUser;

  beforeAll(async () => {
    up = await isLocalSupabaseUp();
    if (!up) {
      console.warn("⚠ Supabase lokal tidak berjalan — tes regresi profil di-skip.");
      return;
    }
    user = await createTestUser("profile");
  });

  it("embed user_roles!user_id(role) tidak ambigu dan mengembalikan role member", async () => {
    if (!up) return;
    const { data, error } = await user.client
      .from("profiles")
      .select("id, github_username, is_banned, user_roles!user_id(role)")
      .eq("id", user.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.github_username).toBe(user.username);
    expect(data!.is_banned).toBe(false);
    const roles = (data!.user_roles as Array<{ role: string }>).map((r) => r.role);
    expect(roles).toContain("member");
  });

  it("embed lama (tanpa nama FK) memang ambigu — dokumentasi perilaku PostgREST", async () => {
    if (!up) return;
    const { error } = await user.client
      .from("profiles")
      .select("id, user_roles(role)")
      .eq("id", user.id)
      .maybeSingle();

    // Bila suatu saat Supabase/PostgREST memilih relasi secara otomatis,
    // tes ini akan gagal — sinyal untuk meninjau ulang query di session.ts.
    expect(error?.message ?? "").toContain("more than one relationship");
  });

  it("profil publik memang dapat dibaca pengguna lain (dibutuhkan halaman kontributor)", async () => {
    if (!up) return;
    const other = await createTestUser("otherprof");
    const { data, error } = await other.client
      .from("profiles")
      .select("id, github_username")
      .eq("id", user.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(user.id);
  });

  it("anon dapat membaca profil publik (halaman /kontributor/[username])", async () => {
    if (!up) return;
    const anon = anonClient();
    const { data } = await anon.from("profiles").select("id").eq("id", user.id);
    expect(data ?? []).toHaveLength(1);
  });

  it("pengguna lain TIDAK dapat membaca role pengguna lain (user_roles hanya milik sendiri)", async () => {
    if (!up) return;
    const other = await createTestUser("otherrole");
    const { data } = await other.client
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    expect(data ?? []).toHaveLength(0);
  });
});
