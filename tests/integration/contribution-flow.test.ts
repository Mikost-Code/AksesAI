import { beforeAll, describe, expect, it } from "vitest";

import { createTestUser, isLocalSupabaseUp, serviceClient, type TestUser } from "../rls/helpers";

/**
 * Integrasi alur kontribusi terhadap database NYATA.
 *
 * Menguji rantai yang dipakai Server Action:
 *   insert draft (RLS) → RPC submit → reviewer verify → tampil publik.
 *
 * Ini melengkapi tes unit skema (bentuk input) dan tes RLS (izin),
 * dengan menelusuri jalur bahagia end-to-end seperti yang dialami pengguna.
 */
describe("Integrasi — alur kontribusi → review → publik", () => {
  let up = false;
  let contributor: TestUser;
  let reviewer: TestUser;
  let categoryId: string;

  beforeAll(async () => {
    up = await isLocalSupabaseUp();
    if (!up) {
      console.warn("⚠ Supabase lokal tidak berjalan — tes integrasi di-skip.");
      return;
    }
    contributor = await createTestUser("flowcontrib");
    reviewer = await createTestUser("flowreview", ["reviewer"]);
    const admin = serviceClient();
    const { data } = await admin.from("categories").select("id").limit(1).single();
    categoryId = data!.id;
  });

  it("draft dibuat oleh kontributor dan tidak terlihat publik", async () => {
    if (!up) return;
    const slug = `integ-${Date.now().toString(36)}`;
    const { data, error } = await contributor.client
      .from("assistance_programs")
      .insert({
        title: "Bantuan Uji Integrasi Alur Kontribusi",
        slug,
        description:
          "Deskripsi uji integrasi yang cukup panjang untuk memenuhi batas minimal lima puluh karakter.",
        category_id: categoryId,
        organizer: "Org Uji",
        contributor_id: contributor.id,
        status: "draft",
      })
      .select("id, status")
      .single();

    expect(error).toBeNull();
    expect(data!.status).toBe("draft");

    // Publik (anon) tidak melihat draft.
    const { anonClient } = await import("../rls/helpers");
    const anon = anonClient();
    const { data: publicRows } = await anon
      .from("assistance_programs")
      .select("id")
      .eq("id", data!.id);
    expect(publicRows ?? []).toHaveLength(0);
  });

  it("submit tanpa sumber ditolak oleh RPC", async () => {
    if (!up) return;
    const slug = `integ-nosrc-${Date.now().toString(36)}`;
    const { data } = await contributor.client
      .from("assistance_programs")
      .insert({
        title: "Bantuan Uji Tanpa Sumber Sama Sekali",
        slug,
        description:
          "Deskripsi uji yang cukup panjang supaya memenuhi batas minimal lima puluh karakter.",
        category_id: categoryId,
        organizer: "Org Uji",
        contributor_id: contributor.id,
        status: "draft",
      })
      .select("id")
      .single();

    const { error } = await contributor.client.rpc("submit_program", {
      p_program_id: data!.id,
    });
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain("sumber");
  });

  it("submit dengan sumber → pending → reviewer verifikasi → publik", async () => {
    if (!up) return;
    const slug = `integ-full-${Date.now().toString(36)}`;
    const { data: program } = await contributor.client
      .from("assistance_programs")
      .insert({
        title: "Bantuan Uji Integrasi Lengkap Sampai Publik",
        slug,
        description:
          "Deskripsi uji integrasi lengkap yang cukup panjang untuk memenuhi batas minimal lima puluh karakter.",
        category_id: categoryId,
        organizer: "Org Uji",
        contributor_id: contributor.id,
        status: "draft",
      })
      .select("id")
      .single();

    const { error: srcError } = await contributor.client.from("sources").insert({
      program_id: program!.id,
      source_url: "https://contoh.go.id/integrasi",
      source_url_normalized: `https://contoh.go.id/integrasi-${program!.id}`,
      source_type: "situs_resmi",
      is_primary: true,
    });
    expect(srcError).toBeNull();

    const { error: submitError } = await contributor.client.rpc("submit_program", {
      p_program_id: program!.id,
    });
    expect(submitError).toBeNull();

    const { error: verifyError } = await reviewer.client.rpc("verify_program", {
      p_program_id: program!.id,
    });
    expect(verifyError).toBeNull();

    const { anonClient } = await import("../rls/helpers");
    const anon = anonClient();
    const { data: publicRow } = await anon
      .from("assistance_programs")
      .select("id, status, verified_at, reviewer_id")
      .eq("id", program!.id)
      .single();

    expect(publicRow!.status).toBe("verified");
    expect(publicRow!.verified_at).not.toBeNull();
    expect(publicRow!.reviewer_id).toBe(reviewer.id);
  });

  it("riwayat kontribusi tercatat (submit + verify)", async () => {
    if (!up) return;
    const admin = serviceClient();
    const { data } = await admin
      .from("contribution_history")
      .select("action")
      .order("created_at", { ascending: true })
      .limit(50);

    const actions = new Set((data ?? []).map((r) => r.action));
    expect(actions.has("submit")).toBe(true);
    expect(actions.has("verify")).toBe(true);
  });
});
