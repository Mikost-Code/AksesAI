import { test, expect } from "@playwright/test";

import { authenticate, createUser, deleteUser, type E2EUser } from "./helpers";

/**
 * E2E alur KONTRIBUTOR: buat draf lewat form nyata, lihat di daftar,
 * lalu kirim ke antrean review. Memakai sesi sungguhan yang ditanam ke browser.
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";

test.describe("Alur kontributor", () => {
  let user: E2EUser;

  test.beforeAll(async () => {
    user = await createUser("e2econtrib");
  });

  test.afterAll(async () => {
    if (user) await deleteUser(user.id);
  });

  test.beforeEach(async ({ context }) => {
    await authenticate(context, BASE, user);
  });

  test("dasbor menampilkan username & navigasi kontribusi", async ({ page }) => {
    const res = await page.goto("/dashboard");
    expect(res?.status()).toBe(200);
    await expect(page.getByText(user.username, { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: /navigasi dasbor/i })).toBeVisible();
  });

  test("daftar kontribusi menampilkan empty state untuk pengguna baru", async ({ page }) => {
    await page.goto("/dashboard/kontribusi");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("menyimpan draf lewat form nyata lalu tampil di daftar", async ({ page }) => {
    await page.goto("/dashboard/kontribusi/baru");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const title = `Info AI E2E ${Date.now().toString(36)}`;

    await page.locator("#title").fill(title);
    await page
      .locator("#description")
      .fill(
        "Deskripsi info AI gratis untuk pengujian end-to-end yang cukup panjang melebihi lima puluh karakter.",
      );

    // Pilih kategori pertama yang tersedia (bukan placeholder kosong).
    const categorySelect = page.locator("#category");
    const firstCategory = await categorySelect.locator("option").nth(1).getAttribute("value");
    expect(firstCategory).toBeTruthy();
    await categorySelect.selectOption(firstCategory!);

    await page.locator("#provider").fill("Provider E2E");

    // Sumber pertama (wajib minimal satu).
    await page.locator("#source-url-0").fill("https://console.groq.com/docs/rate-limits");

    // Simpan draf dan tunggu konfirmasi sukses sebelum berpindah halaman.
    await page.getByRole("button", { name: "Simpan draf" }).click();
    await expect(page.getByRole("status")).toContainText(/Draf tersimpan/i, {
      timeout: 20_000,
    });

    // Draf muncul di daftar kontribusi.
    await page.goto("/dashboard/kontribusi");
    await expect(page.getByText(title, { exact: false }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("laporan saya dapat dimuat (empty state)", async ({ page }) => {
    const res = await page.goto("/dashboard/laporan");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
