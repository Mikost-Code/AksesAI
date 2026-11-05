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

// Dua entri: satu dengan banyak data (Groq), satu minim (Supabase)
for (const [slug, file] of [
  ["groq-api-free-tier", "31-detail-lengkap.png"],
  ["supabase-free-tier", "32-detail-minim.png"],
]) {
  await page.goto(`${BASE}/info/${slug}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const grid = page.locator("dl").first();
  await grid.scrollIntoViewIfNeeded();
  await grid.screenshot({ path: `ui-shots/${file}` });
  const cells = await grid.locator("> div").count();
  console.log(`${slug}: ${cells} sel`);
}

console.log("error konsol:", errors.length ? errors.slice(0, 5) : "tidak ada");
await browser.close();
