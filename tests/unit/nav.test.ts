import { describe, expect, it } from "vitest";

import { resolveActiveHref } from "@/lib/nav";

describe("resolveActiveHref", () => {
  const DASHBOARD_NAV = [
    { href: "/dashboard", exact: true },
    { href: "/dashboard/kontribusi" },
    { href: "/dashboard/kontribusi/baru" },
    { href: "/dashboard/laporan" },
    { href: "/admin" },
    { href: "/admin/pengguna" },
    { href: "/admin/kategori" },
  ] as const;

  it("halaman anak memilih item paling spesifik, bukan induknya", () => {
    // Bug nyata: dulu /dashboard/kontribusi DAN /dashboard/kontribusi/baru
    // sama-sama aktif di halaman "Bagikan informasi".
    expect(
      resolveActiveHref("/dashboard/kontribusi/baru", DASHBOARD_NAV),
    ).toBe("/dashboard/kontribusi/baru");
    expect(resolveActiveHref("/admin/pengguna", DASHBOARD_NAV)).toBe(
      "/admin/pengguna",
    );
  });

  it("halaman induk tetap mengaktifkan item induk", () => {
    expect(resolveActiveHref("/dashboard/kontribusi", DASHBOARD_NAV)).toBe(
      "/dashboard/kontribusi",
    );
    expect(resolveActiveHref("/admin", DASHBOARD_NAV)).toBe("/admin");
  });

  it("exact mencegah item ringkasan menyala di sub-halaman", () => {
    expect(resolveActiveHref("/dashboard/kontribusi", DASHBOARD_NAV)).not.toBe(
      "/dashboard",
    );
    expect(resolveActiveHref("/dashboard", DASHBOARD_NAV)).toBe("/dashboard");
  });

  it("halaman detail ikut mengaktifkan item induknya saja", () => {
    expect(
      resolveActiveHref("/dashboard/kontribusi/abc-123", DASHBOARD_NAV),
    ).toBe("/dashboard/kontribusi");
  });

  it("prefix harus berada di batas segmen", () => {
    // /dashboard-xyz tidak boleh mengaktifkan /dashboard.
    expect(resolveActiveHref("/dashboard-xyz", DASHBOARD_NAV)).toBeUndefined();
  });

  it("tidak ada yang cocok → undefined", () => {
    expect(resolveActiveHref("/info", DASHBOARD_NAV)).toBeUndefined();
    expect(resolveActiveHref("/", [])).toBeUndefined();
  });

  it("nav publik tanpa nesting tetap bekerja", () => {
    const links = [
      { href: "/info" },
      { href: "/panduan" },
      { href: "/tentang" },
    ] as const;
    expect(resolveActiveHref("/info", links)).toBe("/info");
    expect(resolveActiveHref("/info/model-baru", links)).toBe("/info");
    expect(resolveActiveHref("/panduan", links)).toBe("/panduan");
  });
});

/**
 * Regresi untuk menu akun.
 *
 * Bug nyata: menu akun punya implementasi pencocokan sendiri (`isActivePath`)
 * yang menyalakan SEMUA item ber-prefix cocok. Saat pengguna membuka
 * /dashboard/kontribusi/baru, TIGA item menyala sekaligus — "Ringkasan",
 * "Kontribusi saya", dan "Bagikan informasi".
 *
 * Menu akun kini memakai `resolveActiveHref` dengan daftar item yang sama
 * persis seperti yang dirender (lihat `account-menu.tsx`).
 */
describe("menu akun — hanya satu item boleh aktif", () => {
  // Cerminan `utama` + `staf` + `stafPengaturan` di account-menu.tsx
  // untuk pengguna super admin (paling banyak item).
  const ACCOUNT_MENU = [
    { href: "/dashboard", exact: true },
    { href: "/dashboard/kontribusi" },
    { href: "/dashboard/kontribusi/baru", exact: true },
    { href: "/dashboard/laporan" },
    { href: "/dashboard/notifikasi" },
    { href: "/review" },
    { href: "/moderation/reports" },
    { href: "/admin", exact: true },
    { href: "/admin/program" },
    { href: "/admin/pengguna" },
    { href: "/admin/kategori" },
    { href: "/admin/audit" },
  ] as const;

  /**
   * Semua href yang lolos pencocokan prefix = perilaku lama yang salah.
   * Logika lama (`isActivePath`) TIDAK mengenal `exact`, jadi helper ini
   * sengaja ikut mengabaikannya agar benar-benar mereproduksi bug.
   */
  function allMatching(pathname: string) {
    return ACCOUNT_MENU.filter(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    ).map((item) => item.href);
  }

  const HALAMAN: ReadonlyArray<[string, string | undefined]> = [
    ["/dashboard", "/dashboard"],
    ["/dashboard/kontribusi", "/dashboard/kontribusi"],
    ["/dashboard/kontribusi/baru", "/dashboard/kontribusi/baru"],
    ["/dashboard/kontribusi/abc-123", "/dashboard/kontribusi"],
    ["/dashboard/laporan", "/dashboard/laporan"],
    ["/dashboard/notifikasi", "/dashboard/notifikasi"],
    ["/review", "/review"],
    ["/review/cek-ulang", "/review"],
    ["/moderation/reports", "/moderation/reports"],
    ["/admin", "/admin"],
    ["/admin/program", "/admin/program"],
    ["/admin/pengguna", "/admin/pengguna"],
    ["/admin/audit", "/admin/audit"],
    ["/info", undefined],
    ["/", undefined],
  ];

  it.each(HALAMAN)("%s mengaktifkan tepat satu item", (pathname, expected) => {
    expect(resolveActiveHref(pathname, ACCOUNT_MENU)).toBe(expected);
  });

  it("bug lama terbukti: /dashboard/kontribusi/baru dulu menyalakan 3 item", () => {
    // `allMatching` meniru logika `isActivePath` yang sudah dihapus.
    expect(allMatching("/dashboard/kontribusi/baru")).toEqual([
      "/dashboard",
      "/dashboard/kontribusi",
      "/dashboard/kontribusi/baru",
    ]);

    // Perilaku benar: hanya yang paling spesifik.
    expect(
      ACCOUNT_MENU.filter(
        (item) =>
          item.href ===
          resolveActiveHref("/dashboard/kontribusi/baru", ACCOUNT_MENU),
      ),
    ).toHaveLength(1);
  });

  it("halaman di luar menu tidak menyalakan apa pun", () => {
    for (const pathname of ["/info", "/panduan", "/tentang", "/login"]) {
      expect(resolveActiveHref(pathname, ACCOUNT_MENU)).toBeUndefined();
    }
  });

  it("prefix harus di batas segmen, bukan potongan string", () => {
    expect(resolveActiveHref("/dashboardx", ACCOUNT_MENU)).toBeUndefined();
    expect(resolveActiveHref("/adminx", ACCOUNT_MENU)).toBeUndefined();
    expect(resolveActiveHref("/reviewer", ACCOUNT_MENU)).toBeUndefined();
  });
});
