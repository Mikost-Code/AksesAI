import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const cspViolations = [];
await page.addInitScript(() => {
  document.addEventListener("securitypolicyviolation", (e) => {
    window.__csp = window.__csp || [];
    window.__csp.push({
      directive: e.violatedDirective,
      blocked: e.blockedURI,
      sample: e.sample || "",
    });
  });
});

const posts = [];
page.on("request", (r) => {
  if (r.method() === "POST") posts.push(r.url());
});

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.getByRole("button", { name: /GitHub/i }).first().click();
await page.waitForTimeout(4000);

const csp = await page.evaluate(() => window.__csp || []);
console.log("url akhir:", page.url().slice(0, 120));
console.log("POST terkirim:", posts.length ? posts : "tidak ada");
console.log("pelanggaran CSP:", csp.length ? csp : "tidak ada");

await browser.close();
