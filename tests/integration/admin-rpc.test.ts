import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestUser, isLocalSupabaseUp, serviceClient, type TestUser } from "../rls/helpers";

/**
 * Integrasi admin terhadap database nyata.
 *
 * Menguji RPC yang dipanggil Server Action `/admin` dengan model
 * super_admin (pemilik):
 *  - member & admin biasa tidak boleh memberi/mencabut role (khusus pemilik),
 *  - super_admin memberi/cabut role & tercatat di audit log,
 *  - akun pemilik (super_admin) tidak dapat dicabut role-nya atau diblokir,
 *  - admin hanya dapat diblokir oleh pemilik,
 *  - blokir/buka blokir memerlukan alasan ≥ 10 karakter,
 *  - upsert_category tetap dapat dilakukan admin biasa.
 */
describe("Integrasi — admin RPC", () => {
  let up = false;
  let owner: TestUser; // super_admin (pemilik)
  let admin: TestUser; // admin biasa
  let admin2: TestUser; // admin biasa kedua (uji blokir admin)
  let member: TestUser;
  let target: TestUser;
  const createdCategorySlugs: string[] = [];

  beforeAll(async () => {
    up = await isLocalSupabaseUp();
    if (!up) {
      console.warn("⚠ Supabase lokal tidak berjalan — tes admin di-skip.");
      return;
    }
    owner = await createTestUser("owner", ["super_admin"]);
    admin = await createTestUser("adm", ["admin"]);
    admin2 = await createTestUser("adm2", ["admin"]);
    member = await createTestUser("admmember");
    target = await createTestUser("admtarget");
  });

  afterAll(async () => {
    if (!up) return;
    const svc = serviceClient();
    for (const slug of createdCategorySlugs) {
      await svc.from("categories").delete().eq("slug", slug);
    }
    // Kembalikan status blokir semua target.
    for (const user of [target, admin2]) {
      await svc.from("profiles").update({ is_banned: false }).eq("id", user.id);
    }
    // Bersihkan role super_admin sementara pada target (jika masih ada).
    await svc.from("user_roles").delete().eq("user_id", target.id).eq("role", "super_admin");
  });

  it("member biasa tidak dapat memberi role (require_staff menolak)", async () => {
    if (!up) return;
    const { error } = await member.client.rpc("grant_role", {
      p_user_id: target.id,
      p_role: "reviewer",
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });

  it("admin biasa tidak dapat memberi role — khusus pemilik", async () => {
    if (!up) return;
    const { error } = await admin.client.rpc("grant_role", {
      p_user_id: target.id,
      p_role: "reviewer",
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });

  it("pemilik dapat memberi role reviewer, tercatat di audit log", async () => {
    if (!up) return;
    const { error } = await owner.client.rpc("grant_role", {
      p_user_id: target.id,
      p_role: "reviewer",
    });
    expect(error).toBeNull();

    const svc = serviceClient();
    const { data: roles } = await svc
      .from("user_roles")
      .select("role")
      .eq("user_id", target.id);
    expect((roles ?? []).map((r) => r.role)).toContain("reviewer");

    const { data: logs } = await svc
      .from("moderation_logs")
      .select("action, target_id")
      .eq("target_id", target.id)
      .eq("action", "role.grant");
    expect((logs ?? []).length).toBeGreaterThan(0);
  });

  it("member tidak dapat mencabut role", async () => {
    if (!up) return;
    const { error } = await member.client.rpc("revoke_role", {
      p_user_id: target.id,
      p_role: "reviewer",
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });

  it("admin biasa tidak dapat mencabut role — khusus pemilik", async () => {
    if (!up) return;
    const { error } = await admin.client.rpc("revoke_role", {
      p_user_id: target.id,
      p_role: "reviewer",
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });

  it("pemilik dapat mencabut role reviewer", async () => {
    if (!up) return;
    const { error } = await owner.client.rpc("revoke_role", {
      p_user_id: target.id,
      p_role: "reviewer",
    });
    expect(error).toBeNull();

    const svc = serviceClient();
    const { data: roles } = await svc
      .from("user_roles")
      .select("role")
      .eq("user_id", target.id);
    expect((roles ?? []).map((r) => r.role)).not.toContain("reviewer");
  });

  it("role milik pemilik (super_admin) tidak dapat dicabut lewat aplikasi", async () => {
    if (!up) return;
    const svc = serviceClient();
    // Beri role super_admin sementara pada target (hanya bisa lewat service_role).
    const { error: insertErr } = await svc
      .from("user_roles")
      .insert({ user_id: target.id, role: "super_admin" });
    if (insertErr) throw new Error(`Insert super_admin gagal: ${insertErr.message}`);

    const { error } = await owner.client.rpc("revoke_role", {
      p_user_id: target.id,
      p_role: "reviewer",
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
    expect(error!.message.toLowerCase()).toContain("pemilik");

    // Pemulihan isolasi: lepas kembali role sementara agar test berikutnya
    // melihat target sebagai pengguna biasa.
    const { error: cleanupErr } = await svc
      .from("user_roles")
      .delete()
      .eq("user_id", target.id)
      .eq("role", "super_admin");
    if (cleanupErr) throw new Error(`Cleanup super_admin gagal: ${cleanupErr.message}`);
  });

  it("pemilik tidak dapat mencabut role milik diri sendiri lewat RPC", async () => {
    if (!up) return;
    const { error } = await owner.client.rpc("revoke_role", {
      p_user_id: owner.id,
      p_role: "super_admin",
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
    expect(error!.message.toLowerCase()).toContain("pemilik");
  });

  it("blokir memerlukan alasan minimal 10 karakter", async () => {
    if (!up) return;
    const { error } = await admin.client.rpc("set_user_banned", {
      p_user_id: target.id,
      p_banned: true,
      p_reason: "pendek",
    });
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain("10 karakter");
  });

  it("admin dapat memblokir lalu membuka blokir pengguna biasa", async () => {
    if (!up) return;
    const { error: banErr } = await admin.client.rpc("set_user_banned", {
      p_user_id: target.id,
      p_banned: true,
      p_reason: "Mengirim kontribusi palsu berulang kali.",
    });
    expect(banErr).toBeNull();

    const svc = serviceClient();
    let { data } = await svc.from("profiles").select("is_banned").eq("id", target.id).single();
    expect(data!.is_banned).toBe(true);

    const { error: unbanErr } = await admin.client.rpc("set_user_banned", {
      p_user_id: target.id,
      p_banned: false,
      p_reason: "Banding diterima, pelanggaran tidak terbukti.",
    });
    expect(unbanErr).toBeNull();
    ({ data } = await svc.from("profiles").select("is_banned").eq("id", target.id).single());
    expect(data!.is_banned).toBe(false);
  });

  it("admin biasa tidak dapat memblokir admin lain — khusus pemilik", async () => {
    if (!up) return;
    const { error } = await admin.client.rpc("set_user_banned", {
      p_user_id: admin2.id,
      p_banned: true,
      p_reason: "Percobaan blokir admin oleh admin biasa.",
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
    expect(error!.message.toLowerCase()).toContain("pemilik");
  });

  it("pemilik dapat memblokir admin, tetapi tidak akunnya sendiri", async () => {
    if (!up) return;
    const svc = serviceClient();

    const { error: banErr } = await owner.client.rpc("set_user_banned", {
      p_user_id: admin2.id,
      p_banned: true,
      p_reason: "Pemilik memblokir admin setelah insiden terverifikasi.",
    });
    expect(banErr).toBeNull();
    const { data } = await svc.from("profiles").select("is_banned").eq("id", admin2.id).single();
    expect(data!.is_banned).toBe(true);

    const { error: unbanErr } = await owner.client.rpc("set_user_banned", {
      p_user_id: admin2.id,
      p_banned: false,
      p_reason: "Sanksi selesai, admin dipulihkan oleh pemilik.",
    });
    expect(unbanErr).toBeNull();

    // Pemilik kebal blokir — bahkan oleh dirinya sendiri lewat RPC.
    // Blokir-diri ditolak lebih dulu (pesan "akun sendiri"); blokir oleh
    // pihak lain ditolak oleh penjagaan super_admin ("Pemilik ... diblokir").
    const { error: selfBanErr } = await owner.client.rpc("set_user_banned", {
      p_user_id: owner.id,
      p_banned: true,
      p_reason: "Uji proteksi pemilik terhadap blokir.",
    });
    expect(selfBanErr).not.toBeNull();
    expect(selfBanErr!.code).toBe("42501");
    expect(selfBanErr!.message.toLowerCase()).toContain("sendiri");
  });

  it("member tidak dapat membuat kategori", async () => {
    if (!up) return;
    const slug = `uji-member-${Date.now().toString(36)}`;
    const { error } = await member.client.rpc("upsert_category", {
      p_id: null,
      p_name: "Kategori Uji Member",
      p_slug: slug,
      p_description: null,
      p_is_active: true,
      p_sort_order: 99,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });

  it("admin dapat membuat lalu memperbarui kategori", async () => {
    if (!up) return;
    const slug = `uji-admin-${Date.now().toString(36)}`;
    createdCategorySlugs.push(slug);

    const { data: newId, error: createErr } = await admin.client.rpc("upsert_category", {
      p_id: null,
      p_name: "Kategori Uji Admin",
      p_slug: slug,
      p_description: "Dibuat oleh tes integrasi.",
      p_is_active: true,
      p_sort_order: 42,
    });
    expect(createErr).toBeNull();
    expect(newId).toBeTruthy();

    const { error: updateErr } = await admin.client.rpc("upsert_category", {
      p_id: newId as string,
      p_name: "Kategori Uji Admin Diperbarui",
      p_slug: slug,
      p_description: "Sudah diperbarui.",
      p_is_active: false,
      p_sort_order: 7,
    });
    expect(updateErr).toBeNull();

    const svc = serviceClient();
    const { data } = await svc
      .from("categories")
      .select("name, is_active, sort_order")
      .eq("id", newId as string)
      .single();
    expect(data!.name).toBe("Kategori Uji Admin Diperbarui");
    expect(data!.is_active).toBe(false);
    expect(data!.sort_order).toBe(7);
  });

  it("slug kategori duplikat ditolak database", async () => {
    if (!up) return;
    const slug = `uji-dup-${Date.now().toString(36)}`;
    createdCategorySlugs.push(slug);

    const { error: first } = await admin.client.rpc("upsert_category", {
      p_id: null,
      p_name: "Kategori Dup A",
      p_slug: slug,
      p_description: null,
      p_is_active: true,
      p_sort_order: 1,
    });
    expect(first).toBeNull();

    const { error: second } = await admin.client.rpc("upsert_category", {
      p_id: null,
      p_name: "Kategori Dup B",
      p_slug: slug,
      p_description: null,
      p_is_active: true,
      p_sort_order: 2,
    });
    expect(second).not.toBeNull();
  });
});
