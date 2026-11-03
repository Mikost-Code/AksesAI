import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  anonClient,
  createTestUser,
  isLocalSupabaseUp,
  serviceClient,
  type TestUser,
} from "./helpers";

/**
 * Skenario 10–12 + dasar RLS:
 *  - member tidak bisa mengakses data admin/role lain
 *  - member tidak bisa mengubah role sendiri
 *  - pengguna tidak dapat melihat data privat pengguna lain
 */
describe("RLS — akses & eskalasi role", () => {
  let up = false;
  let memberA: TestUser;
  let memberB: TestUser;

  beforeAll(async () => {
    up = await isLocalSupabaseUp();
    if (!up) {
      console.warn("⚠ Supabase lokal tidak berjalan — tes RLS di-skip.");
      return;
    }
    memberA = await createTestUser("rlspa");
    memberB = await createTestUser("rlspb");
  });

  it("member hanya dapat membaca role miliknya sendiri", async () => {
    if (!up) return;
    const { data, error } = await memberA.client.from("user_roles").select("user_id, role");
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.every((row) => row.user_id === memberA.id)).toBe(true);
  });

  it("member tidak bisa mengubah role sendiri (insert/update/delete ditolak atau tanpa efek)", async () => {
    if (!up) return;

    const insertResult = await memberA.client
      .from("user_roles")
      .insert({ user_id: memberA.id, role: "admin" });
    // Tidak ada policy INSERT untuk klien → error RLS (42501) atau 0 baris.
    expect(insertResult.error || insertResult.data === null).toBeTruthy();

    const admin = serviceClient();
    const { data: checkInsert } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", memberA.id)
      .eq("role", "admin");
    expect(checkInsert ?? []).toHaveLength(0);

    const updateResult = await memberA.client
      .from("user_roles")
      .update({ role: "moderator" })
      .eq("user_id", memberA.id);
    expect(updateResult.error || updateResult.data === null).toBeTruthy();

    const deleteResult = await memberA.client
      .from("user_roles")
      .delete()
      .eq("user_id", memberA.id);
    expect(deleteResult.error || deleteResult.data === null).toBeTruthy();
  });

  it("member tidak bisa membaca audit log (moderation_logs)", async () => {
    if (!up) return;
    const { data, error } = await memberA.client.from("moderation_logs").select("id").limit(5);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("member tidak bisa membaca laporan milik pengguna lain", async () => {
    if (!up) return;
    const admin = serviceClient();
    const { data: category } = await admin.from("categories").select("id").limit(1).single();
    const programId = await seedProgram(admin, memberB.id, category!.id);
    await admin.from("reports").insert({
      program_id: programId,
      reporter_id: memberB.id,
      reason: "tidak_akurat",
      description: "Laporan milik member B untuk tes isolasi.",
    });

    const { data, error } = await memberA.client.from("reports").select("id, reporter_id");
    expect(error).toBeNull();
    expect((data ?? []).every((r) => r.reporter_id === memberA.id)).toBe(true);
  });

  it("pengguna anonim tidak bisa membaca draft/pending program", async () => {
    if (!up) return;
    const admin = serviceClient();
    const { data: category } = await admin.from("categories").select("id").limit(1).single();
    await seedProgram(admin, memberA.id, category!.id); // status draft

    const anon = anonClient();
    const { data, error } = await anon
      .from("assistance_programs")
      .select("id, status")
      .eq("contributor_id", memberA.id);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("service_role bypass RLS (baseline untuk pembuatan data uji)", async () => {
    if (!up) return;
    const admin = serviceClient();
    const { data, error } = await admin.from("categories").select("id").limit(1);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    if (!up) return;
    const admin = serviceClient();
    for (const user of [memberA, memberB]) {
      if (user) await admin.auth.admin.deleteUser(user.id).catch(() => undefined);
    }
  });
});

async function seedProgram(
  admin: ReturnType<typeof serviceClient>,
  contributorId: string,
  categoryId: string,
): Promise<string> {
  const slug = `tes-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await admin
    .from("assistance_programs")
    .insert({
      title: "Program uji RLS untuk isolasi data",
      slug,
      description:
        "Deskripsi uji yang cukup panjang untuk memenuhi batas minimal lima puluh karakter.",
      category_id: categoryId,
      organizer: "Organisasi Uji",
      contributor_id: contributorId,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}
