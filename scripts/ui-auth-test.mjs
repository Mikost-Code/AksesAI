import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";

/**
 * Uji halaman area ber-login memakai sesi browser yang sudah tersimpan.
 *
 * Pakai: buka dulu `node scripts/save-session.mjs` (login manual sekali),
 * lalu jalankan skrip ini.
 */
const BASE = "http://localhost:3000";
const STATE = "ui-shots/auth-state.json";

if (!existsSync(STATE)) {
  console.error("Sesi belum ada. Jalankan: node scripts/save-session.mjs");
  process.exit(1);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  storageState: STATE,
});
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

async function check(path, label) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const status = res?.status() ?? 0;
  const body = (await page.textContent("body").catch(() => "")) || "";
  const redirectedToLogin = page.url().includes("/login");
  const forbidden = /tidak punya akses|403|Forbidden/i.test(body.slice(0, 4000));
  const ok = status === 200 && !redirectedToLogin && !forbidden;
  console.log(
    `${ok ? "OK  " : "FAIL"} ${label.padEnd(22)} status=${status} url=${new URL(page.url()).pathname}`,
  );
  return ok;
}

const results = [];
results.push(await check("/dashboard", "Dasbor"));
results.push(await check("/admin/pengguna", "Admin · Pengguna"));
results.push(await check("/dashboard/kontribusi", "Kontribusi"));
results.push(await check("/review", "Review"));
results.push(await check("/moderation", "Moderasi"));

console.log("error JS:", errors.length ? errors.slice(0, 2) : "tidak ada");
console.log(results.every(Boolean) ? "SEMUA LULUS" : "ADA YANG GAGAL");

await page.goto(`${BASE}/admin/pengguna`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: "ui-shots/13-admin-pengguna.png", fullPage: false });

await browser.close();
