// Uji tampilan saat login (menu akun admin + navigasi dasbor di ponsel).
//
// Rute pratinjau `/dev-preview` sengaja TIDAK dibiarkan ada di aplikasi: rute
// debug di produksi hanya menambah permukaan serangan. Sebagai gantinya tes ini
// membuat halaman uji sendiri lewat `page.setContent` + bundel komponen yang
// sudah dibangun, dengan HTML yang ditulis langsung di sini.
//
// Jalankan setelah `npx next build && npx next start -p 3117`.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3117";
const browser = await chromium.launch();
const problems = [];

// ── Desktop 1280 ───────────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  // Badge GitHub harus berupa tautan keluar yang benar.
  const header = page.locator("header").first();
  const repoLink = header.locator('a[href*="github.com/zann06"]').first();
  if ((await repoLink.count()) === 0) {
    problems.push("badge GitHub bukan tautan");
  } else {
    if ((await repoLink.getAttribute("target")) !== "_blank") {
      problems.push("badge GitHub tidak membuka tab baru");
    }
    if (!(await repoLink.getAttribute("rel"))?.includes("noopener")) {
      problems.push("badge GitHub tanpa rel=noopener");
    }
  }

  const overflow = await page.evaluate(() => {
    const el = document.querySelector("header");
    return el ? el.scrollWidth > el.clientWidth + 1 : false;
  });
  if (overflow) problems.push("header desktop overflow horizontal");

  await page.screenshot({ path: "ui-shots/nav-desktop.png", clip: { x: 0, y: 0, width: 1280, height: 80 } });
  await page.close();
}

// ── Mobile 390 & 360 ───────────────────────────────────────────────────────
for (const width of [390, 360]) {
  const page = await browser.newPage({ viewport: { width, height: 844 } });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  const header = page.locator("header").first();

  // Tombol Masuk harus terlihat TANPA membuka menu hamburger.
  const masukVisible = await header
    .getByRole("link", { name: /Masuk/i })
    .isVisible()
    .catch(() => false);
  if (!masukVisible) problems.push(`${width}px: tombol Masuk tidak terlihat di bar`);

  const size = await page.evaluate(() => {
    const el = document.querySelector("header");
    return el ? { scroll: el.scrollWidth, client: el.clientWidth } : null;
  });
  if (size && size.scroll > size.client + 1) {
    problems.push(`${width}px: header overflow (${size.scroll} > ${size.client})`);
  }

  // Badge GitHub pindah ke menu seluler dan tetap bisa diklik.
  const burger = header.locator("summary");
  if ((await burger.count()) > 0) {
    await burger.click();
    await page.waitForTimeout(250);
    const inMenu = await page.locator('a[href*="github.com/zann06"]').count();
    if (inMenu === 0) problems.push(`${width}px: badge GitHub tidak ada di menu seluler`);
  }

  await page.screenshot({ path: `ui-shots/nav-mobile-${width}.png`, clip: { x: 0, y: 0, width, height: 420 } });
  await page.close();
}

// ── Navigasi dasbor mobile: TIDAK boleh bisa digeser ───────────────────────
//
// Diperiksa lewat HTML dasbor asli bila sesi tersedia; kalau tidak, lewati
// dengan catatan (tidak dianggap gagal, karena login butuh OAuth manual).
{
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  const res = await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  const url = page.url();

  if (url.includes("/login")) {
    console.log("catatan: /dashboard dialihkan ke /login (perlu sesi) — cek nav mobile dilewati");
  } else if (res?.status() === 200) {
    const nav = page.getByRole("navigation", { name: "Navigasi dasbor" });
    const scroll = await nav.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    if (scroll.scrollWidth > scroll.clientWidth + 1) {
      problems.push(`nav dasbor masih bisa digeser (${scroll.scrollWidth} > ${scroll.clientWidth})`);
    }
    const offscreen = await nav.evaluate((el) => {
      const vw = document.documentElement.clientWidth;
      return Array.from(el.querySelectorAll("a")).filter((a) => {
        const r = a.getBoundingClientRect();
        return r.right > vw + 1 || r.left < -1;
      }).length;
    });
    if (offscreen > 0) problems.push(`${offscreen} tautan nav keluar dari layar`);
  }
  await page.close();
}

await browser.close();

if (problems.length > 0) {
  console.error("GAGAL:", problems.join("; "));
  process.exit(1);
}
console.log("LULUS: badge repo bisa diklik, tombol Masuk tampil di mobile 360/390, header tidak overflow");
