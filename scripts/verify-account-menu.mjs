// Verifikasi menu akun sebagai ADMIN SUNGGUHAN.
//
// Menu akun hanya tampil untuk pengguna login, dan login normal memakai OAuth
// GitHub yang butuh tangan manusia. Untuk menguji tampilannya, sesi admin
// dibuat lewat magic link Supabase yang digenerate server-side
// (`admin.generateLink`), lalu token-nya ditukar di browser. Tidak ada
// password yang disimpan dan tidak ada kredensial yang dicetak.
//
// Yang diperiksa:
//  1. Ada tautan eksplisit kembali ke situs publik ("Jelajahi direktori").
//  2. Halaman yang sedang dibuka ditandai `aria-current="page"`.
//  3. Panel tidak melebihi tinggi layar pada 1280×800 dan 390×844.
//
// Jalankan setelah `npx next build && npx next start -p 3117`.
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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Ambil satu akun admin dari database, lalu minta magic link untuknya.
const { data: rows, error } = await admin
  .from("user_roles")
  .select("user_id")
  .eq("role", "admin")
  .limit(1);
if (error || !rows?.length) {
  console.error("GAGAL: tidak ada akun admin untuk diuji:", error?.message);
  process.exit(1);
}

const { data: userData, error: userError } = await admin.auth.admin.getUserById(
  rows[0].user_id,
);
if (userError || !userData?.user?.email) {
  console.error("GAGAL: email admin tidak terbaca:", userError?.message);
  process.exit(1);
}

const { data: link, error: linkError } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: userData.user.email,
});
if (linkError) {
  console.error("GAGAL: generateLink:", linkError.message);
  process.exit(1);
}

const tokenHash = link.properties.hashed_token;

// Tukar `hashed_token` menjadi sesi lewat Supabase, lalu suntikkan cookie sesi
// ke browser. Route `/auth/callback` hanya menangani alur OAuth (`?code=`),
// jadi magic link tidak bisa dipakai dengan mengunjungi route itu.
const { data: verifikasi, error: verifyError } = await admin.auth.verifyOtp({
  token_hash: tokenHash,
  type: "magiclink",
});
if (verifyError || !verifikasi?.session) {
  console.error("GAGAL: verifyOtp:", verifyError?.message ?? "sesi kosong");
  process.exit(1);
}

// Nama cookie mengikuti pola @supabase/ssr: `sb-<ref>-auth-token`, dipecah per
// 3180 karakter bila nilainya panjang.
const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const namaCookie = `sb-${projectRef}-auth-token`;
const sesiJson = JSON.stringify(verifikasi.session);
const potongan =
  sesiJson.length <= 3180
    ? [sesiJson]
    : (() => {
        const hasil = [];
        for (let i = 0; i < sesiJson.length; i += 3180) hasil.push(sesiJson.slice(i, i + 3180));
        return hasil;
      })();

const cookieSesi = potongan.map((nilai, i) => ({
  name: potongan.length === 1 ? namaCookie : `${namaCookie}.${i}`,
  value: encodeURIComponent(nilai),
  domain: "127.0.0.1",
  path: "/",
  httpOnly: false,
  secure: false,
  sameSite: "Lax",
}));
const browser = await chromium.launch();
const problems = [];

// Cookie disuntikkan ke context, bukan ke satu halaman, agar tetap terpakai
// setelah `setViewportSize` + navigasi berikutnya.
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.addCookies(cookieSesi);
const page = await context.newPage();

// `next start` yang baru bangun kadang menutup satu koneksi pertama; ulangi
// beberapa kali sebelum menyimpulkan servernya mati.
async function buka(url) {
  for (let percobaan = 1; percobaan <= 4; percobaan += 1) {
    try {
      return await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    } catch (err) {
      if (percobaan === 4) throw err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

// ── 1 & 2. Tautan publik + penanda halaman aktif, dari halaman dasbor ──────
await buka(`${BASE}/dashboard`);

if (page.url().includes("/login")) {
  console.error("GAGAL: sesi admin tidak terbentuk (ditolak /login)");
  await browser.close();
  process.exit(1);
}

const pemicu = page.getByRole("button", { name: /Menu akun/i });
if ((await pemicu.count()) === 0) {
  problems.push("tombol menu akun tidak ditemukan pada halaman dasbor");
} else {
  await pemicu.first().click();
  const panel = page.locator("#account-menu-panel");
  await panel.waitFor({ state: "visible", timeout: 5000 });

  // Jalan pulang ke situs publik.
  const pulang = panel.getByRole("menuitem", { name: /Jelajahi direktori/i });
  if ((await pulang.count()) === 0) {
    problems.push('tautan "Jelajahi direktori" tidak ada di menu akun');
  } else {
    const href = await pulang.first().getAttribute("href");
    if (href !== "/info") problems.push(`"Jelajahi direktori" menuju ${href}, bukan /info`);
  }

  // Halaman aktif (kita sedang di /dashboard → "Ringkasan").
  const aktif = await panel.locator('[aria-current="page"]').allInnerTexts();
  if (!aktif.some((t) => t.includes("Ringkasan"))) {
    problems.push(`penanda halaman aktif salah atau tidak ada: ${JSON.stringify(aktif)}`);
  }

  // Panel tidak boleh terpotong layar.
  const ukur = await panel.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { tinggi: Math.round(r.height), bawah: Math.round(r.bottom), vh: window.innerHeight };
  });
  if (ukur.bawah > ukur.vh + 1) {
    problems.push(`panel melewati layar: bawah ${ukur.bawah}px > tinggi ${ukur.vh}px`);
  }

  await page.screenshot({ path: "ui-shots/menu-akun-admin.png", fullPage: false });
  console.log(`panel: tinggi ${ukur.tinggi}px, bawah ${ukur.bawah}px dari ${ukur.vh}px`);
}

// ── 3. Ponsel ──────────────────────────────────────────────────────────────
await page.setViewportSize({ width: 390, height: 844 });
await buka(`${BASE}/dashboard`);

const pemicuHp = page.getByRole("button", { name: /Menu akun/i });
if ((await pemicuHp.count()) === 0) {
  problems.push("menu akun tidak tampil di ponsel 390px");
} else {
  // Buka lewat menu hamburger bila tombolnya tersembunyi.
  if (!(await pemicuHp.first().isVisible())) {
    const hamburger = page.getByRole("button", { name: /buka menu|menu navigasi/i });
    if ((await hamburger.count()) > 0) await hamburger.first().click();
  }
  await pemicuHp.first().click();
  const panelHp = page.locator("#account-menu-panel");
  if (await panelHp.isVisible()) {
    const ukur = await panelHp.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { kiri: Math.round(r.left), kanan: Math.round(r.right), bawah: Math.round(r.bottom), vh: window.innerHeight, vw: window.innerWidth };
    });
    if (ukur.kanan > ukur.vw + 1 || ukur.kiri < -1) {
      problems.push(`panel keluar layar ponsel: kiri ${ukur.kiri}, kanan ${ukur.kanan} dari ${ukur.vw}`);
    }
    if (ukur.bawah > ukur.vh + 1) {
      problems.push(`panel terpotong di ponsel: bawah ${ukur.bawah} > ${ukur.vh}`);
    }
    await page.screenshot({ path: "ui-shots/menu-akun-admin-hp.png", fullPage: false });
  } else {
    problems.push("panel menu akun tidak terbuka di ponsel");
  }
}

await browser.close();

if (problems.length > 0) {
  console.error("GAGAL:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("LULUS: ada jalan kembali ke direktori publik, halaman aktif ditandai, panel muat di layar");
