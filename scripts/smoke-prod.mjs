/**
 * Smoke test produksi AksesAI.
 *
 * Memeriksa hal yang tidak terlihat dari curl: bundle klien tidak memuat
 * rahasia, tidak ada error konsol, dan alur halaman utama berjalan di browser.
 *
 * Jalankan: node scripts/smoke-prod.mjs https://domain-anda
 */
import { chromium } from "@playwright/test";

const BASE = (process.argv[2] ?? "https://aksesai-id.vercel.app").replace(/\/$/, "");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 160));
});
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url().slice(0, 110)}`);
});

const results = [];

async function visit(path, label) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(400);
  const status = res?.status() ?? 0;
  const ok = status === 200;
  results.push({ label, ok, status });
  console.log(`${ok ? "OK  " : "FAIL"} ${label.padEnd(20)} status=${status}`);
}

await visit("/", "Beranda");
await visit("/info", "Direktori");
await visit("/tentang", "Tentang");
await visit("/panduan", "Panduan");
await visit("/login", "Login");

// Alur beranda -> direktori harus memakai navigasi klien (bukan reload penuh)
await page.goto(BASE, { waitUntil: "networkidle" });
const navStart = Date.now();
const linkDirektori = page.getByRole("link", { name: "Direktori" }).first();
if (await linkDirektori.count()) {
  await linkDirektori.click();
  await page.waitForURL("**/info", { timeout: 30000 });
  await page.waitForTimeout(600);
  console.log(`OK   Navigasi Beranda->Direktori ${Date.now() - navStart}ms`);
} else {
  console.log("WARN link 'Direktori' tidak ditemukan di navbar");
}

// Cari jejak rahasia di bundle JS yang dimuat browser
const leaked = await page.evaluate(async () => {
  const urls = [...document.querySelectorAll("script[src]")].map((s) => s.src);
  const found = [];
  for (const url of urls) {
    try {
      const text = await (await fetch(url)).text();
      for (const needle of ["service_role", "SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET", "IP_HASH_SALT"]) {
        if (text.includes(needle)) found.push(`${needle} di ${url.split("/").pop()}`);
      }
    } catch {
      // lewati; kegagalan fetch bundle dicatat lewat listener response
    }
  }
  return found;
});
console.log(leaked.length ? `FAIL kebocoran bundle: ${leaked.join(", ")}` : "OK   Bundle klien bersih dari rahasia");

console.log("error:", errors.length ? errors.slice(0, 5) : "tidak ada");
const allOk = results.every((r) => r.ok) && leaked.length === 0;
console.log(allOk ? "SMOKE TEST LULUS" : "SMOKE TEST ADA MASALAH");

await page.goto(BASE, { waitUntil: "networkidle" });
await page.screenshot({ path: "ui-shots/14-produksi-beranda.png", fullPage: false });

await browser.close();
process.exit(allOk && errors.length === 0 ? 0 : 1);
