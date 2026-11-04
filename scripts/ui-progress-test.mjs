import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Perlambat jaringan agar transisi terlihat (mirip koneksi 3G/4G lambat).
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 400,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
});

await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(500);

// Catat apakah bar progres sempat muncul saat navigasi
let barSeen = false;
const watch = setInterval(async () => {
  const n = await page.locator('[data-navigation-progress="true"]').count().catch(() => 0);
  if (n > 0) barSeen = true;
}, 10);

const t0 = Date.now();
await page.getByRole("link", { name: "Direktori" }).first().click();
await page.waitForTimeout(250);
await page.screenshot({ path: "ui-shots/11-progress-bar.png", clip: { x: 0, y: 0, width: 1440, height: 90 } });
await page.waitForURL("**/info", { timeout: 60000 });
const navMs = Date.now() - t0;
await page.waitForTimeout(1200);
clearInterval(watch);

console.log("navigasi (jaringan diperlambat):", navMs, "ms");
console.log("bar progres terlihat:", barSeen ? "YA" : "TIDAK");
await browser.close();
