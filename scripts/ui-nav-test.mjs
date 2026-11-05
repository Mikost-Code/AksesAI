import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 200));
});

// Beranda: pastikan badge pill di area hero sudah hilang.
//
// Pemeriksaan dibatasi pada <section> hero (section pertama di <main>) dan
// pada BENTUK badge (elemen `rounded-full` berisi teks di atas <h1>) — bukan
// sekadar pencarian teks di seluruh halaman. Versi lama test ini salah
// melaporkan "masih ada" karena teks deskripsi di footer/metadata juga
// mengandung frasa yang sama.
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const heroBadge = await page
  .locator("main > section")
  .first()
  .locator("h1 ~ *, :scope > * span.rounded-full, :scope > div > span.rounded-full")
  .filter({ hasText: /dikurasi|seputar AI|info gratis/i })
  .count();
console.log(
  "badge pill hero masih ada:",
  heroBadge > 0 ? "YA (masih)" : "TIDAK (sudah dihapus)",
);

// Bar progres harus muncul saat klik navigasi
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

let barSeen = false;
const watch = setInterval(async () => {
  const n = await page
    .locator('div[aria-hidden="true"][class*="fixed"][class*="top-0"]')
    .count()
    .catch(() => 0);
  if (n > 0) barSeen = true;
}, 15);

const t0 = Date.now();
await page.getByRole("link", { name: "Direktori" }).first().click();
await page.waitForURL("**/info", { timeout: 20000 });
const navMs = Date.now() - t0;
await page.waitForTimeout(700);
clearInterval(watch);

console.log("navigasi Beranda -> Direktori:", navMs, "ms");
console.log("bar progres navigasi terdeteksi:", barSeen ? "YA" : "tidak (kemungkinan terlalu cepat)");
console.log("error konsol:", errors.length ? errors : "tidak ada");

// Screenshot beranda tanpa badge
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: "ui-shots/10-beranda-final.png", fullPage: false });

await browser.close();
