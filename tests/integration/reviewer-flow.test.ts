import { beforeAll, describe, expect, it } from "vitest";

import { createTestUser, isLocalSupabaseUp, serviceClient, type TestUser } from "../rls/helpers";

/**
 * Integrasi alur REVIEWER terhadap database nyata (PHASE 5).
 *
 * Menguji RPC yang dipanggil Server Action reviewer:
 *  - hanya reviewer yang boleh klaim/verifikasi,
 *  - reviewer tidak boleh meninjau kontribusi sendiri,
 *  - klaim aktif memblokir reviewer lain,
 *  - request_changes/reject mewajibkan alasan,
 *  - cron `expire_due_programs` menandai program lewat tanggal.
 *
 * Catatan: pembuatan program pending memakai KONTRIBUTOR BARU tiap kali,
 * karena RPC `submit_program` membatasi kontributor baru maksimal 3 kiriman
 * dalam peninjauan sekaligus (aturan produk yang memang diuji di RLS).
 */
describe("Integrasi — reviewer workflow", () => {
  let up = false;
  let contributor: TestUser;
  let reviewer: TestUser;
  let reviewer2: TestUser;
  let categoryId: string;

  beforeAll(async () => {
    up = await isLocalSupabaseUp();
    if (!up) {
      console.warn("⚠ Supabase lokal tidak berjalan — tes reviewer di-skip.");
      return;
    }
    contributor = await createTestUser("revcontrib");
    reviewer = await createTestUser("revone", ["reviewer"]);
    reviewer2 = await createTestUser("revtwo", ["reviewer"]);
    const admin = serviceClient();
    const { data } = await admin.from("categories").select("id").limit(1).single();
    categoryId = data!.id;
  });

  async function makePending(owner: TestUser | null, label: string): Promise<string> {
    // Setiap kiriman memakai kontributor baru agar tidak terhalang aturan
    // "kontributor baru maksimal 3 kontribusi dalam peninjauan".
    const contributorUser = owner ?? (await createTestUser(`revc${label}`.slice(0, 12)));
    const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const { data } = await contributorUser.client
      .from("assistance_programs")
      .insert({
        title: `Program Uji Reviewer ${label}`,
        slug: `rev-${label}-${unique}`,
        description:
          "Deskripsi pengujian alur reviewer yang cukup panjang melebihi lima puluh karakter.",
        category_id: categoryId,
        organizer: "Org Uji Reviewer",
        contributor_id: contributorUser.id,
        status: "draft",
      })
      .select("id")
      .single();
    await contributorUser.client.from("sources").insert({
      program_id: data!.id,
      source_url: `https://contoh.go.id/${label}-${unique}`,
      source_url_normalized: `https://contoh.go.id/${label}-${unique}`,
      source_type: "dokumentasi_resmi",
      is_primary: true,
    });
    const { error } = await contributorUser.client.rpc("submit_program", {
      p_program_id: data!.id,
    });
    expect(error).toBeNull();
    return data!.id;
  }

  it("member biasa tidak dapat mengklaim item review", async () => {
    if (!up) return;
    const id = await makePending(null, "memberclaim");
    const { error } = await contributor.client.rpc("claim_program", { p_program_id: id });
    expect(error).not.toBeNull();
  });

  it("reviewer dapat mengklaim, lalu reviewer lain terblokir", async () => {
    if (!up) return;
    const id = await makePending(null, "claim");

    const { error: claim1 } = await reviewer.client.rpc("claim_program", { p_program_id: id });
    expect(claim1).toBeNull();

    const { error: claim2 } = await reviewer2.client.rpc("claim_program", {
      p_program_id: id,
    });
    expect(claim2).not.toBeNull();
    expect(claim2!.message.toLowerCase()).toContain("reviewer lain");
  });

  it("reviewer tidak dapat meninjau kontribusi miliknya sendiri", async () => {
    if (!up) return;
    // Reviewer membuat kontribusi sendiri lalu mengirimnya.
    const id = await makePending(reviewer, "ownsub");
    const { error } = await reviewer.client.rpc("verify_program", { p_program_id: id });
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain("sendiri");
  });

  it("request_changes menolak alasan terlalu pendek", async () => {
    if (!up) return;
    const id = await makePending(null, "shortreason");
    const { error } = await reviewer.client.rpc("request_changes", {
      p_program_id: id,
      p_reason: "kurang",
    });
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain("20 karakter");
  });

  it("request_changes dengan alasan valid → needs_changes + tercatat", async () => {
    if (!up) return;
    const id = await makePending(null, "changes");
    const reason = "Sumber tidak dapat dibuka dan judul tidak sesuai isi halaman.";
    const { error } = await reviewer.client.rpc("request_changes", {
      p_program_id: id,
      p_reason: reason,
    });
    expect(error).toBeNull();

    const admin = serviceClient();
    const { data } = await admin
      .from("assistance_programs")
      .select("status, review_note")
      .eq("id", id)
      .single();
    expect(data!.status).toBe("needs_changes");
    expect(data!.review_note).toBe(reason);
  });

  it("reject_program memindahkan ke rejected dan mencatat audit", async () => {
    if (!up) return;
    const id = await makePending(null, "reject");
    const { error } = await reviewer.client.rpc("reject_program", {
      p_program_id: id,
      p_reason: "Informasi palsu: penyelenggara tidak dikenal dan sumber fiktif.",
    });
    expect(error).toBeNull();

    const admin = serviceClient();
    const { data } = await admin
      .from("assistance_programs")
      .select("status")
      .eq("id", id)
      .single();
    expect(data!.status).toBe("rejected");

    const { data: logs } = await admin
      .from("moderation_logs")
      .select("action")
      .eq("target_id", id);
    expect((logs ?? []).some((l) => l.action === "program.reject")).toBe(true);
  });

  it("reviewer dapat memverifikasi item pending milik kontributor lain", async () => {
    if (!up) return;
    const id = await makePending(null, "verify");
    const { error } = await reviewer.client.rpc("verify_program", { p_program_id: id });
    expect(error).toBeNull();

    const admin = serviceClient();
    const { data } = await admin
      .from("assistance_programs")
      .select("status, verified_at")
      .eq("id", id)
      .single();
    expect(data!.status).toBe("verified");
    expect(data!.verified_at).not.toBeNull();
  });

  it("expire_due_programs menandai program terverifikasi yang lewat promo_end", async () => {
    if (!up) return;
    const admin = serviceClient();
    const id = await makePending(null, "expire");
    // Verifikasi lalu paksa promo_end ke masa lalu (service_role).
    // CATATAN: cron membaca promo_end, BUKAN end_date legacy — lihat migrasi
    // 0008 yang mengganti kolom yang dibaca (0007 masih memakai end_date).
    await reviewer.client.rpc("verify_program", { p_program_id: id });
    await admin
      .from("assistance_programs")
      .update({ promo_end: "2020-01-01" })
      .eq("id", id);

    const { error } = await admin.rpc("expire_due_programs");
    expect(error).toBeNull();

    const { data } = await admin
      .from("assistance_programs")
      .select("status")
      .eq("id", id)
      .single();
    expect(data!.status).toBe("expired");
  });
});
