import { test, expect } from "@playwright/test";

/**
 * E2E alur PUBLIK (tanpa login): beranda, direktori, detail, halaman statis,
 * 404, dan metadata keamanan dasar.
 */

test.describe("Halaman publik", () => {
  test("beranda tampil dengan hero & navigasi", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("direktori /info dapat dimuat & menampilkan hasil atau empty state", async ({
    page,
  }) => {
    const res = await page.goto("/info");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Entah ada kartu info atau empty state — keduanya sah.
    const main = page.getByRole("main");
    await expect(main).toBeVisible();
  });

  test("pencarian direktori menerima query", async ({ page }) => {
    await page.goto("/info?q=groq");
    expect(page.url()).toContain("q=groq");
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("halaman statis utama dapat dimuat", async ({ page }) => {
    for (const path of ["/tentang", "/panduan", "/kebijakan-privasi"]) {
      const res = await page.goto(path);
      expect(res?.status(), `status ${path}`).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("halaman login dapat dimuat", async ({ page }) => {
    const res = await page.goto("/login");
    expect(res?.status()).toBe(200);
    // Tombol masuk via GitHub tersedia (SVG inline).
    await expect(page.getByRole("button", { name: /github/i })).toBeVisible();
  });

  test("slug info tak dikenal → 404", async ({ page }) => {
    const res = await page.goto("/info/tidak-ada-info-ini-xyz");
    expect(res?.status()).toBe(404);
  });

  test("kategori tak dikenal → 404", async ({ page }) => {
    const res = await page.goto("/kategori/tidak-ada-kategori-xyz");
    expect(res?.status()).toBe(404);
  });

  test("header keamanan terkirim pada respons HTML", async ({ page }) => {
    const res = await page.goto("/");
    const headers = res?.headers() ?? {};
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("skip link dapat memindahkan fokus ke konten utama", async ({ page }) => {
    await page.goto("/");
    // Tekan Tab — elemen pertama yang fokusable adalah skip link.
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.textContent ?? "");
    expect(focused.toLowerCase()).toMatch(/lewati|skip/);
  });
});

test.describe("Akses tanpa sesi", () => {
  test("rute terproteksi mengarahkan ke /login", async ({ page }) => {
    for (const path of ["/dashboard", "/review", "/admin"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
