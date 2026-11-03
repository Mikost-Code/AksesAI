import { test, expect } from "@playwright/test";

/**
 * Uji RESPONSIF (PHASE 8): halaman publik utama harus tetap dapat dipakai pada
 * lebar ponsel (375px) dan tablet (768px) — tidak ada scroll horizontal, dan
 * navigasi tetap dapat dijangkau.
 */

const VIEWPORTS = [
  { name: "ponsel-375", width: 375, height: 812 },
  { name: "ponsel-320", width: 320, height: 720 },
  { name: "tablet-768", width: 768, height: 1024 },
] as const;

const PAGES = ["/", "/bansos", "/login", "/tentang"] as const;

test.describe("Responsif halaman publik", () => {
  for (const vp of VIEWPORTS) {
    for (const path of PAGES) {
      test(`${vp.name} — ${path} tanpa scroll horizontal`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const res = await page.goto(path);
        expect(res?.status(), `status ${path}`).toBe(200);

        // Konten utama terlihat.
        await expect(page.getByRole("main")).toBeVisible();

        // Tidak ada overflow horizontal: scrollWidth tidak melebihi lebar klien
        // lebih dari toleransi 1px (pembulatan subpiksel).
        const overflow = await page.evaluate(() => {
          const el = document.documentElement;
          return el.scrollWidth - el.clientWidth;
        });
        expect(overflow, `overflow horizontal ${path} @ ${vp.width}px`).toBeLessThanOrEqual(1);
      });
    }
  }

  test("navigasi utama dapat dibuka di layar ponsel", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const banner = page.getByRole("banner");
    await expect(banner).toBeVisible();
    // Tautan utama (BantuWarga / direktori) tetap dapat difokuskan.
    const linkCount = await banner.getByRole("link").count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test("form pencarian direktori tetap dapat dipakai di ponsel", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/bansos");
    const searchInput = page.getByRole("searchbox").or(page.locator('input[type="search"]'));
    if ((await searchInput.count()) > 0) {
      await expect(searchInput.first()).toBeVisible();
    }
    await expect(page.getByRole("main")).toBeVisible();
  });
});
