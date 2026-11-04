import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 160));
});

async function shot(path, file) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `ui-shots/${file}`, fullPage: false });
  console.log(`${file} -> ${path}`);
}

await shot("/", "20-beranda-baru.png");
await shot("/info", "21-direktori-baru.png");
await shot("/login", "22-login-baru.png");

// Mobile
const mob = await ctx.newPage();
await mob.setViewportSize({ width: 390, height: 844 });
await mob.goto(BASE, { waitUntil: "networkidle" });
await mob.waitForTimeout(700);
await mob.screenshot({ path: "ui-shots/23-beranda-mobile.png", fullPage: false });

console.log("error konsol:", errors.length ? errors.slice(0, 4) : "tidak ada");
await browser.close();
