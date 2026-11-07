// Verifikasi audit katalog 6 Nov 2026: kategori "Hosting Gratis" sudah tidak ada,
// entri baru muncul, dan klaim yang salah sudah dikoreksi.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3118";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const problems = [];

// ── 1. Direktori: kategori Hosting Gratis harus hilang ─────────────────────
await page.goto(`${BASE}/info`, { waitUntil: "networkidle" });

const hosting = await page.getByText("Hosting Gratis", { exact: true }).count();
if (hosting > 0) problems.push(`"Hosting Gratis" masih muncul ${hosting}x di /info`);

// Kategori lain harus tetap ada.
for (const label of ["Free API & Token", "Free Tier Model", "Tool AI Gratis"]) {
  if ((await page.getByText(label, { exact: true }).count()) === 0) {
    problems.push(`kategori "${label}" hilang (tidak seharusnya)`);
  }
}

// ── 2. Entri baru harus muncul di direktori ────────────────────────────────
for (const name of ["Z.AI", "Cohere", "SambaNova", "SiliconFlow"]) {
  const n = await page.getByText(name, { exact: false }).count();
  if (n === 0) problems.push(`entri baru "${name}" tidak ada di daftar`);
}

await page.screenshot({ path: "ui-shots/audit-direktori.png", fullPage: false });

// ── 3. Halaman detail: klaim yang dikoreksi ────────────────────────────────
const detailChecks = [
  ["/info/groq-api-free-tier", ["gpt-oss-120b", "200K"], ["14.400 request/hari untuk model kecil"]],
  ["/info/cerebras-free-trial", ["WAJIB kartu kredit", "TIDAK berjalan tanpa kartu"], []],
  ["/info/mistral-experiment-free-tier", ["tidak ada akses API", "pay-as-you-go"], ["tier Experiment gratis ~2.000"]],
  ["/info/zcode-glm-free-trial", ["5 juta token per hari", "300 juta token", "500 juta token", "Weekend Build"], ["bukan alokasi harian/mingguan tetap"]],
  ["/info/opencode-deepseek-free", ["200.000 token", "403"], []],
  ["/info/zai-glm-flash-gratis", ["GLM-4.7-Flash", "$0"], []],
  ["/info/cohere-trial-key-gratis", ["20 request/menit", "1.000"], []],
  ["/info/sambanova-free-tier", ["20 request/hari"], []],
  ["/info/siliconflow-free-models", ["Verifikasi identitas"], []],
];

for (const [path, mustHave, mustNotHave] of detailChecks) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  if (res?.status() !== 200) {
    problems.push(`${path} -> HTTP ${res?.status()}`);
    continue;
  }
  const body = await page.locator("body").innerText();
  // Normalkan spasi: teks ber-markdown dirender dengan penanda tebal di
  // antaranya sehingga pencocokan frasa panjang bisa gagal hanya karena
  // perbedaan spasi, bukan karena isinya berbeda.
  const flat = body.replace(/\s+/g, " ");
  for (const text of mustHave) {
    if (!flat.includes(text.replace(/\s+/g, " "))) {
      problems.push(`${path}: tidak memuat "${text}"`);
    }
  }
  for (const text of mustNotHave) {
    if (flat.includes(text.replace(/\s+/g, " "))) {
      problems.push(`${path}: MASIH memuat klaim lama "${text}"`);
    }
  }
}

// ── 4. Setiap entri di direktori harus punya sumber resmi ──────────────────
// Telusuri SEMUA halaman hasil, bukan hanya halaman pertama: PAGE_SIZE adalah 12,
// jadi katalog 21 entri butuh dua halaman. Tanpa ini, entri di halaman 2 tidak
// pernah diperiksa dan laporan "lulus" akan menyesatkan.
const allHrefs = [];
for (let pageNum = 1; pageNum <= 5; pageNum += 1) {
  await page.goto(`${BASE}/info?halaman=${pageNum}`, { waitUntil: "networkidle" });
  const found = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href^="/info/"]'))
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h !== "/info"),
  );
  const before = allHrefs.length;
  for (const href of found) if (!allHrefs.includes(href)) allHrefs.push(href);
  if (allHrefs.length === before) break; // tidak ada entri baru → halaman terakhir
}

if (allHrefs.length === 0) problems.push("tidak ada tautan entri di /info");
if (allHrefs.length < 20) {
  problems.push(`hanya menemukan ${allHrefs.length} entri — paginasi mungkin tidak terbaca`);
}

let checked = 0;
for (const href of allHrefs) {
  const res = await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  if (res?.status() !== 200) {
    problems.push(`${href} -> HTTP ${res?.status()}`);
    continue;
  }
  // Tautan sumber eksternal harus ada minimal satu.
  const sources = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href^="http"]')).filter((a) => {
      const h = a.getAttribute("href") ?? "";
      return !h.includes("aksesai") && !h.includes("vercel.app") && !h.includes("github.com/zann06/AksesAI");
    }).length,
  );
  if (sources === 0) problems.push(`${href}: tidak ada sumber eksternal`);
  checked += 1;
}

await browser.close();

if (problems.length > 0) {
  console.error("GAGAL:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(
  `LULUS: "Hosting Gratis" hilang, 4 entri baru tampil, klaim lama terkoreksi, ${checked} entri punya sumber eksternal`,
);
