import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 160));
});

// 1) Buka halaman login
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
console.log("halaman login:", (await page.title()) || page.url());

// 2) Ekstrak tujuan OAuth langsung dari form (tanpa menunggu redirect browser,
//    supaya uji tidak bergantung pada kecepatan memuat halaman GitHub).
const action = await page.getByRole("button", { name: /GitHub/i }).first().evaluate((el) => el.closest("form")?.getAttribute("action"));
console.log("form action:", action);

// 3) Simulasikan submit form lewat network (ikuti redirect manual)
const res = await ctx.request.post(`${BASE}/auth/sign-in`, {
  form: { next: "/dashboard" },
  maxRedirects: 0,
  failOnStatusCode: false,
});
const status = res.status();
const location = res.headers()["location"] || "";
console.log(`POST /auth/sign-in -> HTTP ${status}`);
console.log("diarahkan ke Supabase authorize:", location.includes("supabase.co/auth/v1/authorize") ? "YA" : "TIDAK");
console.log("provider=github:", location.includes("provider=github") ? "YA" : "TIDAK");
console.log(
  "redirect_to -> app callback:",
  decodeURIComponent(location).includes("/auth/callback") ? "YA" : "TIDAK",
);
console.log("pkce code_challenge:", location.includes("code_challenge=") ? "YA" : "TIDAK");
console.log("error konsol:", errors.length ? errors.slice(0, 3) : "tidak ada");

await browser.close();
