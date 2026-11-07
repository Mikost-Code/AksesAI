// Cek akses nyata per role: login sebagai zann06 (super_admin) lalu pastikan
// halaman area staf terbuka, bukan dialihkan ke /dashboard.
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

const user = process.env.CEK_USER ?? "zann06";

const { data: profil } = await admin
  .from("profiles")
  .select("id")
  .eq("github_username", user)
  .single();

const { data: akun } = await admin.auth.admin.getUserById(profil.id);
const { data: link } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: akun.user.email,
});
const { data: verif } = await admin.auth.verifyOtp({
  token_hash: link.properties.hashed_token,
  type: "magiclink",
});

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const nama = `sb-${ref}-auth-token`;

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.addCookies([
  {
    name: nama,
    value: encodeURIComponent(JSON.stringify(verif.session)),
    domain: new URL(BASE).hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  },
]);

const page = await ctx.newPage();
const hasil = [];
for (const jalur of ["/dashboard", "/review", "/moderation/reports", "/admin", "/admin/pengguna", "/admin/kategori", "/admin/audit"]) {
  const res = await page
    .goto(`${BASE}${jalur}`, { waitUntil: "domcontentloaded", timeout: 45000 })
    .catch(() => null);
  const akhir = page.url().replace(BASE, "");
  const ok = akhir.startsWith(jalur) && res?.status() === 200;
  hasil.push({ jalur, status: res?.status(), akhir, ok });
  console.log(`${ok ? "OK  " : "GAGAL"} ${jalur.padEnd(22)} -> ${res?.status()} ${akhir}`);
}

await browser.close();

const gagal = hasil.filter((h) => !h.ok);
if (gagal.length > 0) {
  console.error(`\nGAGAL: ${gagal.length} halaman tidak terbuka untuk ${user}`);
  process.exit(1);
}
console.log(`\nLULUS: ${user} membuka ${hasil.length} halaman area staf tanpa dialihkan`);
