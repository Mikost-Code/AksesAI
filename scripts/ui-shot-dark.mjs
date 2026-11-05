import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 160));
});

// Detail page — verifikasi sel kosong sudah hilang
await page.goto(`${BASE}/info`, { waitUntil: "networkidle" });
const href = await page.locator('a[href^="/info/"]').first().getAttribute("href");
await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: "ui-shots/29-detail-fixed.png" });

// Mode gelap: set class langsung (cara yang sama seperti ThemeToggle)
await page.evaluate(() => document.documentElement.classList.add("dark"));
await page.waitForTimeout(500);
const bg = await page.evaluate(
  () => getComputedStyle(document.body).backgroundColor,
);
console.log("warna latar mode gelap:", bg);
await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => document.documentElement.classList.add("dark"));
await page.waitForTimeout(600);
await page.screenshot({ path: "ui-shots/30-beranda-gelap.png" });

console.log("error konsol:", errors.length ? errors.slice(0, 5) : "tidak ada");
await browser.close();
