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

// Beranda: pastikan badge pill sudah hilang
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const badgeAda = await page.getByText("Direktori info gratis & murah seputar AI", { exact: false }).count();
console.log("badge pill beranda masih ada:", badgeAda > 0 ? "YA (masih)" : "TIDAK (sudah dihapus)");

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
