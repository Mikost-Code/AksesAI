// Pastikan dropdown DI LUAR dialog tetap memakai Portal dan berfungsi.
// Form kontribusi butuh login, jadi uji lewat halaman login (dropdown tidak
// ada) — sebagai gantinya uji filter admin & panel moderasi bila bisa diakses.
// Di sini kita cukup verifikasi tidak ada <select> bawaan tersisa di DOM publik.
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3111";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const pages = [
  "/info",
  "/info/zcode-glm-free-trial",
  "/panduan",
  "/tentang",
  "/login",
];

const results = [];
for (const path of pages) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const nativeSelects = await page.locator("select").count();
  const nativeDate = await page.locator('input[type="date"]').count();
  const nativeCheckbox = await page
    .locator('input[type="checkbox"]:not([aria-hidden="true"])')
    .count();
  results.push({ path, nativeSelects, nativeDate, nativeCheckbox });
}

console.table(results);
await browser.close();
