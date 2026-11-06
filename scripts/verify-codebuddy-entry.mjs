// Verifikasi entri baru CodeBuddy: tampil di direktori (posisi teratas karena
// urutan "Terbaru"), halaman detail bisa dibuka, dan sumber resmi terlihat.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3112";
const SLUG = "codebuddy-deepseek-v41-flash";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const problems = [];

// 1) Direktori: entri harus ada, dan paling atas pada urutan "Terbaru".
await page.goto(`${BASE}/info`, { waitUntil: "networkidle" });
const cards = page.locator('a[href^="/info/"]');
const firstHref = await cards.first().getAttribute("href");
const allHrefs = await cards.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
const listed = allHrefs.some((h) => h?.endsWith(SLUG));

if (!listed) problems.push("entri tidak muncul di direktori");
if (firstHref !== `/info/${SLUG}`) problems.push(`bukan entri teratas (teratas: ${firstHref})`);

// 2) Halaman detail.
const res = await page.goto(`${BASE}/info/${SLUG}`, { waitUntil: "networkidle" });
if (res?.status() !== 200) problems.push(`detail status ${res?.status()}`);

const bodyText = await page.locator("body").innerText();
if (!/DeepSeek V4\.1 Flash/i.test(bodyText)) problems.push("teks DeepSeek V4.1 Flash tidak ada");
if (!/batas waktu tidak pernah diumumkan|31 Oktober 2026/i.test(bodyText)) {
  problems.push("peringatan tanggal berakhir tidak tampil");
}
if (!/codebuddy\.ai/.test(bodyText)) problems.push("tautan sumber codebuddy.ai tidak tampil");

// 3) Sumber yang bisa diklik.
const sourceLinks = await page.locator('a[href*="codebuddy.ai"]').count();
const routerLinks = await page.locator('a[href*="9router"]').count();
if (sourceLinks === 0) problems.push("tidak ada tautan sumber codebuddy.ai");
if (routerLinks === 0) problems.push("tidak ada tautan sumber 9router");

await page.screenshot({ path: "ui-shots/codebuddy-entry.png", fullPage: false });
await browser.close();

if (problems.length > 0) {
  console.error("GAGAL:", problems.join("; "));
  process.exit(1);
}

console.log(
  `LULUS: entri teratas di direktori, detail 200, ${sourceLinks} tautan codebuddy.ai + ${routerLinks} tautan 9router`,
);
