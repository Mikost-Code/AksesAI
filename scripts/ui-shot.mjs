import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "ui-shots";
mkdirSync(OUT, { recursive: true });

const pages = [
  { name: "01-beranda", path: "/" },
  { name: "02-direktori", path: "/info" },
  { name: "03-login", path: "/login" },
  { name: "04-tentang", path: "/tentang" },
  { name: "05-panduan", path: "/panduan" },
];

const browser = await chromium.launch();

for (const viewport of [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 390, height: 844 },
]) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await context.newPage();
  for (const p of pages) {
    await page.goto(`${BASE}${p.path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: `${OUT}/${p.name}-${viewport.label}.png`,
      fullPage: viewport.label === "desktop",
    });
  }
  // Dropdown terbuka (khusus desktop)
  if (viewport.label === "desktop") {
    await page.goto(`${BASE}/info`, { waitUntil: "load" });
    const trigger = page.locator("#filter-kategori");
    await trigger.waitFor({ state: "visible", timeout: 30000 });
    await trigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await trigger.click({ timeout: 30000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/06-dropdown-open.png` });
  }
  await context.close();
}

// Halaman detail entri
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(`${BASE}/info`, { waitUntil: "networkidle" });
const firstCard = page.locator('h3 a[href^="/info/"]').first();
if (await firstCard.count()) {
  await firstCard.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/07-detail.png`, fullPage: true });
}

await browser.close();
console.log("Screenshot selesai");
