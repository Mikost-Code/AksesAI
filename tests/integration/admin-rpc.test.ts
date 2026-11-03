import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestUser, isLocalSupabaseUp, serviceClient, type TestUser } from "../rls/helpers";

/**
 * Integrasi admin (PHASE 6) terhadap database nyata.
 *
 * Menguji RPC yang dipanggil Server Action `/admin`:
 *  - non-admin tidak boleh memberi/mencabut role atau membuat kategori,
 *  - grant/revoke role berjalan & tercatat di audit log,
 *  - admin terakhir tidak dapat dicabut (RPC menolak),
 *  - blokir/buka blokir memerlukan alasan ≥ 10 karakter,
 *  - upsert_category membuat & memperbarui kategori (admin saja).
 */
describe("Integrasi — admin RPC", () => {
  let up = false;
  let admin: TestUser;
  let member: TestUser;
  let target: TestUser;
  const createdCategorySlugs: string[] = [];

  beforeAll(async () => {
    up = await isLocalSupabaseUp();
    if (!up) {
      console.warn("⚠ Supabase lokal tidak berjalan — tes admin di-skip.");
      return;
    }
    admin = await createTestUser("adm", ["admin"]);
    member = await createTestUser("admmember");
    target = await createTestUser("admtarget");
  });

  afterAll(async () => {
    if (!up) return;
    const svc = serviceClient();
    for (const slug of createdCategorySlugs) {
      await svc.from("categories").delete().eq("slug", slug);
    }
    // Kembalikan status blokir target.
    await svc.from("profiles").update({ is_banned: false }).eq("id", target.id);
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

  it("admin dapat memberi role reviewer, tercatat di audit log", async () => {
    if (!up) return;
    const { error } = await admin.client.rpc("grant_role", {
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

  it("admin dapat mencabut role reviewer", async () => {
    if (!up) return;
    const { error } = await admin.client.rpc("revoke_role", {
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

  it("admin terakhir tidak dapat dicabut", async () => {
    if (!up) return;
    const svc = serviceClient();
    const { data: admins } = await svc.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = (admins ?? []).map((r) => r.user_id);

    // Fixture ini membuat admin uji satu-satunya admin sistem pada DB bersih.
    // Bila lingkungan memuat admin lain, aturan "admin terakhir" tidak dapat
    // diuji tanpa mengubah data nyata — laporkan sebagai skip jujur.
    if (adminIds.length !== 1) {
      console.warn(
        `Lewati uji admin-terakhir: ada ${adminIds.length} admin di DB, butuh tepat 1.`,
      );
      return;
    }

    const { error } = await admin.client.rpc("revoke_role", {
      p_user_id: admin.id,
      p_role: "admin",
    });
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain("admin terakhir");

    // Role admin harus tetap ada setelah percobaan yang ditolak.
    const { data: still } = await svc
      .from("user_roles")
      .select("role")
      .eq("user_id", admin.id)
      .eq("role", "admin");
    expect((still ?? []).length).toBe(1);
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

  it("admin dapat memblokir lalu membuka blokir pengguna", async () => {
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
