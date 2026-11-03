import { test, expect } from "@playwright/test";

import { authenticate, createUser, deleteUser, type E2EUser } from "./helpers";

/**
 * E2E alur ADMIN: halaman admin terbuka untuk admin, tertutup untuk role lain,
 * dan aksi nyata (beri role reviewer kepada pengguna lain) berhasil lewat UI.
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";

test.describe("Alur admin", () => {
  let admin: E2EUser;
  let target: E2EUser;
  let member: E2EUser;

  test.beforeAll(async () => {
    admin = await createUser("e2eadmin", ["admin"]);
    target = await createUser("e2etarget");
    member = await createUser("e2emember");
  });

  test.afterAll(async () => {
    for (const u of [admin, target, member]) {
      if (u) await deleteUser(u.id);
    }
  });

  test("admin membuka ringkasan, pengguna, dan kategori", async ({ context, page }) => {
    await authenticate(context, BASE, admin);

    let res = await page.goto("/admin");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /ringkasan admin/i })).toBeVisible();

    res = await page.goto("/admin/pengguna");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /pengguna/i })).toBeVisible();

    res = await page.goto("/admin/kategori");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /^kategori$/i })).toBeVisible();
  });

  test("admin memberi role reviewer ke pengguna lain lewat UI", async ({ context, page }) => {
    await authenticate(context, BASE, admin);
    await page.goto(`/admin/pengguna?q=${encodeURIComponent(target.username)}`);
    await expect(page.getByText(target.username, { exact: false }).first()).toBeVisible();

    // Klik tombol "Beri: Reviewer" pada kartu pengguna target.
    await page
      .getByRole("button", { name: /^reviewer$/i })
      .first()
      .click();
    await expect(page.getByRole("status")).toContainText(/role reviewer diberikan/i, {
      timeout: 15_000,
    });
  });

  test("member biasa tidak dapat membuka /admin (redirect)", async ({ context, page }) => {
    await authenticate(context, BASE, member);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
