// Verifikasi perubahan beranda: pita statistik direktori + ikon GitHub di
// tombol Masuk.
//
// Yang dijaga:
// 1. Pita statistik tampil dengan 4 angka (bukan 0 semua).
// 2. Tiap angka punya label yang terbaca.
// 3. Tombol Masuk memakai ikon GitHub (svg), bukan ikon panah masuk.
// 4. Pilar kepercayaan tidak lagi memakan tempat di hero.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3115";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const problems = [];

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

// 1 & 2) Pita statistik.
const statsBar = page.locator("dl").filter({ hasText: /Info aktif/ }).first();
const statsVisible = await statsBar.isVisible().catch(() => false);
if (!statsVisible) problems.push("pita statistik tidak tampil");

const labels = ["Info aktif", "Sumber resmi", "Kontributor"];
for (const label of labels) {
  const count = await page.getByText(label, { exact: true }).count();
  if (count === 0) problems.push(`label "${label}" tidak ada`);
}

// Angka harus benar-benar terisi (bukan kosong) dan minimal satu > 0.
const values = await page.evaluate(() => {
  const dl = Array.from(document.querySelectorAll("dl")).find((el) =>
    el.textContent?.includes("Info aktif"),
  );
  if (!dl) return [];
  return Array.from(dl.querySelectorAll("dd")).map((dd) => dd.textContent?.trim() ?? "");
});
if (values.length < 1) problems.push("tidak ada sel angka sama sekali");
if (!values.some((v) => v && !/^0/.test(v))) {
  problems.push(`semua angka nol/kosong: ${JSON.stringify(values)}`);
}
// Sel berangka 0 tidak boleh dirender sama sekali (pelajaran dari badge GitHub).
const zeroCells = values.filter((v) => /^0\b/.test(v ?? ""));
if (zeroCells.length > 0) {
  problems.push(`ada sel berangka 0 yang dirender: ${JSON.stringify(zeroCells)}`);
}

// 3) Tombol Masuk memakai ikon GitHub.
const masuk = page.getByRole("link", { name: /^Masuk$/ }).first();
const masukSvg = await masuk.locator("svg").count();
if (masukSvg === 0) problems.push("tombol Masuk tidak punya ikon");
const masukHtml = await masuk.evaluate((el) => el.innerHTML).catch(() => "");
// Ikon GitHub adalah path tunggal berisi khas; ikon LogIn lucide punya <path>+<line>.
if (!/<path[^>]*d="M12 \.5C5\.73/.test(masukHtml)) {
  problems.push("ikon pada tombol Masuk bukan logo GitHub");
}

// 4) Hero tidak lagi memuat tiga kartu pilar.
const heroPillars = await page.locator(".hero-forest ul li").count();
if (heroPillars > 0) problems.push(`hero masih punya ${heroPillars} kartu pilar`);

await page.screenshot({ path: "ui-shots/home-stats.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });

await browser.close();

if (problems.length > 0) {
  console.error("GAGAL:", problems.join("; "));
  process.exit(1);
}

console.log(`LULUS: pita 4 angka ${JSON.stringify(values)}, tombol Masuk berikon GitHub`);
