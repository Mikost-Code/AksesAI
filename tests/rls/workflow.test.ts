import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestUser, isLocalSupabaseUp, serviceClient, type TestUser } from "./helpers";

/**
 * Skenario 2–7 (alur kontribusi & review) diverifikasi di level database:
 *  - pembuatan program selalu draft
 *  - submit → pending, tidak otomatis verified
 *  - reviewer TIDAK BISA memverifikasi kontribusi sendiri
 *  - reviewer lain dapat verifikasi, menyetujui, minta revisi, menolak
 */
describe("RLS — alur kontribusi & review", () => {
  let up = false;
  let contributor: TestUser;
  let reviewer: TestUser;
  let reviewerSelf: TestUser; // reviewer yang juga kontributor
  let categoryId: string;
  const created: string[] = [];

  async function newProgram(contributorId: string, title: string): Promise<string> {
    const admin = serviceClient();
    const slug = `uji-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { data, error } = await admin
      .from("assistance_programs")
      .insert({
        title,
        slug,
        description:
          "Deskripsi uji alur kontribusi yang cukup panjang untuk memenuhi batas minimal karakter.",
        category_id: categoryId,
        organizer: "Organisasi Uji",
        contributor_id: contributorId,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    created.push(data.id);
    await admin.from("sources").insert({
      program_id: data.id,
      source_url: "https://contoh.go.id/pengumuman",
      source_url_normalized: `https://contoh.go.id/pengumuman-${data.id}`,
      source_title: "Pengumuman resmi",
      source_type: "situs_resmi",
      is_primary: true,
    });
    return data.id;
  }

  beforeAll(async () => {
    up = await isLocalSupabaseUp();
    if (!up) {
      console.warn("⚠ Supabase lokal tidak berjalan — tes RLS di-skip.");
      return;
    }
    contributor = await createTestUser("contrib");
    reviewer = await createTestUser("reviewer", ["reviewer"]);
    reviewerSelf = await createTestUser("reviewerself", ["reviewer"]);
    const admin = serviceClient();
    const { data } = await admin.from("categories").select("id").limit(1).single();
    categoryId = data!.id;
  });

  it("submit_program mengubah status ke pending (tidak otomatis verified)", async () => {
    if (!up) return;
    const id = await newProgram(contributor.id, "Program uji submit status pending");

    const { error } = await contributor.client.rpc("submit_program", { p_program_id: id });
    expect(error).toBeNull();

    const admin = serviceClient();
    const { data } = await admin.from("assistance_programs").select("status").eq("id", id).single();
    expect(data!.status).toBe("pending");
  });

  it("reviewer tidak dapat memverifikasi kontribusi miliknya sendiri", async () => {
    if (!up) return;
    const id = await newProgram(reviewerSelf.id, "Program milik reviewer sendiri");
    await reviewerSelf.client.rpc("submit_program", { p_program_id: id });

    const { error } = await reviewerSelf.client.rpc("verify_program", { p_program_id: id });
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain("sendiri");

    const admin = serviceClient();
    const { data } = await admin.from("assistance_programs").select("status").eq("id", id).single();
    expect(data!.status).toBe("pending");
  });

  it("reviewer lain dapat meminta revisi lalu verifikasi", async () => {
    if (!up) return;
    const id = await newProgram(contributor.id, "Program uji alur revisi reviewer");
    await contributor.client.rpc("submit_program", { p_program_id: id });

    // Alasan terlalu pendek ditolak
    const tooShort = await reviewer.client.rpc("request_changes", {
      p_program_id: id,
      p_reason: "pendek",
    });
    expect(tooShort.error).not.toBeNull();

    const requested = await reviewer.client.rpc("request_changes", {
      p_program_id: id,
      p_reason: "Tautan sumber saat ini tidak dapat dibuka, mohon diperbarui.",
    });
    expect(requested.error).toBeNull();

    // Kontributor memperbaiki & submit ulang
    const resubmit = await contributor.client.rpc("submit_program", { p_program_id: id });
    expect(resubmit.error).toBeNull();

    const verified = await reviewer.client.rpc("verify_program", { p_program_id: id });
    expect(verified.error).toBeNull();

    const admin = serviceClient();
    const { data } = await admin.from("assistance_programs").select("status").eq("id", id).single();
    expect(data!.status).toBe("verified");
  });

  it("kontributor hanya dapat mengubah kontribusi miliknya sendiri", async () => {
    if (!up) return;
    const id = await newProgram(reviewerSelf.id, "Program milik reviewerSelf bukan contributor");

    const { data, error } = await contributor.client
      .from("assistance_programs")
      .update({ title: "Percobaan mengubah judul orang lain yang panjang" })
      .eq("id", id)
      .select("id");

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0); // RLS menyaring: tidak ada baris terpengaruh
  });

  it("kontributor tidak dapat mengubah status langsung lewat UPDATE", async () => {
    if (!up) return;
    const id = await newProgram(contributor.id, "Program uji larangan ubah status langsung");

    const { error } = await contributor.client
      .from("assistance_programs")
      .update({ status: "verified" })
      .eq("id", id);
    expect(error).not.toBeNull();

    const admin = serviceClient();
    const { data } = await admin.from("assistance_programs").select("status").eq("id", id).single();
    expect(data!.status).toBe("draft");
  });

  it("program terverifikasi muncul untuk publik", async () => {
    if (!up) return;
    const id = await newProgram(contributor.id, "Program uji tampil publik setelah verifikasi");
    await contributor.client.rpc("submit_program", { p_program_id: id });
    await reviewer.client.rpc("verify_program", { p_program_id: id });

    const anon = (await import("./helpers")).anonClient();
    const { data, error } = await anon.from("assistance_programs").select("id").eq("id", id);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(1);
  });

  afterAll(async () => {
    if (!up) return;
    const admin = serviceClient();
    for (const user of [contributor, reviewer, reviewerSelf]) {
      if (user) await admin.auth.admin.deleteUser(user.id).catch(() => undefined);
    }
  });
});
