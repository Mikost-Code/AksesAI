import { createClient } from "@supabase/supabase-js";

/**
 * Smoke test dasbor terhadap dev server NYATA (localhost:3000).
 *
 * Langkah:
 *  1. Buat pengguna uji via service_role (auth.users).
 *  2. Login password untuk mendapatkan session Supabase.
 *  3. Rangkai cookie `sb-<ref>-auth-token` seperti yang ditulis @supabase/ssr.
 *  4. GET /dashboard/* dengan cookie itu dan periksa status + isi HTML.
 *
 * Tidak ada data palsu: bila sesi tidak valid, halaman akan redirect ke /login
 * dan skrip akan melaporkannya sebagai GAGAL.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.SMOKE_APP_URL ?? "http://localhost:3000";

if (!ANON_KEY || !SERVICE_KEY) {
  console.error(
    "Butuh NEXT_PUBLIC_SUPABASE_ANON_KEY & SUPABASE_SERVICE_ROLE_KEY di env/.env.local",
  );
  process.exit(1);
}

const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0] ?? "127";

function log(ok, label, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const unique = Date.now().toString(36);
  const username = `smoke-${unique}`;
  const email = `${username}@example.test`;
  const password = "Smoke-Password-123!";

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_name: username, avatar_url: null },
  });
  if (createError || !created.user) {
    console.error("Gagal membuat pengguna uji:", createError?.message);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 400));

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signIn.session) {
    console.error("Login gagal:", signInError?.message);
    process.exit(1);
  }

  // Bentuk cookie yang dibaca @supabase/ssr (base64-json, chunked bila panjang).
  const payload = JSON.stringify(signIn.session);
  const encoded = `base64-${Buffer.from(payload, "utf8").toString("base64url")}`;
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookie = `${cookieName}=${encoded}`;

  const get = (path) =>
    fetch(`${APP_URL}${path}`, {
      headers: { cookie },
      redirect: "manual",
    });

  // 1. Dasbor utama harus 200 dan menyapa pengguna.
  const dash = await get("/dashboard");
  const dashHtml = await dash.text();
  log(dash.status === 200, "GET /dashboard → 200", `status ${dash.status}`);
  log(dashHtml.includes(username), "Dasbor menampilkan username pengguna");

  // 2. Daftar kontribusi kosong untuk pengguna baru.
  const list = await get("/dashboard/kontribusi");
  const listHtml = await list.text();
  log(list.status === 200, "GET /dashboard/kontribusi → 200", `status ${list.status}`);
  log(
    listHtml.includes("Belum ada kontribusi"),
    "Daftar kontribusi menampilkan empty state",
  );

  // 3. Formulir kontribusi baru merender field wajib.
  const form = await get("/dashboard/kontribusi/baru");
  const formHtml = await form.text();
  log(form.status === 200, "GET /dashboard/kontribusi/baru → 200", `status ${form.status}`);
  log(formHtml.includes("Judul"), "Formulir memuat field Judul");
  log(formHtml.includes("Tautan"), "Formulir memuat field Tautan sumber");

  // 4. Tanpa sesi → redirect ke /login (kontrol keamanan).
  const anon = await fetch(`${APP_URL}/dashboard`, { redirect: "manual" });
  log(
    anon.status === 307 || anon.status === 302,
    "GET /dashboard tanpa sesi → redirect",
    `status ${anon.status} → ${anon.headers.get("location") ?? "-"}`,
  );

  // 5. ID acak (bukan milik siapa pun) → 404, bukan kebocoran data.
  const bogus = await get("/dashboard/kontribusi/00000000-0000-4000-8000-000000000000");
  log(bogus.status === 404, "GET /dashboard/kontribusi/<asing> → 404", `status ${bogus.status}`);

  // Bersihkan pengguna uji.
  await admin.auth.admin.deleteUser(created.user.id);
  console.log("\nPengguna uji dihapus:", created.user.id);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
