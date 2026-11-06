// Regresi: dropdown di dalam <dialog> modal HARUS bisa dibuka dan diklik.
//
// Bug yang dijaga: daftar opsi dirender lewat Portal ke <body>, sementara
// dialog modal hidup di top layer — akibatnya daftar opsi tergambar DI BAWAH
// dialog: tampak "tidak muncul" dan tidak bisa diklik meski panahnya berputar.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3111";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(`${BASE}/info`, { waitUntil: "networkidle" });

// Buka halaman detail pertama dari direktori.
const firstLink = page.locator('a[href^="/info/"]').first();
const href = await firstLink.getAttribute("href");
await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });

await page.getByRole("button", { name: /Laporkan informasi/i }).first().click();

const trigger = page.locator("#report-reason");
await trigger.waitFor({ state: "visible" });
const before = (await trigger.innerText()).trim();

await trigger.click();
await page.waitForTimeout(300);

const listbox = page.locator('[role="listbox"]');
const listVisible = await listbox.isVisible();
const optionCount = await page.locator('[role="option"]').count();

// Hit-test: titik tengah opsi harus benar-benar mengenai opsi itu, bukan
// elemen lain (gejala khas portal di bawah top layer).
const hitTest = await page.evaluate(() => {
  const option = document.querySelector('[role="option"]');
  if (!option) return { ok: false, reason: "tidak ada opsi" };
  const r = option.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { ok: Boolean(top && option.contains(top)), hitTag: top?.tagName ?? null };
});

await page.getByRole("option", { name: /Tautan sumber tidak tersedia/i }).click();
await page.waitForTimeout(300);
const after = (await trigger.innerText()).trim();

const problems = [];
if (!listVisible) problems.push("daftar opsi tidak terlihat");
if (optionCount === 0) problems.push("tidak ada opsi ter-render");
if (!hitTest.ok) problems.push(`opsi tertutup elemen lain (${hitTest.hitTag})`);
if (before === after) problems.push("memilih opsi tidak mengubah nilai");

await browser.close();

if (problems.length > 0) {
  console.error("GAGAL:", problems.join("; "));
  process.exit(1);
}

console.log(
  `LULUS: ${optionCount} opsi terlihat, hit-test OK, nilai "${before}" → "${after}"`,
);
