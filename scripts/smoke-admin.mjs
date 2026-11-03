import { createClient } from "@supabase/supabase-js";

/**
 * Smoke test area admin terhadap dev server nyata.
 *
 * Membuat pengguna dengan role tertentu, merangkai cookie sesi seperti
 * @supabase/ssr (prefix `base64-` + base64url JSON), lalu memeriksa:
 *  - admin: /admin, /admin/pengguna, /admin/kategori → 200 + konten kunci
 *  - member biasa: /admin* → redirect (bukan 200)
 *  - reviewer: /admin* → redirect (reviewer bukan admin)
 *  - tanpa sesi: /admin → redirect ke /login
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.SMOKE_APP_URL ?? "http://localhost:3000";

let failures = 0;
function log(ok, label, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures += 1;
}

const password = "Admin-Pass-123!";

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function makeUser(tag, roles) {
    const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const email = `${tag}-${unique}@example.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { user_name: `${tag}-${unique}`.slice(0, 30) },
    });
    if (error) throw new Error(`create ${tag}: ${error.message}`);
    await new Promise((r) => setTimeout(r, 800));
    for (const role of roles) {
      await admin.from("user_roles").insert({ user_id: data.user.id, role });
    }
    return { id: data.user.id, email };
  }

  async function cookieFor(email) {
    const s = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data, error } = await s.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`signin ${email}: ${error.message}`);
    return (
      "sb-127-auth-token=base64-" +
      Buffer.from(JSON.stringify(data.session), "utf8").toString("base64url")
    );
  }

  const adminUser = await makeUser("sadmin", ["admin"]);
  const memberUser = await makeUser("smember", []);
  const reviewerUser = await makeUser("sreviewer", ["reviewer"]);

  const adminCookie = await cookieFor(adminUser.email);
  const memberCookie = await cookieFor(memberUser.email);
  const reviewerCookie = await cookieFor(reviewerUser.email);

  async function get(path, cookie) {
    const res = await fetch(`${APP_URL}${path}`, {
      headers: cookie ? { cookie } : {},
      redirect: "manual",
    });
    return { status: res.status, location: res.headers.get("location"), html: res.status === 200 ? await res.text() : "" };
  }

  // --- Admin akses ---
  const home = await get("/admin", adminCookie);
  log(home.status === 200, "Admin GET /admin → 200", `status ${home.status}`);
  log(home.html.includes("Ringkasan admin"), "Halaman /admin memuat judul ringkasan");

  const users = await get("/admin/pengguna", adminCookie);
  log(users.status === 200, "Admin GET /admin/pengguna → 200", `status ${users.status}`);
  log(users.html.includes("Pengguna &amp; peran"), "Halaman pengguna memuat judul");

  const cats = await get("/admin/kategori", adminCookie);
  log(cats.status === 200, "Admin GET /admin/kategori → 200", `status ${cats.status}`);
  log(cats.html.includes("Daftar kategori"), "Halaman kategori memuat daftar");

  // --- Member ditolak ---
  const memberAdmin = await get("/admin", memberCookie);
  log(
    memberAdmin.status === 307,
    "Member GET /admin → redirect",
    `status ${memberAdmin.status} → ${memberAdmin.location ?? "-"}`,
  );

  const memberUsers = await get("/admin/pengguna", memberCookie);
  log(memberUsers.status === 307, "Member GET /admin/pengguna → redirect", `status ${memberUsers.status}`);

  // --- Reviewer ditolak (bukan admin) ---
  const reviewerAdmin = await get("/admin", reviewerCookie);
  log(
    reviewerAdmin.status === 307,
    "Reviewer GET /admin → redirect",
    `status ${reviewerAdmin.status} → ${reviewerAdmin.location ?? "-"}`,
  );

  // --- Tanpa sesi ---
  const anonAdmin = await get("/admin", null);
  log(
    anonAdmin.status === 307 && (anonAdmin.location ?? "").includes("/login"),
    "Tanpa sesi GET /admin → /login",
    `status ${anonAdmin.status} → ${anonAdmin.location ?? "-"}`,
  );

  // Bersihkan.
  for (const u of [adminUser, memberUser, reviewerUser]) {
    await admin.auth.admin.deleteUser(u.id);
  }

  console.log(`\nKegagalan: ${failures}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
