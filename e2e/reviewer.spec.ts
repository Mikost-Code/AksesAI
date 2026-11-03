import { test, expect } from "@playwright/test";

import {
  authenticate,
  createPendingProgram,
  createUser,
  deleteUser,
  type E2EUser,
} from "./helpers";

/**
 * E2E alur REVIEWER & MODERATOR: antrean review menampilkan item, panel review
 * dapat dibuka, dan pemisahan akses antar-role ditegakkan di UI.
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";

test.describe("Alur reviewer", () => {
  let contributor: E2EUser;
  let reviewer: E2EUser;
  let programId: string;

  test.beforeAll(async () => {
    contributor = await createUser("e2econtribr");
    reviewer = await createUser("e2ereviewer", ["reviewer"]);
    programId = await createPendingProgram(contributor.id, "review");
  });

  test.afterAll(async () => {
    if (contributor) await deleteUser(contributor.id);
    if (reviewer) await deleteUser(reviewer.id);
  });

  test("reviewer dapat membuka antrean review & panel item", async ({ context, page }) => {
    await authenticate(context, BASE, reviewer);

    // Halaman antrean memuat untuk reviewer.
    const queue = await page.goto("/review");
    expect(queue?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /antrean review/i })).toBeVisible();
    await expect(page.getByRole("navigation", { name: /filter klaim/i })).toBeVisible();

    // Antrean bisa berisi puluhan item lama (data uji sebelumnya); buka panel
    // review item uji ini langsung lewat URL agar tidak bergantung urutan halaman.
    const res = await page.goto(`/review/${programId}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /keputusan tinjauan/i })).toBeVisible();

    // Klaim item.
    await page.getByRole("button", { name: /ambil item ini/i }).click();
    await expect(page.getByRole("status")).toContainText(/diambil|30 menit/i, {
      timeout: 20_000,
    });
  });

  test("reviewer tidak dapat meninjau kontribusinya sendiri", async ({ context, page }) => {
    await authenticate(context, BASE, reviewer);
    // Program milik reviewer sendiri → panel TIDAK merender tombol keputusan,
    // melainkan pemberitahuan bahwa kontribusi sendiri tidak dapat ditinjau.
    const ownProgramId = await createPendingProgram(reviewer.id, "own");
    const res = await page.goto(`/review/${ownProgramId}`);
    expect(res?.status()).toBe(200);

    await expect(page.getByText(/ini kontribusi anda sendiri/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /verifikasi & terbitkan/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /tolak kontribusi/i })).toHaveCount(0);
  });

  test("member biasa tidak dapat membuka /review (redirect)", async ({ context, page }) => {
    await authenticate(context, BASE, contributor);
    await page.goto("/review");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("reviewer tidak dapat membuka area moderasi", async ({ context, page }) => {
    await authenticate(context, BASE, reviewer);
    await page.goto("/moderation/reports");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("Alur moderator", () => {
  let moderator: E2EUser;

  test.beforeAll(async () => {
    moderator = await createUser("e2emod", ["moderator"]);
  });

  test.afterAll(async () => {
    if (moderator) await deleteUser(moderator.id);
  });

  test("moderator dapat membuka laporan komunitas", async ({ context, page }) => {
    await authenticate(context, BASE, moderator);
    const res = await page.goto("/moderation/reports");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /laporan komunitas/i })).toBeVisible();
  });
});
