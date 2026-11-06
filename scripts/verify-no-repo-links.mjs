// Verifikasi: jejak repo GitHub sudah hilang dari UI.
//
// Yang dijaga:
// 1. Tidak ada satu pun tautan ke github.com/zann06 di halaman mana pun.
// 2. Badge GitHub di navbar bukan elemen interaktif (tidak punya href).
// 3. Badge TIDAK menampilkan angka 0 palsu saat repo tidak dapat diakses.
// 4. Teks "sumber terbuka berlisensi MIT" + tautan repo tidak ada lagi.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3112";

const PAGES = ["/", "/info", "/panduan", "/tentang", "/kebijakan-privasi", "/login"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const problems = [];

for (const path of PAGES) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });

  const repoLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]"))
      .map((a) => a.getAttribute("href") ?? "")
      .filter((h) => /github\.com\/zann06/i.test(h)),
  );
  if (repoLinks.length > 0) {
    problems.push(`${path}: masih ada tautan repo (${repoLinks.length})`);
  }
}

// Badge di navbar.
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const header = page.locator("header");

const badgeAsLink = await header.locator('a[href*="github"]').count();
if (badgeAsLink > 0) problems.push("badge GitHub di header masih berupa <a>");

const badge = header.locator("div").filter({ hasText: /^GitHub/ }).first();
const badgeText = (await badge.innerText().catch(() => "")).trim();
const badgeTag = await badge.evaluate((el) => el.tagName.toLowerCase()).catch(() => null);

// Angka nol hanya boleh muncul bila memang ada data; di sini repo privat, jadi
// bagian statistik harus hilang sepenuhnya.
if (/\b0\b/.test(badgeText)) {
  problems.push(`badge menampilkan angka 0 palsu: "${badgeText}"`);
}
if (badgeTag && badgeTag !== "div") {
  problems.push(`badge bukan div melainkan <${badgeTag}>`);
}

// Teks klaim sumber terbuka + tautan repo di footer.
const footerText = (await page.locator("footer").innerText()).toLowerCase();
if (footerText.includes("berlisensi mit")) {
  problems.push("footer masih mengklaim 'berlisensi MIT'");
}

// Menu seluler (viewport kecil) tidak boleh punya tautan repo.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /menu navigasi/i }).click().catch(async () => {
  await page.locator("summary[aria-label='Buka menu navigasi']").click();
});
const mobileRepoLinks = await page.evaluate(() =>
  Array.from(document.querySelectorAll("a[href]"))
    .map((a) => a.getAttribute("href") ?? "")
    .filter((h) => /github\.com\/zann06/i.test(h)),
);
if (mobileRepoLinks.length > 0) problems.push("menu seluler masih menautkan repo");

await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.screenshot({ path: "ui-shots/navbar-no-repo-link.png", clip: { x: 700, y: 0, width: 580, height: 100 } });

await browser.close();

if (problems.length > 0) {
  console.error("GAGAL:", problems.join("; "));
  process.exit(1);
}

console.log(`LULUS: tidak ada tautan repo di ${PAGES.length} halaman, badge non-tautan tanpa angka 0`);
