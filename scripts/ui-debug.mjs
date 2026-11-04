import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

page.on("console", (m) => console.log(`[${m.type()}]`, m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 400)));

await page.goto("http://localhost:3000/info", { waitUntil: "load" });
await page.waitForTimeout(4000);

const count = await page.locator("#filter-kategori").count();
console.log("jumlah #filter-kategori:", count);
console.log("jumlah form[role=search]:", await page.locator('form[role="search"]').count());
console.log("jumlah combobox:", await page.locator('[role="combobox"]').count());

const html = await page.content();
const idx = html.indexOf("filter-kategori");
console.log("ada di HTML:", idx >= 0);
if (idx >= 0) console.log("konteks:", html.slice(Math.max(0, idx - 200), idx + 200).replace(/\s+/g, " "));

await page.screenshot({ path: "ui-shots/debug-info.png", fullPage: true });
await browser.close();
