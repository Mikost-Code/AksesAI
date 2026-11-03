import { createClient } from "@supabase/supabase-js";

/**
 * Smoke test MUTASI area admin terhadap dev server + Supabase nyata.
 *
 * Menguji jalur RPC yang dipakai Server Action `/admin` memakai SESI ADMIN
 * sungguhan (bukan service_role), sehingga RLS & `require_staff` ikut diuji:
 *  - grant_role memberi role; revoke_role mencabutnya
 *  - set_user_banned memblokir & membuka blokir (butuh alasan)
 *  - upsert_category membuat & memperbarui kategori
 *  - member biasa DITOLAK saat memanggil RPC yang sama (lapisan kedua)
 *
 * Catatan: ini menguji kontrak RPC yang dipanggil aksi server. Uji lewat HTTP
 * form (Server Action) tercakup Playwright di PHASE 8.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let failures = 0;
function log(ok, label, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures += 1;
}

const password = "Admin-Mut-123!";

async function main() {
  const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function makeUser(tag, roles) {
    const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const email = `${tag}-${unique}@example.test`;
    const { data, error } = await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { user_name: `${tag}-${unique}`.slice(0, 30) },
    });
    if (error) throw new Error(`create ${tag}: ${error.message}`);
    await new Promise((r) => setTimeout(r, 700));
    for (const role of roles) {
      await svc.from("user_roles").insert({ user_id: data.user.id, role });
    }
    const c = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error: siErr } = await c.auth.signInWithPassword({ email, password });
    if (siErr) throw new Error(`signin ${tag}: ${siErr.message}`);
    return { id: data.user.id, email, client: c };
  }

  const admin = await makeUser("amadmin", ["admin"]);
  const target = await makeUser("amtarget", []);
  const member = await makeUser("ammember", []);

  // --- grant / revoke role ---
  const { error: grantErr } = await admin.client.rpc("grant_role", {
    p_user_id: target.id,
    p_role: "reviewer",
  });
  log(grantErr === null, "Admin memberi role reviewer", grantErr?.message ?? "ok");
  let { data: roles } = await svc.from("user_roles").select("role").eq("user_id", target.id);
  log(
    (roles ?? []).some((r) => r.role === "reviewer"),
    "Role reviewer tersimpan di database",
  );

  const { error: memberGrantErr } = await member.client.rpc("grant_role", {
    p_user_id: member.id,
    p_role: "admin",
  });
  log(
    memberGrantErr !== null && memberGrantErr.code === "42501",
    "Member tidak dapat memberi role (42501)",
    memberGrantErr?.code ?? "tidak menolak",
  );

  const { error: revokeErr } = await admin.client.rpc("revoke_role", {
    p_user_id: target.id,
    p_role: "reviewer",
  });
  log(revokeErr === null, "Admin mencabut role reviewer", revokeErr?.message ?? "ok");
  ({ data: roles } = await svc.from("user_roles").select("role").eq("user_id", target.id));
  log(
    !(roles ?? []).some((r) => r.role === "reviewer"),
    "Role reviewer sudah tidak ada",
  );

  // --- ban / unban ---
  const { error: shortBanErr } = await admin.client.rpc("set_user_banned", {
    p_user_id: target.id,
    p_banned: true,
    p_reason: "pendek",
  });
  log(
    shortBanErr !== null,
    "Blokir dengan alasan <10 karakter ditolak",
    shortBanErr?.message ?? "tidak menolak",
  );

  const { error: banErr } = await admin.client.rpc("set_user_banned", {
    p_user_id: target.id,
    p_banned: true,
    p_reason: "Kontribusi palsu berulang.",
  });
  log(banErr === null, "Admin memblokir pengguna", banErr?.message ?? "ok");
  const { data: banned } = await svc.from("profiles").select("is_banned").eq("id", target.id).single();
  log(banned?.is_banned === true, "Status blokir tersimpan");

  const { error: unbanErr } = await admin.client.rpc("set_user_banned", {
    p_user_id: target.id,
    p_banned: false,
    p_reason: "Banding diterima, tidak terbukti.",
  });
  log(unbanErr === null, "Admin membuka blokir", unbanErr?.message ?? "ok");
  const { data: unbanned } = await svc.from("profiles").select("is_banned").eq("id", target.id).single();
  log(unbanned?.is_banned === false, "Status blokir dibuka");

  // --- kategori ---
  const slug = `smoke-cat-${Date.now().toString(36)}`;
  const { data: newId, error: catErr } = await admin.client.rpc("upsert_category", {
    p_id: null,
    p_name: "Kategori Smoke Admin",
    p_slug: slug,
    p_description: null,
    p_is_active: true,
    p_sort_order: 99,
  });
  log(catErr === null && Boolean(newId), "Admin membuat kategori", catErr?.message ?? "ok");

  const { error: memberCatErr } = await member.client.rpc("upsert_category", {
    p_id: null,
    p_name: "Kategori Member",
    p_slug: `${slug}-m`,
    p_description: null,
    p_is_active: true,
    p_sort_order: 100,
  });
  log(
    memberCatErr !== null && memberCatErr.code === "42501",
    "Member tidak dapat membuat kategori (42501)",
    memberCatErr?.code ?? "tidak menolak",
  );

  const { error: updateErr } = await admin.client.rpc("upsert_category", {
    p_id: newId,
    p_name: "Kategori Smoke Admin v2",
    p_slug: slug,
    p_description: "Diperbarui",
    p_is_active: false,
    p_sort_order: 5,
  });
  log(updateErr === null, "Admin memperbarui kategori", updateErr?.message ?? "ok");
  const { data: cat } = await svc
    .from("categories")
    .select("name, is_active")
    .eq("id", newId)
    .single();
  log(cat?.name === "Kategori Smoke Admin v2" && cat?.is_active === false, "Perubahan kategori tersimpan");

  // --- audit log tercatat ---
  const { data: logs } = await svc
    .from("moderation_logs")
    .select("action")
    .eq("target_id", newId);
  log((logs ?? []).some((l) => l.action.startsWith("category.")), "Aksi kategori tercatat di audit log");

  // Bersihkan.
  await svc.from("categories").delete().eq("id", newId);
  for (const u of [admin, target, member]) await svc.auth.admin.deleteUser(u.id);

  console.log(`\nKegagalan: ${failures}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
