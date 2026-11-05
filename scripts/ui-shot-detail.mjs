import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const errors = [];

function watch(page) {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 160));
  });
}

const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
watch(page);

// 1. Detail page — ambil slug nyata dari direktori
await page.goto(`${BASE}/info`, { waitUntil: "networkidle" });
const href = await page.locator('a[href^="/info/"]').first().getAttribute("href");
console.log("slug detail:", href);
await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: "ui-shots/24-detail.png" });

// 2. Mobile: navbar + menu terbuka
const mob = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const mp = await mob.newPage();
watch(mp);
await mp.goto(BASE, { waitUntil: "networkidle" });
await mp.waitForTimeout(600);
await mp.screenshot({ path: "ui-shots/25-mobile-navbar.png", clip: { x: 0, y: 0, width: 390, height: 120 } });
await mp.locator('summary[aria-label="Buka menu navigasi"]').click();
await mp.waitForTimeout(400);
await mp.screenshot({ path: "ui-shots/26-mobile-menu.png", clip: { x: 0, y: 0, width: 390, height: 420 } });

// 3. Mobile detail
await mp.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
await mp.waitForTimeout(500);
await mp.screenshot({ path: "ui-shots/27-mobile-detail.png" });

// 4. Dark mode beranda (token harus tetap kontras)
const dark = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
const dp = await dark.newPage();
watch(dp);
await dp.goto(BASE, { waitUntil: "networkidle" });
await dp.waitForTimeout(700);
await dp.screenshot({ path: "ui-shots/28-beranda-gelap.png" });

console.log("error konsol:", errors.length ? errors.slice(0, 5) : "tidak ada");
await browser.close();
