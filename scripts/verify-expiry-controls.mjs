// Verifikasi kendali masa berlaku (migrasi 0029).
//
// Menguji jalur sesungguhnya dengan sesi zann06 (super_admin):
//   1. Panel "Masa berlaku" tampil pada entri terverifikasi.
//   2. Menyimpan tanggal berakhir lewat UI benar-benar mengubah database.
//   3. Tanggal yang mendahului tanggal mulai ditolak (aturan RPC).
//   4. Tombol "Tandai kedaluwarsa" mengubah status verified -> expired.
//   5. Halaman admin /admin/program memuat entri tersebut.
//
// Program uji dibuat sementara dan HARUS dibersihkan lewat migrasi
// pembersihan (contribution_history bersifat append-only, sehingga skrip ini
// tidak dapat menghapusnya sendiri). Skrip mencetak id program di akhir.
import { readFileSync } from "node:fs";

import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3117";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function adminClient() {
  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "Cache-Control": "no-cache" } },
  });
}

const problems = [];

function isoDate(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function bacaProgram(id) {
  // Klien baru tiap pembacaan: koneksi lama bisa menyajikan data basi.
  for (let i = 0; i < 10; i += 1) {
    const admin = adminClient();
    const { data, error } = await admin
      .from("assistance_programs")
      .select("id, status, promo_end")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

async function tunggu(predikat, label) {
  for (let i = 0; i < 20; i += 1) {
    if (await predikat()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  problems.push(`timeout menunggu ${label}`);
  return false;
}

// ── Siapkan program uji ────────────────────────────────────────────────────
const admin = adminClient();

const { data: kategori, error: kategoriErr } = await admin
  .from("categories")
  .select("id")
  .eq("slug", "free-api")
  .single();
if (kategoriErr) throw new Error(`kategori: ${kategoriErr.message}`);

const { data: kontributor } = await admin
  .from("profiles")
  .select("id")
  .eq("github_username", "keyyjuya")
  .single();

const slugUji = `uji-kedaluwarsa-${Date.now()}`;
const promoStart = isoDate(1);
const promoEndAwal = isoDate(30);

const { data: program, error: programErr } = await admin
  .from("assistance_programs")
  .insert({
    slug: slugUji,
    title: "Uji kendali masa berlaku",
    description:
      "Entri sementara untuk menguji panel masa berlaku dan tombol tandai kedaluwarsa. Dibuat otomatis oleh skrip verifikasi.",
    category_id: kategori.id,
    access_type: "api",
    organizer: "Uji internal",
    provider: "Uji",
    contributor_id: kontributor.id,
    status: "verified",
    promo_start: promoStart,
    promo_end: promoEndAwal,
  })
  .select("id")
  .single();

if (programErr || !program) {
  console.error("GAGAL membuat program uji:", programErr?.message);
  process.exit(1);
}
console.log(`program uji: ${program.id} (${slugUji})`);

// ── Sesi nyata zann06 ─────────────────────────────────────────────────────
const { data: zann } = await admin
  .from("profiles")
  .select("id")
  .eq("github_username", "zann06")
  .single();
const { data: akun } = await admin.auth.admin.getUserById(zann.id);
const { data: link } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: akun.user.email,
});
const { data: verif } = await admin.auth.verifyOtp({
  token_hash: link.properties.hashed_token,
  type: "magiclink",
});

const ref = new URL(url).hostname.split(".")[0];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
await ctx.addCookies([
  {
    name: `sb-${ref}-auth-token`,
    value: encodeURIComponent(JSON.stringify(verif.session)),
    domain: new URL(BASE).hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  },
]);

const page = await ctx.newPage();
const halamanReview = `${BASE}/review/${program.id}`;
const res = await page.goto(halamanReview, { waitUntil: "domcontentloaded", timeout: 60000 });
console.log(`/review/{id} -> ${res?.status()}`);
await page.getByText("Masa berlaku", { exact: false }).first().waitFor({ timeout: 20000 });

// 1. Panel & tombol tampil
if ((await page.getByText("Tandai kedaluwarsa").count()) === 0) {
  problems.push("tombol 'Tandai kedaluwarsa' tidak tampil untuk entri terverifikasi");
} else {
  console.log("OK   panel masa berlaku + tombol tandai kedaluwarsa tampil");
}

// 2. Simpan tanggal baru lewat UI
const tanggalBaru = isoDate(45);
const inputTanggal = page.locator("#promo-end");
await inputTanggal.fill(tanggalBaru);
await page.getByRole("button", { name: "Simpan tanggal" }).click();
const tersimpan = await tunggu(async () => {
  const row = await bacaProgram(program.id);
  return row?.promo_end === tanggalBaru;
}, "promo_end tersimpan");
if (tersimpan) {
  console.log(`OK   tanggal berakhir tersimpan: ${tanggalBaru}`);
} else {
  const row = await bacaProgram(program.id);
  problems.push(`promo_end tidak berubah (sekarang ${row?.promo_end ?? "null"})`);
}

// 3. Tanggal sebelum tanggal mulai ditolak
const klien = createClient(url, anon, {
  global: { headers: { Authorization: `Bearer ${verif.session.access_token}` } },
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error: tanggalSalahErr } = await klien.rpc("reviewer_set_promo_end", {
  p_program_id: program.id,
  p_promo_end: isoDate(0),
});
if (!tanggalSalahErr || !/sebelum tanggal mulai/i.test(tanggalSalahErr.message)) {
  problems.push(
    `tanggal sebelum tanggal mulai seharusnya ditolak (respons: ${tanggalSalahErr?.message ?? "sukses"})`,
  );
} else {
  console.log("OK   tanggal sebelum tanggal mulai ditolak RPC");
}

// 4. Tandai kedaluwarsa lewat UI (dua langkah konfirmasi)
await page.getByRole("button", { name: "Tandai kedaluwarsa" }).click();
await page.getByRole("button", { name: "Ya, tandai" }).click();
const jadiExpired = await tunggu(async () => {
  const row = await bacaProgram(program.id);
  return row?.status === "expired";
}, "status expired");
if (jadiExpired) {
  console.log("OK   status berubah menjadi expired");
} else {
  const row = await bacaProgram(program.id);
  problems.push(`status tidak berubah (sekarang ${row?.status ?? "tidak ada"})`);
}

// 5. Halaman admin memuat entri
const resAdmin = await page.goto(
  `${BASE}/admin/program?status=expired&q=${encodeURIComponent("Uji kendali")}`,
  { waitUntil: "domcontentloaded", timeout: 60000 },
);
const teksAdmin = await page.locator("body").innerText();
console.log(`/admin/program -> ${resAdmin?.status()}`);
if (!teksAdmin.includes("Uji kendali masa berlaku")) {
  problems.push("entri uji tidak tampil di /admin/program filter kedaluwarsa");
} else {
  console.log("OK   entri tampil di /admin/program");
}
if (!/Kedaluwarsa/i.test(teksAdmin)) {
  problems.push("label status kedaluwarsa tidak tampil di halaman admin");
}

await browser.close();

if (problems.length > 0) {
  console.error("\nGAGAL:\n- " + problems.join("\n- "));
  console.error(`\nBersihkan program uji: ${slugUji} (${program.id})`);
  process.exit(1);
}
console.log(`\nLULUS: kendali masa berlaku bekerja lewat UI dan RPC`);
console.log(`PROGRAM_UJI=${program.id} SLUG=${slugUji}`);
